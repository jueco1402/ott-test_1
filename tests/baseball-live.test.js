import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CACHE_MS, createHandler, createLiveService, rankVideos, toLiveVideo } from '../server/baseball-live.js'

const now = Date.parse('2026-10-21T08:00:00Z')
const fixture = (id = 'abcdefghijk', change = {}) => ({ id,
  snippet: { title: 'LIVE Baseball | Korea vs Japan', channelId: 'official', channelTitle: 'WBSC', categoryId: '17', liveBroadcastContent: 'live' },
  status: { privacyStatus: 'public', embeddable: true },
  liveStreamingDetails: { actualStartTime: '2026-10-21T07:00:00Z', concurrentViewers: '42' }, ...change })
const reply = (body, status = 200) => ({ ok: status === 200, status, json: async () => body })
const normalize = item => toLiveVideo(item, { now, wbscId: 'official' })

test('only started public embeddable live sports matches qualify; unknown viewers are null', () => {
  assert.equal(normalize(fixture()).viewers, 42)
  assert.equal(normalize(fixture('abcdefghijk', { liveStreamingDetails: { actualStartTime: '2026-10-21T07:00:00Z' } })).viewers, null)
  for (const change of [
    { status: { privacyStatus: 'private', embeddable: true } },
    { status: { privacyStatus: 'unlisted', embeddable: true } },
    { status: { privacyStatus: 'public', embeddable: false } },
    { liveStreamingDetails: { actualStartTime: '2026-10-21T09:00:00Z' } },
    { liveStreamingDetails: {} },
    { liveStreamingDetails: { actualStartTime: '2026-10-21T07:00:00Z', actualEndTime: '2026-10-21T07:59:00Z' } },
    { snippet: { ...fixture().snippet, liveBroadcastContent: 'upcoming' } },
    { snippet: { ...fixture().snippet, categoryId: '20' } },
  ]) assert.equal(normalize(fixture('abcdefghijk', change)), null)
})
test('excludes clear games, simulations, highlights, commentary, analysis and softball', () => {
  for (const term of ['MLB The Show', 'gameplay', 'simulation', '하이라이트', '입중계', '해설', '분석', 'watch along', 'reaction', 'softball', 'cricket']) {
    assert.equal(normalize(fixture('abcdefghijk', { snippet: { ...fixture().snippet, title: `Baseball Korea vs Japan ${term}` } })), null, term)
  }
})
test('sorts by actual viewer count with unknown below zero without fabricating counts', () => {
  const ranked = rankVideos([{ id: 'unknown', viewers: null }, { id: 'zero', viewers: 0 }, { id: 'high', viewers: 99 }])
  assert.deepEqual(ranked.map(item => item.id), ['high', 'zero', 'unknown'])
  assert.equal(ranked[2].viewers, null)
})
test('search parameters, pagination, deduplication, details verification and five-minute shared cache', async () => {
  let time = now
  const calls = []
  const service = createLiveService({ now: () => time, getKey: () => 'test-only-not-a-real-key', fetcher: async input => {
    const url = new URL(input); calls.push(url)
    if (url.pathname.endsWith('/search')) {
      for (const [key, value] of Object.entries({ type: 'video', eventType: 'live', videoEmbeddable: 'true', videoCategoryId: '17' })) assert.equal(url.searchParams.get(key), value)
      assert.ok(['야구', 'baseball'].includes(url.searchParams.get('q')))
      return reply({ items: [{ id: { videoId: 'abcdefghijk' } }], ...(url.searchParams.has('pageToken') ? {} : { nextPageToken: 'page2' }) })
    }
    assert.equal(url.searchParams.get('part'), 'snippet,status,liveStreamingDetails')
    return reply({ items: [fixture()] })
  } })
  const [first, simultaneous] = await Promise.all([service.list(), service.list()])
  assert.equal(first, simultaneous)
  assert.equal(first.items.length, 1)
  assert.equal(first.top.length, 1)
  assert.equal(calls.length, 5)
  time += CACHE_MS - 1; await service.list(); assert.equal(calls.length, 5)
  time += 1; await service.list(); assert.equal(calls.length, 10)
})
test('WBSC filter resolves handle to channel ID and rejects other channels', async () => {
  const service = createLiveService({ now: () => now, getKey: () => 'test-only', fetcher: async input => {
    const url = new URL(input)
    if (url.pathname.endsWith('/channels')) { assert.equal(url.searchParams.get('forHandle'), 'WBSC'); return reply({ items: [{ id: 'official' }] }) }
    if (url.pathname.endsWith('/search')) { assert.equal(url.searchParams.get('channelId'), 'official'); return reply({ items: [{ id: { videoId: 'abcdefghijk' } }] }) }
    return reply({ items: [fixture(), fixture('otherroom12', { snippet: { ...fixture().snippet, channelId: 'imposter' } })] })
  } })
  const result = await service.list('wbsc')
  assert.equal(result.items.length, 1)
  assert.equal(result.items[0].officialWbsc, true)
})
test('empty discovery makes no videos request and no fake items', async () => {
  const service = createLiveService({ getKey: () => 'test-only', fetcher: async input => { assert.ok(String(input).includes('/search?')); return reply({ items: [] }) } })
  assert.deepEqual((await service.list()).items, [])
})
test('bounded pagination explicitly signals truncated results', async () => {
  const service = createLiveService({ getKey: () => 'test-only', maxPages: 1, fetcher: async () => reply({ items: [], nextPageToken: 'more' }) })
  assert.equal((await service.list()).truncated, true)
})
test('distinct missing key, quota, permission and network failures without credential leakage', async () => {
  await assert.rejects(createLiveService({ getKey: () => undefined }).list(), { code: 'missing_key' })
  for (const [reason, code] of [['quotaExceeded', 'quota_exceeded'], ['dailyLimitExceeded', 'quota_exceeded'], ['keyInvalid', 'permission_denied'], ['forbidden', 'permission_denied']]) {
    const service = createLiveService({ getKey: () => 'never-return-this-key', fetcher: async () => reply({ error: { message: 'never-return-this-key', errors: [{ reason }] } }, 403) })
    await assert.rejects(service.list(), error => error.code === code && !error.message.includes('never-return'))
  }
  await assert.rejects(createLiveService({ getKey: () => 'test-only', fetcher: async () => { throw Error('secret-url') } }).list(), { code: 'network_error' })
})
test('selected broadcast detects ended, unavailable, and invalid IDs', async () => {
  const service = createLiveService({ getKey: () => 'test-only', fetcher: async () => reply({ items: [fixture('abcdefghijk', { liveStreamingDetails: { actualEndTime: '2026-10-21T08:00:00Z' } })] }) })
  assert.equal((await service.check('abcdefghijk')).state, 'ended')
  await assert.rejects(service.check('../bad'), { code: 'invalid_request' })
  const empty = createLiveService({ getKey: () => 'test-only', fetcher: async () => reply({ items: [] }) })
  assert.equal((await empty.check('abcdefghijk')).state, 'unavailable')
})
test('HTTP handler preserves status, rejects mutations and exposes sanitized errors only', async () => {
  let status, body
  const res = { setHeader() {}, status(value) { status = value; return this }, json(value) { body = value } }
  const handler = createHandler(createLiveService({ getKey: () => undefined }))
  await handler({ method: 'GET', url: '/api/baseball-live' }, res)
  assert.equal(status, 503); assert.deepEqual(body, { error: 'missing_key' })
  await handler({ method: 'POST', url: '/api/baseball-live' }, res)
  assert.equal(status, 405)
})
