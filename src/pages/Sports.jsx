import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase/firebase'
import { GameChat } from '../sports/GameChat'
import { LivePlayer } from '../sports/LivePlayer'
import { errorMessages, loadFeed, REFRESH_MS } from '../sports/live-feed'
import './Sports.css'

export function Sports() {
  const [scope, setScope] = useState('all')
  const [feed, setFeed] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [user, setUser] = useState(null)
  const [retry, setRetry] = useState(0)
  useEffect(() => auth ? onAuthStateChanged(auth, setUser) : undefined, [])
  useEffect(() => {
    let active = true
    async function update() {
      await Promise.resolve()
      if (!active) return
      setLoading(true)
      try {
        const data = await loadFeed(scope)
        if (active) { setFeed(data); setError('') }
      } catch (failure) { if (active) { setFeed(null); setError(failure.message) } }
      finally { if (active) setLoading(false) }
    }
    update()
    const timer = setInterval(update, REFRESH_MS)
    return () => { active = false; clearInterval(timer) }
  }, [scope, retry])
  const visibleFeed = feed?.scope === scope ? feed : null
  const items = visibleFeed?.items || []
  const video = selected ? items.find(item => item.id === selected.id) || selected : items[0]
  function changeScope(value) { setScope(value); setSelected(null); setFeed(null); setError(''); setLoading(true) }
  return <main className="sports-page">
    <div className="sports-heading"><div><span className="sports-eyebrow">PLAY TOGETHER</span><h1>스포츠</h1><p>실제 야구 라이브를 찾고, 함께 응원하세요.</p></div><span className="sports-category">⚾ 야구 LIVE</span></div>
    <div className="sports-controls"><div role="group" aria-label="방송 채널 필터"><button aria-pressed={scope === 'all'} onClick={() => changeScope('all')}>전체 채널</button><button aria-pressed={scope === 'wbsc'} onClick={() => changeScope('wbsc')}>WBSC 공식 야구</button></div><button disabled={loading} onClick={() => setRetry(value => value + 1)}>다시 조회</button></div>
    <p className="sports-source">출처: YouTube Data API v3 · 공개·임베드 허용·방송 시작/종료 확인 · 5분 캐시 / 자동 갱신{visibleFeed && ` · 확인 ${new Date(visibleFeed.fetchedAt).toLocaleTimeString('ko-KR')}`}</p>
    {loading && <p className="sports-notice" role="status">실제 야구 라이브를 조회하고 있습니다…</p>}
    {error && <p className="sports-notice" role="alert">{errorMessages[error] || '라이브 정보를 불러오지 못했습니다.'}</p>}
    {!loading && !error && !items.length && <p className="sports-notice" role="status">현재 조건에 맞는 공개 야구 경기 라이브가 없습니다. 예시 방송으로 채우지 않습니다.</p>}
    {visibleFeed?.truncated && <p className="sports-notice">검색 제공처의 조회 범위 제한에 도달했습니다. 목록은 확인한 검색 결과이며 YouTube 전체 방송을 보장하지 않습니다.</p>}
    {video && <div className="sports-layout"><LivePlayer key={video.id} video={video} /><GameChat key={`${video.id}:${user?.uid || 'guest'}`} game={video} user={user} /></div>}
    <VideoList title="인기 TOP 5" items={items.slice(0, 5)} selected={video?.id} onSelect={setSelected} ranked />
    <VideoList title="전체 라이브 목록" items={items} selected={video?.id} onSelect={setSelected} />
    <p className="sports-source">동시 시청자 수 내림차순이며 비공개 수치는 ‘비공개’로 표시합니다. 검색 결과는 제목·스포츠 분류로 선별되며 실제 경기 여부·중계권을 완전히 보증하지 않습니다. 게임·시뮬레이션·하이라이트·해설·분석 등 명확한 비경기 영상은 제외합니다.</p>
  </main>
}

function VideoList({ title, items, selected, onSelect, ranked }) {
  return <section className="sports-games" aria-label={title}><div className="sports-section-title"><h2>{title} <span>{items.length}</span></h2><p>실제 조회 결과</p></div><div className="sports-grid">{items.map((item, index) => <article className={`sports-card ${item.id === selected ? 'selected' : ''}`} key={item.id}><button className="sports-select" onClick={() => onSelect(item)} aria-pressed={item.id === selected}><img src={item.thumbnail} alt="" loading="lazy" /><span className="sports-card-status">{ranked ? `${index + 1}위 · ` : ''}● LIVE</span><strong>{item.title}</strong><span className="sports-venue">{item.channelTitle}</span><span className="sports-card-action">{item.viewers == null ? '시청자 수 비공개' : `${item.viewers.toLocaleString()}명 시청 중`} · {item.id === selected ? '선택한 방송' : '시청하기 →'}</span></button><a className="sports-original" href={item.watchUrl} target="_blank" rel="noopener noreferrer">원본 영상 ↗</a></article>)}</div></section>
}
