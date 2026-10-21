import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { addDoc, collection, doc, limitToLast, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../firebase/firebase'

export function GameChat({ game, user }) {
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [connected, setConnected] = useState(false)
  const [sending, setSending] = useState(false)
  const end = useRef(null)
  const enabled = Boolean(db && user)
  useEffect(() => {
    if (!enabled) return
    const room = doc(db, 'sportsRooms', game.id)
    let active = true
    const fail = () => { if (active) { setConnected(false); setError('채팅 연결을 확인해 주세요. Firebase 권한 또는 네트워크 오류입니다.') } }
    const stopMessages = onSnapshot(query(collection(room, 'messages'), orderBy('createdAt'), limitToLast(100)), snapshot => {
      setMessages(snapshot.docs.map(item => ({ ...item.data(), id: item.id })))
      setConnected(true)
      setError('')
    }, fail)
    return () => { active = false; stopMessages() }
  }, [enabled, game.id, user])
  useEffect(() => { if (messages.length) end.current?.scrollIntoView({ block: 'nearest' }) }, [messages])
  async function send(event) {
    event.preventDefault()
    const body = text.trim()
    if (!enabled || !connected || sending || !body || body.length > 300 || auth.currentUser?.uid !== user.uid) return
    setSending(true)
    try {
      await addDoc(collection(db, 'sportsRooms', game.id, 'messages'), { uid: auth.currentUser.uid, name: (user.displayName || '야구 팬').slice(0, 40), text: body, createdAt: serverTimestamp() })
      setText(current => current === text ? '' : current)
    } catch { setError('메시지를 전송하지 못했습니다. 내용을 유지했으니 다시 시도해 주세요.') }
    finally { setSending(false) }
  }
  return <aside className="sports-chat"><div className="sports-chat-header"><h2>함께 응원하기</h2><span>{connected ? '실시간 연결' : '연결 대기'}</span></div><p className="sports-chat-guide">이 경기의 시청자와 실시간으로 대화하세요.</p><div className="sports-messages" role="log" aria-label="경기 채팅" aria-live="polite">{!messages.length && <div className="sports-chat-empty"><span>💬</span><p>{!db ? 'Firebase 연결이 필요합니다.' : !user ? '로그인하고 함께 응원해 보세요.' : '첫 번째 응원을 남겨 보세요!'}</p></div>}{messages.map(message => <div className={`sports-message ${message.uid === user?.uid ? 'mine' : ''}`} key={message.id}><strong>{message.name}</strong><p>{message.text}</p></div>)}<div ref={end} /></div>{error && <p className="sports-chat-error" role="alert">{error}</p>}{!user && <Link className="sports-login" to="/login">로그인하고 채팅 참여하기 →</Link>}<form onSubmit={send} className="sports-chat-form"><label htmlFor="sports-message">응원 메시지 <span>{text.length}/300</span></label><div><input id="sports-message" value={text} onChange={event => setText(event.target.value)} maxLength={300} disabled={!enabled || !connected} placeholder="서로 존중하는 응원을 남겨주세요" /><button disabled={!enabled || !connected || sending || !text.trim()} type="submit">{sending ? '전송 중' : '전송'}</button></div></form></aside>
}
