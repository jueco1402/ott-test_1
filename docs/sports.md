# 스포츠 연동

`/sports`에 경기 선택, 승인된 YouTube 임베드 시청, 경기별 Firestore 채팅을 구현했습니다.
등록된 경기가 없으면 **예시** 경기 6개를 표시합니다. 예시는 실제 일정이나 생중계가 아니며 채팅이 비활성화됩니다.
TVING/KBO 공식 홈페이지 링크는 편성 확인용입니다. 현재 환경의 프록시가 해당 사이트 접근을 403으로 차단해 현재 편성과 개별 영상 URL을 검증하지 못했습니다. 특정 생중계가 현재 제공된다고 보장하지 않습니다.

## 실제 연결

기존 VITE_FIREBASE_* 환경 설정과 Firebase Google 로그인/승인 도메인을 설정합니다. 관리자 계정 또는 신뢰된 서버에서 Firestore `baseballGames/{gameId}` 문서를 생성합니다. 브라우저 사용자가 경기 문서를 작성하게 허용하지 않습니다.

필드: `home`/`away` (팀 이름), `venue`, `status` (`live` 또는 `scheduled`), 선택 사항 `inning`, `homeScore`, `awayScore`, `streamUrl`.
`streamUrl`은 중계권자가 외부 재생을 허용한 `https://www.youtube.com/embed/영상ID` 또는 `https://www.youtube-nocookie.com/embed/영상ID` 형식만 허용합니다. 임의 사이트 iframe은 거부합니다. URL을 등록해도 제공처의 재생/지역 제한은 적용됩니다. 자동 경기 수집이나 유료 중계 추출은 구현하지 않았습니다.
실제 경기 5개 이상을 표시하려면 실제 제공처의 편성을 확인하여 문서를 5개 이상 등록해야 합니다. 없는 경기를 실제 경기처럼 생성하지 않습니다.

`baseballGames/{gameId}/messages`를 createdAt 순으로 최근 100개 구독합니다. 로그인한 사용자가 최대 300자 전송할 수 있습니다. 접속자는 탭별 heartbeat를 30초마다 기록하고 90초 이내 heartbeat의 고유 UID를 집계합니다. 로그인한 채팅 참여자 수이며 총 영상 시청자 수는 아닙니다. 강제 종료 시 최대 90초 오차가 있습니다. 서버에서 오래된 viewers 문서를 주기적으로 청소하는 것을 권장합니다.

## 보안 규칙 예시

아래 규칙을 **기존 규칙에 검토 후 병합**하세요. 전체 규칙을 덮어쓰면 기존 users 기능을 깨뜨릴 수 있습니다. 자동 배포하지 않았습니다.

```text
match /baseballGames/{gameId} {
  allow read: if true;
  allow write: if false;
  match /messages/{messageId} {
    allow read: if request.auth != null;
    allow create: if request.auth != null
      && request.resource.data.keys().hasOnly(['uid', 'name', 'text', 'createdAt'])
      && request.resource.data.uid == request.auth.uid
      && request.resource.data.name is string
      && request.resource.data.name.size() > 0 && request.resource.data.name.size() <= 40
      && request.resource.data.text is string
      && request.resource.data.text.size() > 0 && request.resource.data.text.size() <= 300
      && request.resource.data.createdAt == request.time;
    allow update, delete: if false;
  }
  match /viewers/{sessionId} {
    allow read: if request.auth != null;
    allow create: if request.auth != null
      && request.resource.data.keys().hasOnly(['uid', 'lastSeen'])
      && request.resource.data.uid == request.auth.uid
      && request.resource.data.lastSeen == request.time;
    allow update: if request.auth != null
      && resource.data.uid == request.auth.uid
      && request.resource.data.keys().hasOnly(['uid', 'lastSeen'])
      && request.resource.data.uid == request.auth.uid
      && request.resource.data.lastSeen == request.time;
    allow delete: if request.auth != null && resource.data.uid == request.auth.uid;
  }
}
```

서비스 운영 전에는 App Check, 서버 측 전송 빈도 제한, 신고·관리 기능을 추가하세요.

## 검증

`npm run build`, `npx eslint src/pages/Sports.jsx`.
실제 Firebase 설정 후 서로 다른 로그인 계정 두 개로 동일한 경기에 접속하여 메시지 상호 수신, 경기 전환 시 방 분리, 접속 인원, 권한 거부 표시를 확인해야 합니다. 현재 자격 증명이 없어 이 통합 검증은 미실행입니다.
