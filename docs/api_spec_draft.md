# [프론트 초안] API 명세 — 활동 · 즐겨찾기 · 배지 · 날씨 · 알림 · 프로필 사진

> 작성: 프론트 (2026-11-09)
> 이 문서는 API 목록에서 **주소만 있고 요청·응답 필드가 없던 API**의 초안이에요. 팀 템플릿 형식으로 썼어요.
> **앱은 이미 이 필드 이름으로 연결돼 있어요.** 그대로 만들면 바로 붙고, 바꾸고 싶은 이름이 있으면 알려 주세요. 프론트는 `src/api/me.js` 변환 부분만 고치면 돼요.
> 정할 게 남은 곳은 ❓로 표시했어요.

---

## 0. 공통 규칙 (모든 API)

| 항목 | 규칙 |
| --- | --- |
| Base URL | `/api/v1` |
| 인증 | `Authorization: Bearer <accessToken>` (표에 "불필요"라고 적힌 API만 예외) |
| 성공 응답 | `{ "code": "SUCCESS", "message": "...", "data": { ... } }` |
| 실패 응답 | `{ "code": "<오류 코드>", "message": "<사용자에게 보여줄 문구>", "errors": null }` |
| 응답 없음 | 삭제처럼 돌려줄 값이 없으면 **204 No Content** (본문 없음) |
| 시간 | ISO 8601, **시간대 포함**: `2026-11-09T08:20:00+09:00`. 시간대가 빠지면 앱에서 9시간 어긋나요. |
| 날짜만 | `2026-11-09` |
| 좌표 | GeoJSON 순서 **[경도, 위도]** (`[127.2355, 37.3245]`). 단일 좌표 파라미터는 `latitude`, `longitude` |
| 단위 | 필드 이름에 단위: `distanceMeters`, `durationSeconds`, `temperature`(℃), `precipitationMm` |
| 값 없음 | 필드를 빼지 말고 `null` |
| 목록 | `page`(0부터), `size` → `data: { "content": [...], "page": 0, "size": 20, "hasNext": false }` |
| Enum | 대문자 영어: `WALK`, `RUN`, `BIKE` |
| 401 | Access Token이 만료되면 `code: "TOKEN_EXPIRED"` → 앱이 `POST /auth/reissue` 후 한 번 다시 요청해요. 그 밖의 401(`UNAUTHORIZED`)은 로그인 화면으로 보내요. |

공통 오류

| HTTP | code | message |
| --- | --- | --- |
| `400` | `INVALID_REQUEST` | 요청 정보를 확인해 주세요. |
| `401` | `TOKEN_EXPIRED` | 로그인이 만료되었습니다. |
| `401` | `UNAUTHORIZED` | 인증 정보를 확인해 주세요. |
| `404` | `NOT_FOUND` | 정보를 찾을 수 없습니다. |
| `500` | `INTERNAL_ERROR` | 잠시 후 다시 시도해 주세요. |

---

# ACT-01 활동 기록 저장

## 기본 정보

| 항목 | 내용 |
| --- | --- |
| Method | `POST` |
| Path | `/activities` |
| 인증 | 필요 |
| Content-Type | `application/json` |

GPS로 측정한 활동 결과와 이동 경로를 저장해요. "활동 결과" 화면의 [기록 저장] 버튼에서 불러요.

## Request

### Request Body

```json
{
  "clientActivityId": "rec-1762650000000",
  "activityType": "RUN",
  "routeId": 12,
  "startedAt": "2026-11-09T08:20:00+09:00",
  "endedAt": "2026-11-09T08:34:32+09:00",
  "distanceMeters": 2480,
  "durationSeconds": 872,
  "path": { "type": "LineString", "coordinates": [[127.2355, 37.3245], [127.2361, 37.3251]] },
  "simulated": false
}
```

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `clientActivityId` | String | Y | 앱이 만든 고유 id. 같은 값이 다시 오면 **새로 저장하지 않고 기존 기록을 돌려줘요.** (네트워크 재시도 중복 방지) |
| `activityType` | String | Y | `WALK` · `RUN` · `BIKE` |
| `routeId` | Long | N | 코스를 고르고 기록했으면 코스 id, 자유 기록이면 null |
| `startedAt` | DateTime | Y | 시작 시각 |
| `endedAt` | DateTime | Y | 종료 시각 |
| `distanceMeters` | Number | Y | 이동 거리(m) |
| `durationSeconds` | Number | Y | 일시정지를 뺀 실제 활동 시간(초) |
| `path` | GeoJSON LineString | Y | 이동 경로. 앱이 최대 400점으로 줄여서 보내요 |
| `simulated` | Boolean | Y | 시연 모드(가상 이동) 기록이면 true |

### 값 및 처리 규칙

| 항목 | 값 또는 조건 | 설명 |
| --- | --- | --- |
| 속도 검사 | `WALK` ≤ 10 km/h · `RUN` ≤ 25 km/h · `BIKE` ≤ 45 km/h (평균) | 넘으면 400 `INVALID_ACTIVITY` (허위 기록 방지, F-12) |
| `simulated` | true | ❓ 통계·배지에서 뺄지 정해 주세요. 프론트 제안: **저장은 하되 통계·배지에서 제외** |
| 저장 후 | — | 활동 기록 알림(`ACTIVITY`)을 만들고, 배지 획득 조건을 다시 계산해요 |

> 경로 좌표는 개인 위치 정보라 회원 탈퇴(USER-04) 시 함께 삭제해요.

## Success Response

**201 Created**

```json
{
  "code": "SUCCESS",
  "message": "활동이 저장되었습니다.",
  "data": {
    "activityId": 31,
    "clientActivityId": "rec-1762650000000",
    "activityType": "RUN",
    "routeId": 12,
    "routeName": "월촌교→매산교",
    "trailName": "월촌교 하천길",
    "startedAt": "2026-11-09T08:20:00+09:00",
    "endedAt": "2026-11-09T08:34:32+09:00",
    "distanceMeters": 2480,
    "durationSeconds": 872,
    "simulated": false,
    "newBadges": [{ "badgeId": 1, "name": "첫 걸음" }]
  }
}
```

| 필드 | 타입 | Nullable | 설명 |
| --- | --- | --- | --- |
| `data.activityId` | Long | N | 활동 id |
| `data.routeName` | String | Y | 코스 이름 |
| `data.trailName` | String | Y | 하천길 이름 (기록 목록에 "러닝 · 월촌교 하천길"로 표시) |
| `data.newBadges` | Array | N | 이번 저장으로 새로 얻은 배지 (없으면 `[]`) |
| 나머지 | — | — | 요청과 같음 |

## Error

| HTTP | 상황 | message |
| --- | --- | --- |
| `400` | `INVALID_ACTIVITY` 속도·거리·시간이 맞지 않음 | 기록을 확인할 수 없어 저장하지 못했어요. |
| `404` | `ROUTE_NOT_FOUND` | 코스를 찾을 수 없습니다. |

## 클라이언트 참고

- 저장에 성공하면 저장 완료 화면으로 이동하고, `activityId`로 상세 화면을 열어요.
- 실패하면 결과 화면에 그대로 남아 다시 누를 수 있어요. 같은 `clientActivityId`로 다시 보내요.

---

# ACT-02 활동 기록 목록 조회

## 기본 정보

| 항목 | 내용 |
| --- | --- |
| Method | `GET` |
| Path | `/activities` |
| 인증 | 필요 |
| Content-Type | `application/json` |

내 활동 기록을 최신순으로 조회해요. 기록 탭 "최근 활동"과 "활동 기록" 목록에서 써요.

## Request

### Query Parameters

| 필드 | 타입 | 필수 | 기본값 | 설명 |
| --- | --- | --- | --- | --- |
| `page` | Number | N | `0` | 페이지 |
| `size` | Number | N | `20` | 개수 (앱은 200까지 요청) |
| `activityType` | String | N | 전체 | `WALK` · `RUN` · `BIKE` |
| `year` | Number | N | 전체 | 연도 (월별 목록) |
| `month` | Number | N | 전체 | 월 1~12 |

## Success Response

**200 OK**

```json
{
  "code": "SUCCESS",
  "message": "조회되었습니다.",
  "data": {
    "content": [
      {
        "activityId": 31,
        "activityType": "RUN",
        "routeId": 12,
        "routeName": "월촌교→매산교",
        "trailName": "월촌교 하천길",
        "startedAt": "2026-11-09T08:20:00+09:00",
        "distanceMeters": 2480,
        "durationSeconds": 872,
        "simulated": false
      }
    ],
    "page": 0,
    "size": 20,
    "hasNext": false
  }
}
```

목록에는 `path`가 없어도 돼요. 경로는 상세(ACT-03)에서 받아요.

---

# ACT-03 활동 기록 상세 조회

## 기본 정보

| 항목 | 내용 |
| --- | --- |
| Method | `GET` |
| Path | `/activities/{activityId}` |
| 인증 | 필요 |
| Content-Type | `application/json` |

기록 상세 화면(지도·거리·시간·평균 페이스)에 써요.

### Path Parameters

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `activityId` | Long | Y | 활동 id |

## Success Response

**200 OK** — ACT-01 응답과 같은 모양 + `path`(GeoJSON LineString)

평균 페이스·속도는 앱이 `distanceMeters`, `durationSeconds`로 계산해요.

## Error

| HTTP | 상황 | message |
| --- | --- | --- |
| `404` | `ACTIVITY_NOT_FOUND` 없거나 내 기록이 아님 | 기록을 찾을 수 없습니다. |

---

# ACT-04 주간 활동 통계 조회

## 기본 정보

| 항목 | 내용 |
| --- | --- |
| Method | `GET` |
| Path | `/activities/stats/weekly` |
| 인증 | 필요 |
| Content-Type | `application/json` |

기록 탭 "주간" 화면: 이번 주(월~일) 거리·횟수·시간과 요일별 막대 그래프.

### Query Parameters

| 필드 | 타입 | 필수 | 기본값 | 설명 |
| --- | --- | --- | --- | --- |
| `date` | Date | N | 오늘 | 이 날짜가 들어 있는 주(월요일 시작) |

## Success Response

**200 OK**

```json
{
  "code": "SUCCESS",
  "message": "조회되었습니다.",
  "data": {
    "weekStart": "2026-11-09",
    "weekEnd": "2026-11-15",
    "activityCount": 4,
    "totalDistanceMeters": 12100,
    "totalDurationSeconds": 7320,
    "days": [
      { "date": "2026-11-09", "distanceMeters": 2480, "activityCount": 1 },
      { "date": "2026-11-10", "distanceMeters": 0, "activityCount": 0 }
    ]
  }
}
```

| 필드 | 타입 | Nullable | 설명 |
| --- | --- | --- | --- |
| `data.days` | Array | N | 월~일 7개 (기록 없는 날도 0으로) |

> "전체 활동" 카드의 누적 값은 USER-01(`totalActivityCount`, `totalDistanceMeters`)을 써요. ❓ 누적 시간도 USER-01에 `totalDurationSeconds`로 넣어 주세요.

---

# ACT-05 월간 활동 통계 조회

## 기본 정보

| 항목 | 내용 |
| --- | --- |
| Method | `GET` |
| Path | `/activities/stats/monthly` |
| 인증 | 필요 |
| Content-Type | `application/json` |

기록 탭 "월간" 화면: 이달 요약, 활동 달력, 연속 활동 일수.

### Query Parameters

| 필드 | 타입 | 필수 | 기본값 | 설명 |
| --- | --- | --- | --- | --- |
| `year` | Number | N | 올해 | 연도 |
| `month` | Number | N | 이번 달 | 1~12 |

## Success Response

**200 OK**

```json
{
  "code": "SUCCESS",
  "message": "조회되었습니다.",
  "data": {
    "year": 2026,
    "month": 11,
    "activityCount": 8,
    "totalDistanceMeters": 24800,
    "totalDurationSeconds": 13320,
    "activeDates": ["2026-11-02", "2026-11-05", "2026-11-09"],
    "currentStreakDays": 4
  }
}
```

| 필드 | 타입 | Nullable | 설명 |
| --- | --- | --- | --- |
| `data.activeDates` | Array<Date> | N | 활동한 날 (달력에 초록 동그라미) |
| `data.currentStreakDays` | Number | N | 오늘(오늘 기록이 없으면 어제)까지 이어진 연속 활동 일수. 조회 월과 관계없이 지금 기준 |

---

# FAV-01 즐겨찾기 목록 조회

## 기본 정보

| 항목 | 내용 |
| --- | --- |
| Method | `GET` |
| Path | `/favorites` |
| 인증 | 필요 |
| Content-Type | `application/json` |

즐겨찾기한 코스 목록. 앱은 로그인할 때 한 번 받아서 홈 ★ 필터, 코스 ☆, 검색 "저장"에 써요.

## Success Response

**200 OK**

```json
{
  "code": "SUCCESS",
  "message": "조회되었습니다.",
  "data": [
    {
      "favoriteId": 5,
      "routeId": 12,
      "routeName": "월촌교→매산교",
      "trailId": 3,
      "trailName": "월촌교 하천길",
      "status": "AVAILABLE",
      "createdAt": "2026-11-09T08:40:00+09:00"
    }
  ]
}
```

| 필드 | 타입 | Nullable | 설명 |
| --- | --- | --- | --- |
| `data[].favoriteId` | Long | N | 삭제(FAV-03)에 써요 |
| `data[].routeId` | Long | N | **꼭 필요** — 앱은 코스 id로 ☆ 상태를 판단해요 |
| `data[].status` | String | Y | 지금 상태 (`AVAILABLE` · `RECOVERING` · `FLOODED` · `UNKNOWN`) |

---

# FAV-02 즐겨찾기 추가

## 기본 정보

| 항목 | 내용 |
| --- | --- |
| Method | `POST` |
| Path | `/favorites` |
| 인증 | 필요 |
| Content-Type | `application/json` |

### Request Body

```json
{ "routeId": 12 }
```

## Success Response

**201 Created**

```json
{ "code": "SUCCESS", "message": "즐겨찾기에 추가되었습니다.", "data": { "favoriteId": 5, "routeId": 12 } }
```

## Error

| HTTP | 상황 | message |
| --- | --- | --- |
| `404` | `ROUTE_NOT_FOUND` | 코스를 찾을 수 없습니다. |
| `409` | `ALREADY_FAVORITE` | 이미 즐겨찾기한 코스예요. |

## 클라이언트 참고

- ☆를 누르면 화면을 먼저 바꾸고 요청해요. 실패하면 원래대로 되돌려요. `409`는 성공으로 처리해요.

---

# FAV-03 즐겨찾기 삭제

## 기본 정보

| 항목 | 내용 |
| --- | --- |
| Method | `DELETE` |
| Path | `/favorites/{favoriteId}` |
| 인증 | 필요 |
| Content-Type | — |

## Success Response

**204 No Content**

## Error

| HTTP | 상황 | message |
| --- | --- | --- |
| `404` | `FAVORITE_NOT_FOUND` | 즐겨찾기를 찾을 수 없습니다. |

> ❓ 앱은 코스 id만 알 때가 많아요. `DELETE /favorites?routeId=12`도 받아 주면 FAV-01을 다시 안 불러도 돼요.

---

# BADGE-01 배지 목록 조회

## 기본 정보

| 항목 | 내용 |
| --- | --- |
| Method | `GET` |
| Path | `/badges` |
| 인증 | 필요 |
| Content-Type | `application/json` |

전체 배지와 내 획득 여부. 배지 화면(획득/미획득 탭)과 "배지 n / 6 획득"에 써요.

## Success Response

**200 OK**

```json
{
  "code": "SUCCESS",
  "message": "조회되었습니다.",
  "data": [
    {
      "badgeId": 1,
      "name": "첫 걸음",
      "description": "첫 활동을 기록했어요",
      "imageUrl": null,
      "earned": true,
      "earnedAt": "2026-11-09T08:35:00+09:00"
    }
  ]
}
```

| 필드 | 타입 | Nullable | 설명 |
| --- | --- | --- | --- |
| `data[].imageUrl` | String | Y | null이면 앱에 넣어 둔 배지 그림을 순서대로 써요 |
| `data[].earned` | Boolean | N | 획득 여부 |
| `data[].earnedAt` | DateTime | Y | 획득 시각 |

> ❓ 배지 이름·획득 기준은 기획에서 정해 주세요. 앱 임시 기준: 첫 활동 / 누적 10km / 활동 10회 / 세 활동 모두 / 누적 50km / 10일 연속.

---

# WEATHER-01 현재 날씨 조회

## 기본 정보

| 항목 | 내용 |
| --- | --- |
| Method | `GET` |
| Path | `/weather/current` |
| 인증 | 필요 |
| Content-Type | `application/json` |

기상청 초단기실황(기온·강수) + 초단기예보(하늘 상태, 6시간). 날씨 탭에 써요. 격자 변환(위경도 → nx, ny)은 서버에서 해 주세요.

### Query Parameters

| 필드 | 타입 | 필수 | 기본값 | 설명 |
| --- | --- | --- | --- | --- |
| `latitude` | Number | Y | — | 위도 (위치 권한이 없으면 앱은 월촌교 37.3245) |
| `longitude` | Number | Y | — | 경도 (127.2355) |

## Success Response

**200 OK**

```json
{
  "code": "SUCCESS",
  "message": "조회되었습니다.",
  "data": {
    "locationName": "처인구 모현읍",
    "observedAt": "2026-11-09T14:00:00+09:00",
    "temperature": 12.3,
    "sky": "CLOUDY",
    "skyLabel": "구름 많음",
    "precipitationType": "NONE",
    "precipitationMm": 0,
    "hourly": [
      { "forecastAt": "2026-11-09T15:00:00+09:00", "temperature": 13, "sky": "CLOUDY", "precipitationProbability": 10 }
    ]
  }
}
```

| 필드 | 타입 | Nullable | 설명 |
| --- | --- | --- | --- |
| `data.sky` | String | Y | `CLEAR` · `PARTLY_CLOUDY` · `CLOUDY` · `OVERCAST` |
| `data.precipitationType` | String | Y | `NONE` · `RAIN` · `RAIN_SNOW` · `SNOW` · `SHOWER` |
| `data.hourly` | Array | N | 앞으로 최대 6시간 (없으면 `[]`) |
| `data.hourly[].precipitationProbability` | Number | Y | 강수 확률 %. 초단기예보에 없으면 단기예보 값이나 null |

## Error

| HTTP | 상황 | message |
| --- | --- | --- |
| `503` | `WEATHER_UNAVAILABLE` 기상청 응답 실패 | 날씨 정보를 잠시 불러올 수 없어요. |

---

# NOTI-01 알림 목록 조회

## 기본 정보

| 항목 | 내용 |
| --- | --- |
| Method | `GET` |
| Path | `/notifications` |
| 인증 | 필요 |
| Content-Type | `application/json` |

알림 화면(전체 / 읽지 않음, 오늘 / 이전). 수위 회복 예측 알림(F-10)이 여기로 와요.

### Query Parameters

| 필드 | 타입 | 필수 | 기본값 | 설명 |
| --- | --- | --- | --- | --- |
| `page` | Number | N | `0` | 페이지 |
| `size` | Number | N | `30` | 개수 |

## Success Response

**200 OK**

```json
{
  "code": "SUCCESS",
  "message": "조회되었습니다.",
  "data": {
    "content": [
      {
        "notificationId": 41,
        "type": "RECOVERY",
        "level": "INFO",
        "title": "회복 예측이 나왔어요",
        "body": "월촌교 하천길은 오후 3시쯤 다시 이용할 수 있을 것으로 예상돼요.",
        "trailId": 3,
        "routeId": 12,
        "createdAt": "2026-11-09T12:10:00+09:00",
        "read": false
      }
    ],
    "page": 0,
    "size": 30,
    "hasNext": false
  }
}
```

### 값 및 처리 규칙

| 항목 | 값 | 설명 |
| --- | --- | --- |
| `type` | `RIVER_STATUS` | 즐겨찾기 하천길 상태가 이용 위험·공식 통제로 바뀜 |
| `type` | `RECOVERY` | 즐겨찾기 하천길 회복 예측 (F-10) — 회복 예측 시각이 처음 나오거나 크게 바뀔 때 |
| `type` | `ACTIVITY` | 활동 기록 저장 |
| `type` | `SERVICE` | 서비스 소식·환영 |
| `level` | `DANGER` · `INFO` | `DANGER`는 빨간 카드로 보여줘요 |

> 회복 예측 알림은 **공식 통제 해제와 다르다는 문구**를 본문에 넣어 주세요. (예: "공식 통제가 풀렸는지 함께 확인해 주세요")
> 알림 설정(NOTI-03)에서 끈 종류는 만들지 않아요.

---

# NOTI-02 알림 읽음 처리

| 항목 | 내용 |
| --- | --- |
| Method | `PATCH` |
| Path | `/notifications/{notificationId}/read` |
| 인증 | 필요 |
| Content-Type | — |

**Success:** 204 No Content · **Error:** 404 `NOTIFICATION_NOT_FOUND`

---

# NOTI-07 (추가 요청) 알림 모두 읽음

| 항목 | 내용 |
| --- | --- |
| Method | `PATCH` |
| Path | `/notifications/read-all` |
| 인증 | 필요 |
| Content-Type | — |

알림 화면을 나갈 때 한 번에 읽음 처리해요. 없으면 안 읽은 알림 수만큼 NOTI-02를 보내요.

**Success:** 204 No Content

---

# NOTI-03 알림 설정 조회 / NOTI-04 알림 설정 변경

| 항목 | 내용 |
| --- | --- |
| Method | `GET` / `PATCH` |
| Path | `/notification-settings` |
| 인증 | 필요 |
| Content-Type | `application/json` |

### Request Body (PATCH, 바꿀 것만)

```json
{ "activityEnabled": false }
```

## Success Response (GET·PATCH 같음)

**200 OK**

```json
{
  "code": "SUCCESS",
  "message": "조회되었습니다.",
  "data": {
    "riverStatusEnabled": true,
    "activityEnabled": true,
    "serviceNewsEnabled": false
  }
}
```

| 필드 | 타입 | Nullable | 설명 |
| --- | --- | --- | --- |
| `riverStatusEnabled` | Boolean | N | 하천 상태 변화 + 회복 예측 (기본 true) |
| `activityEnabled` | Boolean | N | 활동 기록 (기본 true) |
| `serviceNewsEnabled` | Boolean | N | 서비스 소식 (기본 false) |

---

# NOTI-05 푸시 기기 등록

## 기본 정보

| 항목 | 내용 |
| --- | --- |
| Method | `POST` |
| Path | `/devices` |
| 인증 | 필요 |
| Content-Type | `application/json` |

### Request Body

```json
{ "pushToken": "ExponentPushToken[xxxxxxxx]", "platform": "ANDROID" }
```

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `pushToken` | String | Y | Expo 푸시 토큰 |
| `platform` | String | Y | `ANDROID` · `IOS` |

> 같은 `pushToken`이 다시 오면 새로 만들지 말고 기존 기기를 돌려주세요. (앱을 켤 때마다 보내요)
> 다른 회원이 같은 토큰으로 등록하면 이전 회원 연결은 끊어 주세요. (한 폰에서 계정 바꾸기)

## Success Response

**201 Created**

```json
{ "code": "SUCCESS", "message": "등록되었습니다.", "data": { "deviceId": 7 } }
```

## 클라이언트 참고

- ⚠ 안드로이드 Expo Go에서는 푸시 토큰을 받을 수 없어요. **개발용 빌드(EAS)부터** 실제로 등록돼요.

---

# NOTI-06 푸시 기기 해제

| 항목 | 내용 |
| --- | --- |
| Method | `DELETE` |
| Path | `/devices/{deviceId}` |
| 인증 | 필요 |
| Content-Type | — |

로그아웃 직전에 불러요. **Success:** 204 No Content · 이미 없으면 404 대신 204로 주세요.

---

# USER-03 프로필 사진 변경

## 기본 정보

| 항목 | 내용 |
| --- | --- |
| Method | `POST` |
| Path | `/users/me/photo` |
| 인증 | 필요 |
| Content-Type | `multipart/form-data` |

### Request (multipart)

| 파트 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `image` | File | Y | JPEG·PNG, 앱이 정사각형으로 잘라 품질 0.7로 보내요 |

### 값 및 처리 규칙

| 항목 | 값 또는 조건 | 설명 |
| --- | --- | --- |
| 크기 | 5MB 이하 | 넘으면 413 |
| 형식 | `image/jpeg`, `image/png` | 그 밖은 400 |

## Success Response

**200 OK**

```json
{ "code": "SUCCESS", "message": "프로필 사진이 변경되었습니다.", "data": { "profileImageUrl": "https://.../members/1/profile.jpg" } }
```

## Error

| HTTP | 상황 | message |
| --- | --- | --- |
| `400` | `INVALID_IMAGE` | 사진 형식을 확인해 주세요. |
| `413` | `IMAGE_TOO_LARGE` | 5MB 이하 사진을 올려 주세요. |

## 클라이언트 참고

- 성공하면 USER-01을 다시 불러 프로필을 갱신해요.
- ❓ **USER-03b (추가 요청) `DELETE /users/me/photo`** → 204: "기본 이미지로 변경"용

---

# MAP-04 하천길 상태 조회 — 추가 필드 요청

이미 있는 API에 아래 필드를 더해 주세요.

```json
{
  "trend": "FALLING",
  "recoveryEtaMinutes": 240,
  "recoveryEtaRange": { "minMinutes": 180, "maxMinutes": 300 },
  "timeline": [
    { "at": "2026-07-18T06:00:00+09:00", "source": "OFFICIAL", "title": "공식 출입 통제 시작", "detail": "용인시 하천 통제 공지" },
    { "at": "2026-07-18T09:00:00+09:00", "source": "OBSERVED", "title": "관심 수위 넘음", "detail": "월촌교 수위 4.78m" },
    { "at": "2026-07-18T09:10:00+09:00", "source": "AI", "title": "회복 예측", "detail": "7월 20일 오후 3시쯤" }
  ]
}
```

| 필드 | 타입 | Nullable | 설명 |
| --- | --- | --- | --- |
| `trend` | String | Y | `RISING` · `FALLING` · `STEADY` |
| `recoveryEtaMinutes` | Number | Y | 회복(참고 수위 아래)까지 남은 분. 오르는 중이거나 추정 불가면 null, 이미 회복이면 0 (F-03) |
| `recoveryEtaRange` | Object | Y | `{ minMinutes, maxMinutes }` (앱은 범위 폭으로 불확실성 낮음·보통·높음 표시) |
| `recoveryUnavailableReason` | String | Y | 추정 불가 이유 (예: "연결된 수위관측소가 없어요") |
| `timeline` | Array | N | 근거 타임라인 (F-05), 오래된 순, 최근 72시간 |
| `timeline[].source` | String | N | `OFFICIAL` 공식 · `OBSERVED` 관측 · `AI` AI 분석 |

---

## 부록: 앱이 이미 맞춰 둔 것

| API | 앱 파일 |
| --- | --- |
| ACT·FAV·BADGE·WEATHER·NOTI·USER-03 | `src/api/me.js` |
| MAP-04 회복 예측 | `src/api/trails.js` (`fromRecovery`) |
| 서버 주소 | `.env` → `EXPO_PUBLIC_USE_MOCK=false`, `EXPO_PUBLIC_API_BASE=https://서버주소/api` |
