# 야구 라이브 · 스포츠 페이지

## 기존 구조와 변경 범위

React 19 / Vite 8, React Router, Zustand, 기존 Firebase Google 로그인(Auth/Firestore)을 재사용합니다. 메인 메뉴 마지막 ‘스포츠’ → `/sports`. 영화·시리즈 등 기존 경로와 로그인 데이터 구조는 유지합니다. 스포츠의 이전 예시 경기/Firestore 경기 목록을 제거했습니다. 실제 API 실패를 예시 데이터로 대체하지 않습니다.

`api/baseball-live.js`는 Vercel Node 함수이며 `server/baseball-live.js`가 조회·검증·캐시를 담당합니다. Vite 개발 서버에도 동일한 핸들러를 연결했습니다. Vercel SPA rewrite에서 `/api/`와 `/assets/`를 제외하여 `/sports` 직접 접속·새로고침과 API를 함께 지원합니다.

## 출처 및 검색 기준

- [YouTube search.list](https://developers.google.com/youtube/v3/docs/search/list)
- [YouTube videos.list](https://developers.google.com/youtube/v3/docs/videos/list)
- [liveStreamingDetails](https://developers.google.com/youtube/v3/docs/videos#liveStreamingDetails)
- [channels.list / forHandle](https://developers.google.com/youtube/v3/docs/channels/list)
- [YouTube IFrame Player API](https://developers.google.com/youtube/iframe_api_reference)
- [Google 공식 공개 API 명세](https://github.com/googleapis/google-api-go-client/blob/main/youtube/v3/youtube-api.json)
- [WBSC 공식 웹사이트](https://www.wbsc.org/), 필터 대상 핸들 [@WBSC](https://www.youtube.com/@WBSC)

작업 환경에서는 Google 공식 GitHub 명세를 실제 다운로드하여 search의 q/type/eventType/videoEmbeddable, videos의 status와 liveStreamingDetails 필드를 확인했습니다. 개발자 문서 웹페이지·WBSC 웹사이트·실제 YouTube API 요청은 프록시 목적지 차단 또는 키 미제공으로 검증하지 못했습니다. WBSC 핸들은 설정된 대상이며 운영 API에서 실제 채널 ID를 해석하는 `channels.list(forHandle=WBSC)`가 성공해야 필터가 동작합니다. 채널 이름 문자열로 공식 채널을 판단하지 않습니다. 현재 방송/공식 채널 ID를 확인했다고 주장하지 않습니다.

`search.list`를 **야구**, **baseball**로 각각 실행하며 `type=video`, `eventType=live`, `videoEmbeddable=true`, `videoSyndicated=true`, 스포츠 분류(categoryId=17), `order=viewCount`, 페이지당 50개를 요청합니다. 페이지 토큰으로 각 검색어 최대 3페이지를 조회하여 ID를 합치고 중복을 제거합니다. 한도를 넘으면 화면에 검색 범위 제한을 알립니다. ‘전체’는 확인한 검색 결과 전체이며 YouTube의 모든 야구 방송이라는 의미는 아닙니다.

`videos.list(part=snippet,status,liveStreamingDetails)`로 다시 확인합니다:

- public, embeddable=true, liveBroadcastContent=live
- 실제 시작 시각이 존재하고 현재 이전이며 실제 종료 시각이 없음
- 스포츠 분류, 야구/KBO/MLB/NPB/WBSC 관련 단어와 경기 단서가 있음
- 제목의 명확한 게임·시뮬레이션·하이라이트·리플레이·해설·입중계·분석·watch-along·소프트볼·크리켓은 제외

메타데이터 기반 선별은 영상 내용·중계권의 완전한 검증이 아닙니다. 일반 방송 제목이 모호하면 실제 경기로 포함되지 않을 수 있고, 부정확한 메타데이터를 가진 영상이 통과할 수도 있습니다. 플랫폼 제공처의 지역/연령/외부 재생 제한은 플레이어 오류로 안내합니다.

동시 시청자 `concurrentViewers`를 숫자로 읽어 내림차순으로 정렬합니다. 없으면 `null`/‘비공개’이며 0을 만들지 않습니다. 시청자 수가 공개된 방송 중 상위 최대 5개와 전체 결과를 표시하고 결과가 0~4개면 실제 개수만 표시합니다. 선택 시 영상 ID가 다른 플레이어·채팅방으로 전환됩니다. 모든 방송에 원본 링크를 제공합니다.

## 캐시·자동 갱신·오류

서버 인스턴스 메모리 캐시와 동일 요청 병합 5분, 성공 목록에 Vercel CDN `s-maxage=300`, 브라우저도 응답 expiresAt까지 캐시합니다. 조회 버튼은 TTL을 우회하지 않습니다. 프론트엔드는 5분마다 다시 조회합니다. 서버리스 cold start/리전과 CDN 상태에 따라 추가 API 요청이 생길 수 있으며 전역 영속 캐시는 아닙니다. 검색 페이지 제한은 할당량 폭주 방지용입니다.

선택 영상은 별도 videos.list로 60초마다 상태를 확인하며 서버/edge 상태 캐시 30초를 사용합니다. 종료·시청 불가·상태 조회 실패를 구분합니다. 종료 판정은 영상 플레이어를 제거하고 다른 방송 선택을 안내합니다. onStateChange로 실제 재생 시작을 감지하고 onError로 외부 재생 거부 등을 안내합니다.

오류 코드는 `missing_key`, `permission_denied`, `quota_exceeded`, `network_error`, `channel_unavailable`, `upstream_error`입니다. 로딩/빈 결과와 구분합니다. 서버는 Google 오류 원문, 요청 URL, 키를 응답/로그에 출력하지 않습니다. 성공 응답에 키가 포함되지 않습니다.

## 안전한 환경 설정

작업 환경에서 변수 이름과 존재 여부만 확인했으며 YouTube·Firebase 값이 없었습니다. 키를 채팅·Git·로그에 넣지 마세요.

1. Vercel의 **기존 프로젝트 환경 변수**에 서버 전용 `YOUTUBE_API_KEY`를 추가하고 재배포합니다. Google Cloud에서 YouTube Data API v3를 활성화하고 해당 API로 키를 제한합니다. 서버 호출이므로 브라우저 HTTP-referrer 전용 키 제한은 사용할 수 없습니다. 기존 `VITE_YOUTUBE_API_KEY`도 서버에서 호환 fallback으로 읽지만 새 스포츠 키는 `VITE_` 접두사 없이 저장하세요. 기존 다른 화면의 YouTube 검색 코드는 유지했습니다.
2. Firebase 클라이언트 구성: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`. 선택 구성 `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`. VITE 값은 브라우저에 포함되므로 웹 클라이언트용 구성만 사용하고 서비스 계정 개인 키는 절대 넣지 않습니다. Firebase Auth 승인 도메인에 실제 배포 도메인을 추가하고 Google 로그인을 활성화합니다.
3. 로컬은 Git에서 무시되는 `.env.local` 또는 안전하게 주입된 환경 변수를 사용합니다. 설정 후 Vite 재시작, Vercel은 재배포가 필요합니다. 코드에 자격 증명 기본값이나 가짜 키는 없습니다.
4. 런타임 네트워크: `www.googleapis.com`, `www.youtube.com`, `www.youtube-nocookie.com`, `i.ytimg.com`, Firebase authDomain, `identitytoolkit.googleapis.com`, `securetoken.googleapis.com`, `firestore.googleapis.com`. 문서/에뮬레이터: `developers.google.com`, `www.wbsc.org`, `storage.googleapis.com`. 임의 VPN/프록시 우회, TLS 검증 해제는 하지 않습니다. 환경 초안 저장은 실행 인스턴스/Vercel에 설정을 자동 적용하지 않습니다.

## Firestore 실시간 채팅과 규칙

기존 Firebase Auth 로그인 사용자끼리 `sportsRooms/{youtubeVideoId}/messages`를 `onSnapshot(orderBy(createdAt), limitToLast(100))`로 구독합니다. 전송 중 중복 전송 방지, 최대 300자, 공백 메시지 거부, 실패 시 입력 유지/안내, 선택/로그아웃/언마운트 시 구독 해제, auth.currentUser UID 재확인을 처리합니다. 표시명은 기존 Google displayName이며 40자로 제한합니다. React 텍스트 렌더링으로 사용자 HTML을 실행하지 않습니다. 기존 로그인 결과의 민감한 콘솔 출력을 제거하고, 설정 누락/팝업 차단/승인 도메인 오류를 로그인 화면에 안전한 문구로 안내합니다.

[추가 규칙](../tests/sports.rules.fragment)을 **기존** `match /databases/{database}/documents` 블록 안에 병합하세요. 기존 배포 규칙은 저장소에 없어 내려받거나 덮어쓰지 않았으며 운영 배포도 하지 않았습니다. 로그인/발신 UID 일치, 문서 필드 allowlist, 메시지/이름 길이·타입, 서버 시각, 영상 ID, 수정/삭제 금지를 검사합니다. 다른 broad allow 규칙과 겹치면 Firestore의 OR 의미로 제한을 우회할 수 있으므로 운영 규칙 전체를 검토해야 합니다. 기존 users 규칙을 보존하는 예시는 에뮬레이터 테스트 fixture일 뿐 운영 users 정책을 추정한 것이 아닙니다. 서비스 운영 전 App Check/서버 측 전송 빈도 제한/모더레이션을 추가하는 것이 좋습니다.

## 실행 및 검증

현재 격리된 `/workspace/ott-test_1` 체크아웃을 사용하며 별도 Git worktree는 사용자 요청이 있을 때만 만듭니다. Node 24, Java 21.

```sh
npm ci
npm run dev -- --host 0.0.0.0 --port 5173 --strictPort
npm run build
npm run lint:sports
npm test
npx playwright install chromium
npm run test:ui
npm run test:rules
```

시스템 Chromium이 있으면 `CHROMIUM_PATH=/usr/bin/chromium npm run test:ui`. 권한 제한 환경에서는 `npm ci --cache /workspace/.npm`, `FIREBASE_EMULATORS_PATH=/workspace/.cache/firebase/emulators XDG_CONFIG_HOME=/tmp/ott-firebase-config npm run test:rules`. 프록시가 필요한 Node 런타임에서는 Node 24의 `NODE_USE_ENV_PROXY=1`을 프로세스 시작 시 설정하여 상속된 프록시/CA를 유지합니다.

- **모의 서버 테스트**: 필터·누락/종료/비공개/비임베드 거부, 인기 정렬, 실개수, WBSC ID 필터, 페이지 중복 제거, 캐시/동시요청 병합, 오류/비밀 비노출. 실제 API 성공을 뜻하지 않습니다.
- **모의 UI 테스트**: 목록/TOP 5, WBSC 필터, 영상 선택, 빈 결과/로딩/각 오류, 종료, 자동 갱신/캐시, 모바일 직접 접속·새로고침. YouTube 자체 플레이어 네트워크를 차단하므로 실제 재생 검증이 아닙니다.
- **Firestore 에뮬레이터**: 두 인증 사용자 onSnapshot 양방향 수신, 방 분리, 비인증 접근·위조 UID·길이·추가 필드·시각·수정/삭제 거부, 기존 규칙 병합 보존. 로컬 실행은 공식 JAR 다운로드 네트워크 차단으로 미실행. GitHub `Sports checks`에서 별도로 실행해 성공했습니다(아래 실행 결과 참조).
- **운영 검증 체크리스트**: 실제 API가 반환한 live 목록/시청자 수와 WBSC 필터, 원본 영상과 플레이어 실제 재생, 두 실제 계정 간 메시지 수신/방 분리, 실제 운영 규칙, 배포 `/sports` 직접 접속·새로고침. 키·인증·네트워크가 없는 상태의 테스트 통과로 이를 대체할 수 없습니다.

`.github/workflows/sports-checks.yml`은 빌드·변경 린트·모의 로직/UI·Firestore 에뮬레이터를 실행합니다. 기존 전체 린트에는 이번 변경 밖의 미사용 변수/Hook 경고가 남아 있습니다. 실제 API/운영 계정을 CI에 제공하지 않으므로 운영 기능 검증과 구분하세요.

GitHub main push로 기존 Vercel 연결이 자동 배포됩니다. GitHub 커밋 상태의 `Vercel` 성공은 배포 완료 증거이며, 운영 페이지 기능 검증과는 별개입니다.

## 실행 결과 기록

- 로컬 서버 모의 테스트 10개, 브라우저 모의 테스트 9개, 변경 코드 린트와 프로덕션 빌드 통과.
- [첫 구현 커밋의 GitHub CI](https://github.com/jueco1402/ott-test_1/actions/runs/39555497675)는 성공했고 `npm run test:rules` 단계도 실행 완료(success). 이 결과는 에뮬레이터 검증이며 운영 Firebase 검증이 아닙니다. 로컬 에뮬레이터 다운로드는 프록시 403으로 실패했습니다.
- 커밋 `718dd69`의 Vercel 배포 완료 상태를 GitHub에서 확인했습니다. 후속 수정은 후속 커밋의 CI/배포 상태를 별도로 확인해야 합니다.
- 실제 YouTube API 요청·WBSC 채널 ID 해석·영상 재생은 키 누락/목적지 차단으로 미검증. 실제 Firebase 두 계정과 운영 규칙도 설정 부재로 미검증.
- 배포 사이트 `https://ott-test-1.vercel.app/sports` 직접 접속 시도는 이 작업 환경 프록시가 403으로 차단했습니다. 따라서 운영 사이트 직접 접속·새로고침 검증은 완료되지 않았습니다. 로컬 모의 브라우저에서는 직접 접속·새로고침·모바일 레이아웃을 통과했습니다.
