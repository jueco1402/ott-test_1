import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { addDoc, collection, deleteDoc, doc, limitToLast, onSnapshot, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db } from '../firebase/firebase'
import './Sports.css'

const examples = [
  ['LG 트윈스', '두산 베어스', '잠실'], ['삼성 라이온즈', 'KIA 타이거즈', '대구'],
  ['롯데 자이언츠', '한화 이글스', '사직'], ['SSG 랜더스', 'KT 위즈', '인천'],
  ['키움 히어로즈', 'NC 다이노스', '고척'], ['한국', '일본', '국제 경기'],
].map(([home, away, venue], i) => ({ id: `example-${i}`, home, away, venue, example: true }))

function streamUrl(value) {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.username || url.password) return null
    // Only approved YouTube embed URLs; arbitrary iframe origins are rejected.
    if (['www.youtube.com', 'www.youtube-nocookie.com'].includes(url.hostname) && /^\/embed\/[\w-]{11}$/.test(url.pathname)) return url.href
  } catch { /* Unconfigured stream. */ }
  return null
}

export function Sports() {
  const [games, setGames] = useState(examples)
  const [selected, setSelected] = useState(examples[0].id)
  const [user, setUser] = useState(null)
  const [feedError, setFeedError] = useState('')
  useEffect(() => {
    if (!auth || !db) return
    const stopAuth = onAuthStateChanged(auth, setUser)
    const stopGames = onSnapshot(collection(db, 'baseballGames'), snapshot => {
      const items = snapshot.docs.map(item => ({ ...item.data(), id: item.id, example: false }))
        .filter(item => typeof item.home === 'string' && typeof item.away === 'string')
      setGames(items.length ? items : examples)
      setFeedError('')
    }, () => setFeedError('경기 정보를 불러오지 못했습니다. 예시 목록 또는 마지막 수신 정보를 표시합니다.'))
    return () => { stopAuth(); stopGames() }
  }, [])
  const game = games.find(item => item.id === selected) || games[0]
  const video = streamUrl(game.streamUrl)
  return (
    <main className="sports-page">
      <div className="sports-heading"><div><span className="sports-eyebrow">PLAY TOGETHER</span><h1>스포츠</h1><p>야구의 모든 순간, 함께 응원하세요.</p></div><span className="sports-category">⚾ 야구</span></div>
      {(!db || game.example || feedError) && <p className="sports-notice" role="status">{feedError || (db ? '등록된 실제 경기가 없어 예시 경기 6개를 표시합니다.' : 'Firebase가 연결되지 않았습니다. 예시 경기 6개를 표시합니다.')} 예시 경기는 실제 실시간 중계가 아닙니다.</p>}
      <div className="sports-layout"><section className="sports-watch" aria-label="선택한 경기">
        <div className="sports-player">{video ? <iframe key={video} src={video} title={`${game.home} 대 ${game.away} 중계`} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /> : <div className="sports-player-empty"><span>⚾</span><h2>{game.home} <small>VS</small> {game.away}</h2><p>{game.example ? '예시 경기 · 중계 미연결' : '중계 영상 준비 중'}</p><p>정식 중계 영상이 연결되면 여기에서 시청할 수 있습니다.</p></div>}</div>
        <div className="sports-match-title"><div><span className="sports-eyebrow">{game.example ? 'DEMO' : game.status === 'live' ? '● LIVE' : 'BASEBALL'}</span><h2>{game.home} vs {game.away}</h2><p>{game.venue || '구장 정보 준비 중'}{game.inning ? ` · ${game.inning}` : ''}</p></div>{game.homeScore != null && game.awayScore != null && <strong>{game.homeScore} : {game.awayScore}</strong>}</div>
      </section><GameChat key={game.id} game={game} user={user} /></div>
      <nav className="sports-official" aria-label="공식 야구 중계 안내"><div><strong>공식 야구 시청 안내</strong><p>중계 편성·로그인·이용권 및 지역 제한은 제공처에서 확인해 주세요. 외부 중계 시청 중에도 이 페이지를 열어 채팅에 참여할 수 있습니다.</p></div><a href="https://www.tving.com/" target="_blank" rel="noopener noreferrer">TVING에서 중계 확인 ↗</a><a href="https://www.koreabaseball.com/" target="_blank" rel="noopener noreferrer">KBO 공식 일정 확인 ↗</a></nav><section className="sports-games"><div className="sports-section-title"><h2>야구 경기 목록 <span>{games.length}</span></h2><p>{game.example ? '예시 편성' : '실시간 경기 정보'}</p></div><div className="sports-grid">{games.map(item => <button key={item.id} className={`sports-card ${item.id === game.id ? 'selected' : ''}`} onClick={() => setSelected(item.id)} aria-pressed={item.id === game.id}><span className="sports-card-status">{item.example ? '예시 경기' : item.status === 'live' ? '● LIVE' : '중계 대기'}</span><span className="sports-teams">{item.home}<small>VS</small>{item.away}</span><span className="sports-venue">{item.venue || '구장 정보 준비 중'}</span><span className="sports-card-action">{item.id === game.id ? '선택한 경기' : '경기 보기 →'}</span></button>)}</div></section>
    </main>
  )
}

function GameChat({ game, user }) {
  const [messages, setMessages] = useState([])
  const [viewers, setViewers] = useState(0)
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [connected, setConnected] = useState(false)
  const [sending, setSending] = useState(false)
  const end = useRef(null)
  const enabled = Boolean(db && user && !game.example)
  useEffect(() => {
    if (!enabled) return
    const room = doc(db, 'baseballGames', game.id)
    const presence = doc(collection(room, 'viewers'))
    let active = true
    const fail = () => { if (active) { setConnected(false); setError('채팅 연결을 확인해 주세요. Firebase 권한 또는 네트워크 오류입니다.') } }
    const stopMessages = onSnapshot(query(collection(room, 'messages'), orderBy('createdAt'), limitToLast(100)), snapshot => {
      setMessages(snapshot.docs.map(item => ({ ...item.data(), id: item.id })))
      setConnected(true)
      setError('')
    }, fail)
    let presenceRows = []
    const count = () => { if (active) setViewers(new Set(presenceRows.filter(item => item.lastSeen?.toMillis() > Date.now() - 90000).map(item => item.uid)).size) }
    const stopViewers = onSnapshot(collection(room, 'viewers'), snapshot => { presenceRows = snapshot.docs.map(item => item.data()); count() }, fail)
    const heartbeat = () => { setDoc(presence, { uid: user.uid, lastSeen: serverTimestamp() }).catch(fail); count() }
    heartbeat()
    const timer = setInterval(heartbeat, 30000)
    return () => { active = false; clearInterval(timer); stopMessages(); stopViewers(); deleteDoc(presence).catch(() => {}) }
  }, [enabled, game.id, user])
  useEffect(() => { if (messages.length) end.current?.scrollIntoView({ block: 'nearest' }) }, [messages])
  async function send(event) {
    event.preventDefault()
    const body = text.trim()
    if (!enabled || !connected || sending || !body || body.length > 300) return
    setSending(true)
    try {
      await addDoc(collection(db, 'baseballGames', game.id, 'messages'), { uid: user.uid, name: (user.displayName || '야구 팬').slice(0, 40), text: body, createdAt: serverTimestamp() })
      setText(current => current === text ? '' : current)
    } catch { setError('메시지를 전송하지 못했습니다. 내용을 유지했으니 다시 시도해 주세요.') }
    finally { setSending(false) }
  }
  return <aside className="sports-chat"><div className="sports-chat-header"><h2>함께 응원하기</h2><span>{connected ? `${viewers}명 채팅 참여` : '연결 대기'}</span></div><p className="sports-chat-guide">이 경기의 시청자와 실시간으로 대화하세요.</p><div className="sports-messages" role="log" aria-label="경기 채팅" aria-live="polite">{!messages.length && <div className="sports-chat-empty"><span>💬</span><p>{game.example ? '실제 경기 연결 후 채팅이 열립니다.' : !db ? 'Firebase 연결이 필요합니다.' : !user ? '로그인하고 함께 응원해 보세요.' : '첫 번째 응원을 남겨 보세요!'}</p></div>}{messages.map(message => <div className={`sports-message ${message.uid === user?.uid ? 'mine' : ''}`} key={message.id}><strong>{message.name}</strong><p>{message.text}</p></div>)}<div ref={end} /></div>{error && <p className="sports-chat-error" role="alert">{error}</p>}{!user && <Link className="sports-login" to="/login">로그인하고 채팅 참여하기 →</Link>}<form onSubmit={send} className="sports-chat-form"><label htmlFor="sports-message">응원 메시지 <span>{text.length}/300</span></label><div><input id="sports-message" value={text} onChange={event => setText(event.target.value)} maxLength={300} disabled={!enabled || !connected} placeholder="서로 존중하는 응원을 남겨주세요" /><button disabled={!enabled || !connected || sending || !text.trim()} type="submit">{sending ? '전송 중' : '전송'}</button></div></form></aside>
}
