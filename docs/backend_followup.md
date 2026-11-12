# [프론트 → 백엔드] 상세 명세 반영 결과 · 남은 확인 사항 (2026-11-09)

받은 상세 명세 **MAP-01~08 · ACT-01~05 · FAV-01~03 · BADGE-01 · WEATHER-01 · NOTI-01~06** 그대로 앱에 연결했어요.
(앞서 보낸 `api_spec_draft.md` 초안은 이 명세로 대체돼요.)

## ✅ 명세대로 맞춘 것

| API | 앱 반영 |
| --- | --- |
| MAP-01·02 | `GET /trails?latitude&longitude` / 검색은 `?query=` (`/trails/search` 안 씀) |
| MAP-04 | `waterStatus` NORMAL→이용 가능 · HIGH_WATER→이용 위험 · UNKNOWN→확인 불가. `recoveryEtaAtLeastMinutes` → "최소 4시간 뒤 회복 예상 · 오후 4시 이후". `RISING`·`RAINING`·`INSUFFICIENT_DATA`는 이유 문구. `STALE`·`REPLAY`·`notice` 표시 |
| MAP-05·08 | 코스 `geometry`로 선 그리기, **지정 출발점(startPoints)만 선택** (지도에 출발점 표시, 누른 곳에서 가장 가까운 출발점) |
| MAP-06 | `GET /routes/{routeId}/detours`, 추가 거리는 `extraDistanceMeters` 사용 |
| MAP-07 | 시작 직전 `?startPointId=` 호출, `warnings`를 확인창으로 보여줌 |
| ACT-01 | `Idempotency-Key`(UUID, 기록마다 하나) · `routeId`·`startPointId` · `trackPoints`(점마다 `recordedAt`) · `saveAsFavorite` |
| ACT-02~05 | `month=YYYY-MM`, `size=100`, `elapsedSeconds`, `daily`, `activityDates`, `currentStreakDays` |
| FAV | `{ favorites: [...] }`, 같은 코스 재저장 → 기존 id |
| BADGE-01 | 3종(첫 활동·활동 5회·누적 10km), 미획득은 진행도 "1 / 5회" 표시 |
| WEATHER-01 | `temperatureCelsius`, `condition`, `areaName` |
| NOTI | 회복 예측 알림만 · 설정은 `recoveryForecastEnabled` 스위치 하나 · 기기 등록 `installationId`(앱 설치별 UUID) |

## ❓ 남은 확인 · 요청

| # | 항목 | 내용 |
| --- | --- | --- |
| 1 | **USER-03 프로필 사진** | 아직 빈 템플릿이에요. 프론트 가정: `POST /users/me/photo` multipart, 파일 필드 `image` → `{ profileImageUrl }`. 사진 삭제(기본 이미지로)도 필요하면 `DELETE /users/me/photo` |
| 2 | **수위·AI (RIVER-01~03)** | 상세 명세 미수신. 앱은 지금 MAP-04만으로 수위·예측을 보여줘서 당장은 없어도 돼요. 수위 그래프를 넣을 때 필요 |
| 3 | **HIGH_WATER에서 기록 시작** | MAP-07은 시작을 허용(경고만)하는데, **앱은 이용 위험이면 시작 대신 '우회 코스 확인'으로 보내요** (안전 우선). 이 규칙으로 가도 될지 확인해 주세요 |
| 4 | 시연 모드 기록 | 앱의 시연 모드(가상 이동) 기록도 ACT-01로 저장돼요. 명세에 구분 필드가 없어서 통계·배지에 섞여요. `simulated` 필드를 받거나, 시연 기록은 저장하지 않게 할지 정해 주세요 |
| 5 | 누적 활동 시간 | 기록 탭 "전체 활동" 카드에 누적 시간이 있는데 USER-01에 없어요 → `totalElapsedSeconds` 추가 요청 (지금은 "—") |
| 6 | 시간별 날씨 | WEATHER-01에 없어서 서버 모드에서는 시간별 예보 칸을 숨겨요. 필요하면 `hourly` 추가 |
| 7 | 알림 모두 읽음 | 없어서 안 읽은 알림만 NOTI-02로 하나씩 보내요 (알림이 적어서 괜찮음) |
| 8 | 근거 타임라인 (F-05) | MAP-04에 `timeline` 배열이 있으면 화면에 붙일게요 |
| 9 | 공식 통제 | 아직 미연동(`officialControlStatus=null`)이라 앱은 "정보 미확인"으로 표시해요 |
| 10 | 기록 목록 하천길 이름 | ACT-02·03에 `routeName`만 있어서 목록에 "산책 · 월촌교 산책 코스"로 보여요. `trailName`도 주면 더 좋아요 |

## 프론트 확인 방법

`.env`에 아래를 넣고 `npx expo start -c`

```
EXPO_PUBLIC_USE_MOCK=false
EXPO_PUBLIC_API_BASE=http://<서버 IP>:<포트>/api
```
- 폰에서 실행하므로 `localhost`는 안 돼요. 같은 와이파이의 PC IP나 배포 주소를 주세요.
