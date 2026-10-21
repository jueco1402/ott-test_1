import { test, expect } from '@playwright/test'
const items = [
  { id: 'abcdefghijk', title: '테스트 야구 Korea vs Japan', channelTitle: '테스트 채널', viewers: 42 },
  { id: 'otherroom12', title: '테스트 Baseball USA vs Mexico', channelTitle: 'WBSC 테스트', viewers: null },
].map(item => ({ ...item, thumbnail: `https://i.ytimg.com/vi/${item.id}/mqdefault.jpg`, watchUrl: `https://www.youtube.com/watch?v=${item.id}` }))
const feed = (scope, videos = items) => ({ scope, items: videos, fetchedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 300000).toISOString() })
test.beforeEach(async ({ page }) => {
  // Third-party player intentionally blocked. This suite never claims real playback.
  await page.route('https://www.youtube.com/**', route => route.abort())
  await page.route('https://i.ytimg.com/**', route => route.abort())
})
test('mock: top and full lists, real count, filter, selection and five-minute client cache', async ({ page }) => {
  let calls = 0
  await page.route('**/api/baseball-live?*', route => {
    const url = new URL(route.request().url())
    if (url.searchParams.has('videoId')) return route.fulfill({ json: { state: 'live' } })
    calls++
    const scope = url.searchParams.get('scope')
    return route.fulfill({ json: feed(scope, scope === 'wbsc' ? [items[1]] : items) })
  })
  await page.goto('/sports')
  const full = page.getByRole('region', { name: '전체 라이브 목록' })
  await expect(full.locator('.sports-card')).toHaveCount(2)
  await expect(page.getByRole('region', { name: '인기 TOP 5' }).locator('.sports-card')).toHaveCount(2)
  await full.locator('.sports-select').nth(1).click()
  await expect(page.getByRole('region', { name: '선택한 방송' }).getByRole('heading')).toHaveText(items[1].title)
  await expect(page.getByRole('region', { name: '선택한 방송' })).toContainText('동시 시청자 수 비공개')
  await page.getByRole('button', { name: 'WBSC 공식 야구' }).click()
  await expect(full.locator('.sports-card')).toHaveCount(1)
  await page.getByRole('button', { name: '전체 채널', exact: true }).click()
  await expect(full.locator('.sports-card')).toHaveCount(2)
  expect(calls).toBe(2)
  await expect(page.getByRole('button', { name: '전송', exact: true })).toBeDisabled()
})
for (const code of ['missing_key', 'permission_denied', 'quota_exceeded', 'network_error']) {
  test(`mock: ${code} is distinct from empty result`, async ({ page }) => {
    await page.route('**/api/baseball-live?*', route => route.fulfill({ status: 503, json: { error: code } }))
    await page.goto('/sports')
    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page.locator('.sports-card')).toHaveCount(0)
  })
}
test('mock: loading and zero results do not fabricate five broadcasts', async ({ page }) => {
  let release
  const wait = new Promise(resolve => { release = resolve })
  await page.route('**/api/baseball-live?*', async route => { await wait; await route.fulfill({ json: feed('all', []) }) })
  await page.goto('/sports')
  await expect(page.getByRole('status')).toContainText('조회하고 있습니다')
  release()
  await expect(page.getByRole('status')).toContainText('공개 야구 경기 라이브가 없습니다')
  await expect(page.locator('.sports-card')).toHaveCount(0)
})
test('mock: ended broadcast removes player and informs user', async ({ page }) => {
  await page.route('**/api/baseball-live?*', route => route.fulfill({ json: new URL(route.request().url()).searchParams.has('videoId') ? { state: 'ended' } : feed('all') }))
  await page.goto('/sports')
  await expect(page.getByRole('heading', { name: '방송이 종료되었습니다' })).toBeVisible()
  await expect(page.locator('.sports-youtube')).toHaveCount(0)
})
test('mock: mobile direct access and refresh keep sports page without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.route('**/api/baseball-live?*', route => route.fulfill({ json: feed('all', []) }))
  await page.goto('/sports')
  await page.reload()
  await expect(page.getByRole('heading', { name: '스포츠', exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(await page.locator('header li a').allTextContents()).toContain('스포츠')
})

test('mock: feed automatically refreshes after five minutes', async ({ page }) => {
  await page.clock.install({ time: new Date() })
  let calls = 0
  await page.route('**/api/baseball-live?*', async route => {
    const now = await page.evaluate(() => Date.now())
    calls++
    await route.fulfill({ json: { ...feed('all', []), expiresAt: new Date(now + 300000).toISOString() } })
  })
  await page.goto('/sports')
  await expect(page.getByRole('status')).toContainText('공개 야구 경기 라이브가 없습니다')
  expect(calls).toBe(1)
  await page.clock.fastForward(300001)
  await expect.poll(() => calls).toBe(2)
})
