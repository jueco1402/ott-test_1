export const REFRESH_MS = 5 * 60 * 1000
const cache = new Map()
const pending = new Map()
export const errorMessages = {
  missing_key: 'YouTube API 키가 설정되지 않았습니다. 서버의 YOUTUBE_API_KEY를 설정해 주세요.',
  permission_denied: 'YouTube 조회 권한이 없습니다. API 활성화와 키 제한 설정을 확인해 주세요.',
  quota_exceeded: 'YouTube API 할당량을 초과했습니다. 할당량 복구 후 다시 조회해 주세요.',
  network_error: 'YouTube 서버에 연결하지 못했습니다. 네트워크를 확인해 주세요.',
  channel_unavailable: 'WBSC 채널을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.',
  upstream_error: 'YouTube 응답 오류입니다. 잠시 후 다시 조회해 주세요.',
}
export async function loadFeed(scope) {
  const saved = cache.get(scope)
  if (saved && Date.now() < Date.parse(saved.expiresAt)) return saved
  if (pending.has(scope)) return pending.get(scope)
  const work = (async () => {
    let response
    try { response = await fetch(`/api/baseball-live?scope=${scope}`, { signal: AbortSignal.timeout(100000) }) }
    catch { throw new Error('network_error') }
    let data
    try { data = await response.json() } catch { throw new Error('upstream_error') }
    if (!response.ok) throw new Error(data.error || 'upstream_error')
    if (!Array.isArray(data.items)) throw new Error('upstream_error')
    cache.set(scope, data)
    return data
  })().finally(() => pending.delete(scope))
  pending.set(scope, work)
  return work
}
