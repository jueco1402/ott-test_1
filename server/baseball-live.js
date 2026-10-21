import process from 'node:process'

export const CACHE_MS = 5 * 60 * 1000
export class LiveError extends Error {
  constructor(code, status = 502) { super(code); this.code = code; this.status = status }
}
const EXCLUDED = /highlight|highlights|하이라이트|다시\s?보기|replay|simulation|simulator|시뮬|게임|gameplay|video\s?game|\be[- ]?baseball\b|mlb\s?the\s?show|프로야구\s?스피리츠|baseball\s?9|watch\s?along|watch\s?party|reaction|commentary|analysis|해설|분석|입중계|문자\s?중계|토크|talk\s?show|podcast|프리뷰|preview|softball|소프트볼|cricket|크리켓/i
const BASEBALL = /baseball|야구|\bkbo\b|\bmlb\b|\bnpb\b|\bwbsc\b|premier\s?12/i
const MATCH = /\bvs?\.?\s|\bat\b|\bgame\b|경기|대결|중계|championship|world\s?cup|세계.*선수권|\bmatch\b/i

export function toLiveVideo(item, { wbscId, now = Date.now() } = {}) {
  const s = item.snippet || {}, live = item.liveStreamingDetails || {}, status = item.status || {}
  const title = s.title || ''
  const start = Date.parse(live.actualStartTime)
  if (!/^[\w-]{11}$/.test(item.id || '') || status.privacyStatus !== 'public' || !status.embeddable ||
      s.liveBroadcastContent !== 'live' || !Number.isFinite(start) || start > now || live.actualEndTime ||
      s.categoryId !== '17' || EXCLUDED.test(title) || !BASEBALL.test(`${title} ${s.channelTitle || ''}`) || !MATCH.test(title)) return null
  const count = live.concurrentViewers
  const viewers = typeof count === 'string' && /^\d+$/.test(count) && Number.isSafeInteger(Number(count)) ? Number(count) : null
  return { id: item.id, title, channelId: s.channelId, channelTitle: s.channelTitle,
    officialWbsc: Boolean(wbscId && s.channelId === wbscId), viewers,
    thumbnail: `https://i.ytimg.com/vi/${item.id}/mqdefault.jpg`, startedAt: live.actualStartTime,
    watchUrl: `https://www.youtube.com/watch?v=${item.id}` }
}
export function rankVideos(items) {
  return [...items].sort((a, b) => (b.viewers ?? -1) - (a.viewers ?? -1) || a.id.localeCompare(b.id))
}
function errorFromResponse(status, body) {
  const reasons = body?.error?.errors?.map(item => item.reason) || []
  if (reasons.some(reason => /quota|dailyLimit|rateLimit/i.test(reason))) return new LiveError('quota_exceeded', 429)
  if (status === 401 || status === 403 || status === 400) return new LiveError('permission_denied', 403)
  return new LiveError('upstream_error')
}

export function createLiveService({ fetcher = fetch, now = Date.now, getKey = () => process.env.YOUTUBE_API_KEY || process.env.VITE_YOUTUBE_API_KEY, maxPages = 3 } = {}) {
  const cache = new Map(), pending = new Map()
  async function request(resource, params) {
    const key = getKey()
    if (!key) throw new LiveError('missing_key', 503)
    const url = new URL(`https://www.googleapis.com/youtube/v3/${resource}`)
    Object.entries({ ...params, key }).forEach(([name, value]) => { if (value !== undefined) url.searchParams.set(name, value) })
    let response, body
    try { response = await fetcher(url, { signal: AbortSignal.timeout(15000) }); body = await response.json() }
    catch { throw new LiveError('network_error') }
    if (!response.ok) throw errorFromResponse(response.status, body)
    return body
  }
  async function cached(key, ttl, run) {
    const old = cache.get(key)
    if (old && now() - old.time < ttl) return old.value
    if (pending.has(key)) return pending.get(key)
    const work = run().then(value => { cache.set(key, { time: now(), value }); return value })
      .finally(() => pending.delete(key))
    pending.set(key, work)
    return work
  }
  const wbsc = () => cached('wbsc-channel', 24 * 60 * 60 * 1000, async () => {
    const result = await request('channels', { part: 'id', forHandle: 'WBSC' })
    const id = result.items?.[0]?.id
    if (!id) throw new LiveError('channel_unavailable')
    return id
  })
  async function list(scope = 'all') {
    if (!['all', 'wbsc'].includes(scope)) throw new LiveError('invalid_request', 400)
    return cached(`list:${scope}`, CACHE_MS, async () => {
      const wbscId = scope === 'wbsc' ? await wbsc() : null
      const ids = new Set()
      let truncated = false
      await Promise.all(['야구', 'baseball'].map(async term => {
        let pageToken
        for (let page = 0; page < maxPages; page++) {
          const data = await request('search', { part: 'snippet', q: term, type: 'video', eventType: 'live',
            videoEmbeddable: 'true', videoSyndicated: 'true', videoCategoryId: '17', maxResults: '50',
            order: 'viewCount', channelId: wbscId || undefined, pageToken })
          for (const item of data.items || []) if (/^[\w-]{11}$/.test(item.id?.videoId || '')) ids.add(item.id.videoId)
          pageToken = data.nextPageToken
          if (!pageToken) break
          if (page === maxPages - 1) truncated = true
        }
      }))
      const all = [...ids], videos = []
      const batches = Array.from({ length: Math.ceil(all.length / 50) }, (_, index) => all.slice(index * 50, index * 50 + 50))
      await Promise.all(batches.map(async batch => {
        const data = await request('videos', { part: 'snippet,status,liveStreamingDetails', id: batch.join(',') })
        for (const item of data.items || []) {
          const video = toLiveVideo(item, { wbscId, now: now() })
          if (video && (!wbscId || video.channelId === wbscId)) videos.push(video)
        }
      }))
      const items = rankVideos(videos)
      return { items, top: items.slice(0, 5), fetchedAt: new Date(now()).toISOString(), expiresAt: new Date(now() + CACHE_MS).toISOString(), truncated, scope }
    })
  }
  async function check(id) {
    if (!/^[\w-]{11}$/.test(id)) throw new LiveError('invalid_request', 400)
    return cached(`video:${id}`, 30000, async () => {
      const data = await request('videos', { part: 'snippet,status,liveStreamingDetails', id })
      const item = data.items?.[0]
      const ended = Boolean(item?.liveStreamingDetails?.actualEndTime)
      const video = item ? toLiveVideo(item, { now: now() }) : null
      return { state: ended ? 'ended' : video ? 'live' : 'unavailable', video, checkedAt: new Date(now()).toISOString() }
    })
  }
  return { list, check }
}

export function createHandler(service = createLiveService()) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store')
    if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'method_not_allowed' }) }
    try {
      const url = new URL(req.url, 'http://localhost')
      const id = url.searchParams.get('videoId')
      const data = id !== null ? await service.check(id) : await service.list(url.searchParams.get('scope') || 'all')
      res.setHeader('Cache-Control', id !== null ? 'public, max-age=0, s-maxage=30' : 'public, max-age=0, s-maxage=300')
      return res.status(200).json(data)
    } catch (error) {
      // Never return upstream messages, request URLs or credentials.
      return res.status(error instanceof LiveError ? error.status : 500).json({ error: error instanceof LiveError ? error.code : 'internal_error' })
    }
  }
}
