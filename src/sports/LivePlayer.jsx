import { useEffect, useRef, useState } from 'react'
import { errorMessages } from './live-feed'

let apiPromise
function youtubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (apiPromise) return apiPromise
  apiPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { apiPromise = null; reject(new Error('player_load_failed')) }, 15000)
    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => { clearTimeout(timeout); previous?.(); resolve(window.YT) }
    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    script.onerror = () => { clearTimeout(timeout); apiPromise = null; reject(new Error('player_load_failed')) }
    document.head.append(script)
  })
  return apiPromise
}

export function LivePlayer({ video }) {
  const host = useRef(null)
  const [state, setState] = useState('live')
  const [error, setError] = useState('')
  const [playback, setPlayback] = useState('재생 버튼을 눌러 시청하세요. 제공처의 지역·연령 제한이 적용됩니다.')
  useEffect(() => {
    let active = true
    const controller = new AbortController()
    async function check() {
      try {
        const response = await fetch(`/api/baseball-live?videoId=${video.id}`, { signal: controller.signal })
        const data = await response.json()
        if (!active) return
        if (!response.ok) { setError(errorMessages[data.error] || '방송 상태를 확인하지 못했습니다.'); return }
        setState(data.state)
        setError('')
      } catch { if (active) setError('방송 상태 갱신 실패: 마지막 확인 정보로 표시합니다.') }
    }
    check()
    const timer = setInterval(check, 60000)
    return () => { active = false; controller.abort(); clearInterval(timer) }
  }, [video.id])
  useEffect(() => {
    if (state !== 'live') return
    let active = true, player
    const container = document.createElement('div')
    host.current.replaceChildren(container)
    youtubeApi().then(YT => {
      if (!active) return
      player = new YT.Player(container, { videoId: video.id, width: '100%', height: '100%',
        playerVars: { origin: window.location.origin, playsinline: 1, autoplay: 0 },
        events: {
          onReady: event => { event.target.getIframe().title = video.title },
          onStateChange: event => { if (active && event.data === 1) setPlayback('영상이 재생 중입니다.') },
          onError: event => { if (active) setPlayback([101, 150].includes(event.data) ? '제공처가 외부 재생을 차단했습니다. 원본 영상에서 시청해 주세요.' : '영상을 재생할 수 없습니다. 원본 영상에서 상태를 확인해 주세요.') },
        },
      })
    }).catch(() => { if (active) setPlayback('플레이어를 불러오지 못했습니다. 원본 영상에서 시청해 주세요.') })
    return () => { active = false; player?.destroy() }
  }, [video.id, video.title, state])
  return <section className="sports-watch" aria-label="선택한 방송">
    <div className="sports-player">{state === 'live' ? <div className="sports-youtube" ref={host} /> : <div className="sports-player-empty"><h2>{state === 'ended' ? '방송이 종료되었습니다' : '방송을 시청할 수 없습니다'}</h2><p>다른 라이브를 선택해 주세요.</p></div>}</div>
    <div className="sports-match-title"><div><span className="sports-eyebrow">{state === 'live' ? '● LIVE' : 'OFFLINE'}</span><h2>{video.title}</h2><p>{video.channelTitle} · {video.viewers == null ? '동시 시청자 수 비공개' : `${video.viewers.toLocaleString()}명 시청 중`}</p><p role="status">{state === 'live' && playback}</p>{error && <p role="alert">{error}</p>}<a className="sports-original" href={video.watchUrl} target="_blank" rel="noopener noreferrer">YouTube 원본 영상 ↗</a></div></div>
  </section>
}
