# [프론트 → 백엔드] 인증·하천길 API 요청 사항

> 작성: 프론트 (2026-11-09)
> 프론트는 받은 명세대로 API 호출 코드를 다 만들어 뒀고, 지금은 목업으로 돌리고 있어요.
> **서버 주소만 받으면 바로 붙일 수 있어요.**
> 아래 🔴 1~7번만 정해지면 실제 서버로 붙여서 확인할 수 있어요.

---

## 🔴 꼭 먼저 정해 주세요

### 1. 응답 형식 통일

공통 규칙과 각 API 예시가 달라요.

| 출처 | 형식 |
| --- | --- |
| 공통 규칙 | `{ code, message, data }` |
| 각 API 예시 | `{ success, data, message }` |

→ 하나로 정해 주세요. (프론트는 일단 둘 다 읽게 해 뒀어요.)

### 2. 하천길 상태 값

예시에 `AVAILABLE`만 있어요. 화면은 아래 상태로 나뉘어요.

| 값 | 화면 표시 |
| --- | --- |
| `AVAILABLE` | 이용 가능 (초록) |
| `FLOODED` | 이용 위험 (빨강) |
| `UNKNOWN` | 확인 불가 (회색) |
| `RECOVERING` | 회복 중 (쓸지 결정 필요) |

- 이 값을 AI 서버(`/live/status`) 결과로 **백엔드가 계산해서** 주는 건지 알려 주세요.

### 3. 공식 통제 상태 값

`officialControlStatus`에 `OPEN`만 있어요.

| 값 | 의미 |
| --- | --- |
| `OPEN` | 개방 |
| `CLOSED` | 출입 통제 |
| `PARTIAL` | 일부 통제 |

- 통제 **사유 · 출처 · 확인 시각**도 같이 주세요. (화면에 "출처·확인 시각" 표시 칸이 있어요.)
- 공식 통제는 AI 결과보다 우선해서 보여주고, 통제 중이면 코스 시작을 막아요.

### 4. 값이 없을 때 null 허용

화면에 "정보 미확인", "확인 불가" 상태가 있어요.
지금 명세는 전부 `Nullable: N`인데, 아래 값은 **데이터가 없으면 null**로 와야 해요.

- `currentWaterLevelMeters`
- `predictedWaterLevelMeters`, `forecastTargetAt`
- `officialControlStatus`

### 5. AI 회복 예측 추가 (`GET /trails/{trailId}/status`)

이용 위험일 때 "언제 다시 이용 가능한지" 보여줄 거예요.
AI 서버 `POST /recovery` 결과를 그대로 넘겨 주면 돼요.

```json
{
  "trailId": 1,
  "observedAt": "2026-07-30T21:30:00+09:00",
  "currentWaterLevelMeters": 1.57,
  "predictedWaterLevelMeters": 2.01,
  "forecastTargetAt": "2026-07-30T22:30:00+09:00",
  "trend": "FALLING",
  "recoveryEtaMinutes": 240,
  "recoveryEtaRange": { "minMinutes": 180, "maxMinutes": 300 },
  "officialControlStatus": "OPEN",
  "responseGeneratedAt": "2026-07-30T21:31:00+09:00"
}
```

| 필드 | 설명 |
| --- | --- |
| `trend` | `RISING` · `FALLING` · `STEADY` |
| `recoveryEtaMinutes` | 회복 예상까지 남은 시간(분). 예측 안 할 때는 null |
| `recoveryEtaRange` | 예상 범위(최소~최대). 없으면 null |

> 화면 규칙: 수위가 내려갈 때만 예상 시간을 보여주고, 비가 오는 중이면 숨겨요. 6시간이 넘으면 "반나절 이상"으로 표시해요.

### 6. ~~닉네임 설정 API 추가~~ → ✅ 해결 (USER-02 · USER-05)

- 닉네임 변경 `PATCH /users/me { memberName }`, 중복 확인 `GET /users/nickname-availability?memberName=` 둘 다 연결했어요.
- 프론트 규칙도 명세와 같아요: 한글·영문·숫자 2~12자, 공백 불가, 대소문자 구분 없이 비교. 가입·프로필 저장 전에 중복 확인을 먼저 하고, 저장 때 409(`DUPLICATE_MEMBER_NAME`)가 와도 같은 문구로 보여줘요.

### 7. 서버 주소

- 테스트용이라도 서버를 띄우면 주소를 알려 주세요.
- Swagger 주소가 있으면 더 좋아요.

---

## 🟡 화면에 필요한데 명세에 없는 것

| # | API | 요청 |
| --- | --- | --- |
| 8 | `GET /trails/{id}/routes` | 코스 경로 `geometry`(GeoJSON LineString)를 넣어 주세요. 코스 화면에서 선으로 그려요. |
| 9 | `GET /trails/{id}/status` | 관측소 이름을 넣어 주세요. (예: 월촌교 수위관측소) |
| 10 | `GET /trails` | 목록 항목에 부제(지역명이나 구간명)를 넣어 주세요. 검색 결과에는 `sectionName`이 있는데 목록에는 없어요. |
| 11 | ~~(없음)~~ | ✅ 해결: `GET /weather/current` (WEATHER-01) 연결 |
| 12 | `POST /auth/signup` | 이메일 중복과 닉네임 중복을 code로 구분해 주세요. (`DUPLICATE_EMAIL`, `DUPLICATE_MEMBER_NAME`) |

---

## 🟢 확인만 해 주세요

| # | 항목 | 질문 |
| --- | --- | --- |
| 13 | `GET /trails`의 `distanceMeters` | 내 위치에서의 거리인가요, 하천길 길이인가요? |
| 14 | `GET /trails`의 위치 값 | latitude/longitude가 필수인가요? 위치 권한이 없으면 프론트는 월촌교 좌표(37.3245, 127.2355)를 보내요. |
| 15 | `activityType` | `WALK` · `RUN` · `BIKE`로 보내도 되나요? |
| 16 | `GET /trails/{id}/detours` | 우회 경로가 없을 때 빈 배열을 주나요, 404를 주나요? 원래 코스 대비 추가 거리도 주면 좋아요. |
| 17 | 소셜 로그인 제공자 | 명세는 GOOGLE·KAKAO·NAVER, 디자인은 카카오·네이버·애플이에요. 어느 쪽에 맞출지 정해 주세요. 시연은 이메일 로그인으로 할 예정이에요. |
| 18 | 신규 소셜 회원의 `memberName` | 실명이 들어올 수 있어요. 닉네임을 정하기 전까지는 비워 주세요. |
| 19 | 회원가입 응답 코드 | 지금 200인데 공통 규칙상 생성은 201이에요. |
| 20 | 비밀번호 규칙 | 프론트는 영문+숫자 8자 이상으로 검사해요. 맞춰 주세요. |
| 21 | 로그아웃 | Access Token이 필요한가요? 현재 기기만 로그아웃인가요? |

---

## 참고: 프론트가 지금 쓰는 API

| 화면 | API |
| --- | --- |
| 이메일 로그인 / 회원가입 | `POST /auth/email/login`, `POST /auth/signup` (가입 후 바로 이메일 로그인) |
| 소셜 로그인 | `POST /auth/login` |
| 토큰 | `POST /auth/reissue` (401이면 한 번 재발급 후 다시 요청), `POST /auth/logout` |
| 홈 하천길 목록 | `GET /trails` |
| 하천길 검색 | `GET /trails/search` |
| 하천길 선택 · 코스 지도 | `GET /trails/{id}` (geometry [경도, 위도]) |
| 구간 상태 | `GET /trails/{id}/status` |
| 우회 코스 확인 | `GET /trails/{id}/detours` |
| 기록 시작 직전 | `GET /trails/{id}/routes` → `GET /routes/{routeId}/availability` |

---

## 🆕 추가 (2026-11-09) — 새 API 목록(ACT·FAV·BADGE·WEATHER·NOTI·USER-03) 연결

API 목록에 주소만 있어서, 프론트는 아래 필드 이름으로 **가정하고 연결해 뒀어요.** 다르면 알려 주세요. (프론트는 `src/api/me.js`의 변환 함수만 고치면 돼요)

### 활동 (ACT)

`POST /activities` 요청
```json
{
  "activityType": "WALK",
  "routeId": 12,
  "startedAt": "2026-11-09T08:20:00+09:00",
  "endedAt": "2026-11-09T08:34:32+09:00",
  "distanceMeters": 2480,
  "durationSeconds": 872,
  "path": { "type": "LineString", "coordinates": [[127.2355, 37.3245]] },
  "simulated": false
}
```
- `simulated`: 시연 모드(가상 이동) 기록 표시예요. **허위 기록 방지(F-12)** 를 위해 통계·배지에서 뺄지 정해 주세요.
- 응답·목록 항목: 위 필드 + `activityId`, `trailName`, `routeName`
- `GET /activities?page&size` → `{ content: [...] }` 또는 배열
- `GET /activities/stats/weekly?date=2026-11-09` → `{ activityCount, totalDistanceMeters, totalDurationSeconds, days: [{ date, distanceMeters }] }`
- `GET /activities/stats/monthly?year=2026&month=11` → `{ activityCount, totalDistanceMeters, totalDurationSeconds, activeDates: ["2026-11-03", ...], currentStreakDays }`
- 기록 **삭제 API**가 없어요. 필요하면 `DELETE /activities/{id}` 추가해 주세요.

### 즐겨찾기 (FAV)
- `GET /favorites` → `[{ favoriteId, routeId, ... }]` — **`favoriteId`와 `routeId`가 같이 와야** 코스 화면 ☆를 끌 수 있어요.
- `POST /favorites` `{ routeId }` → `{ favoriteId, routeId }`

### 배지 (BADGE-01)
- `GET /badges` → `[{ badgeId, name, description, earned, imageUrl }]` (그림이 없으면 앱에 넣어 둔 그림을 써요)

### 날씨 (WEATHER-01)
- `GET /weather/current?latitude&longitude` → `{ temperature, skyLabel, precipitationMm, locationName }`

### 알림 (NOTI)
- `GET /notifications` → `[{ notificationId, type, title, body, createdAt, read, level }]`
  - `type`: `RECOVERY`(회복 예측) · `RIVER_STATUS` · `ACTIVITY` · `SERVICE` / 위험 알림은 `level: "DANGER"`
- **모두 읽음 API 요청:** `PATCH /notifications/read-all` — 지금은 안 읽은 알림 수만큼 `PATCH /notifications/{id}/read`를 보내요.
- `GET·PATCH /notification-settings` → `{ riverStatusEnabled, activityEnabled, serviceNewsEnabled }`
- `POST /devices` `{ pushToken, platform: "ANDROID"|"IOS" }` → `{ deviceId }` / 로그아웃 때 `DELETE /devices/{deviceId}`
  - ⚠ 안드로이드 Expo Go에서는 원격 푸시 토큰을 못 받아서, **푸시는 개발 빌드 이후**에 실제로 등록돼요. 함수는 만들어 뒀어요.

### 프로필 사진 (USER-03)
- `POST /users/me/photo` multipart, 파일 필드 이름 `image` → `{ profileImageUrl }`
- **기본 이미지로 되돌리기**(사진 삭제) API가 없어요. 필요하면 `DELETE /users/me/photo` 추가해 주세요.

### 회복 예측 (MAP-04, F-03)
- 위 5번 형식(`recoveryEtaMinutes`, `recoveryEtaRange`, `trend`) 그대로 읽어요. 구간 상태 화면에 "AI 회복 예측" 카드로 보여줘요.

### 아직 API가 없는 것
| 항목 | 요청 |
| --- | --- |
| F-05 근거 타임라인 | `GET /trails/{id}/status`에 `timeline: [{ at, source: OFFICIAL|OBSERVED|AI, title, detail }]` 추가 |
| 홈 "내 주변 코스" | 코스 목록을 한 번에: `GET /routes?latitude&longitude&activityType` (코스별 상태·통제 포함) |
| 과거 침수 이력 | 프론트가 파일로 넣을게요 (API 불필요) |
| CCTV | 할지 팀에서 결정 필요 |
