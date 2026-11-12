# 이리로 (React Native + Expo)

용인 경안천 산책로의 구간별 상태와 이용 여건 회복 시점을 알려주는 앱입니다. 기능명세서 MVP v0.1 기준.
Expo SDK 58 · React Native 0.88 · Expo Router.

## 폰에서 실행하기 (처음 한 번)

1. 컴퓨터에 [Node.js](https://nodejs.org) LTS 설치
2. 갤럭시에 **Expo Go** 앱 설치 (Play 스토어)
3. 이 폴더에서 터미널:
   ```bash
   npm install
   npx expo start
   ```
4. 터미널에 뜬 **QR 코드를 Expo Go 앱으로 스캔** → 앱이 열립니다.
   - 컴퓨터와 폰이 **같은 와이파이**여야 합니다.
   - 학교·카페 와이파이처럼 연결이 안 되면 `npx expo start --tunnel` (처음 실행 시 추가 설치를 물어보면 y)
5. 코드를 저장하면 폰 화면이 바로 바뀝니다. 폰을 흔들면 개발 메뉴(새로고침 등)가 나와요.

> Expo Go가 "SDK 버전이 맞지 않는다"고 하면 Play 스토어에서 Expo Go를 최신으로 업데이트하세요.

## 폴더 구조

```
src/
  app/               ← 화면(라우트). 파일 하나 = 탭 하나
    _layout.jsx        하단 탭 4개 정의
    index.jsx          지도 탭  (F-04 상태, F-08 유형 탭·추천 경로, 구간 상세)
    record.jsx         기록 탭  (F-08 GPS 기록, 시연 모드)
    report.jsx         제보 탭  (F-06 카메라·위치·설명, 미확인 등록)
    my.jsx             MY 탭   (F-10 즐겨찾기, F-09 알림 자리, F-12 배지, 시연 모드 설정)
  components/        ← 화면 조각 (RiverMap, SegmentSheet, WaterChart, RoutePanel, ReplayBar, ui)
  context/AppState.jsx  탭끼리 공유하는 상태 (기준 시각, 선택 구간, 경로, 즐겨찾기)
  api/client.js      ← 화면이 호출하는 유일한 API 진입점 (목업 ↔ 실제 전환)
  mock/              ← 목업 데이터·가짜 API (웹 버전과 동일 로직)
  constants/         ← 색상(theme.js), 상태·출처 라벨(status.js)
  lib/               ← 시간, 좌표 계산, 기기 저장소(kv.js)
```

## 기능명세 반영 상태

| ID | 기능 | 위치 | 상태 |
| --- | --- | --- | --- |
| F-04 | 구간 상태 4단계(양호·주의·통제·정보 부족) | 지도 탭 | 목업 연결 |
| F-03 | 회복 시점 추정(예상 시각·범위·불확실성·근거) | 구간 상세 | 목업 연결 |
| F-05 | 근거 타임라인(공식·관측·시민 출처 구분) | 구간 상세 | 목업 연결 |
| F-08 | 산책·러닝·자전거 탭, 추천 경로(통제 구간 제외), GPS 기록 | 지도·기록 탭 | 목업 연결 |
| F-06 | 시민 제보(카메라/앨범, 지도 핀 위치, 설명) | 제보 탭 | 목업 연결(기기 저장) |
| F-10 | 즐겨찾기 | 구간 상세 ☆, MY | 기기 저장 |
| F-12 | 배지 | MY | 첫 활동·누적 거리만 |
| F-09 | 회복 알림 | MY | 준비 중 |

화면 규칙: 공식 통제 우선 · 데이터 없으면 '정보 부족'(양호로 보지 않음) · 출처를 색 칩으로 구분 · 참고 수위 없으면 회복 시각 미제공 · 통제 구간 경로는 추천 제외 · 제보는 항상 '미확인'으로 등록 · GPS는 동의 후에만.

## 실제 API로 전환

프로젝트 루트에 `.env` 파일:
```
EXPO_PUBLIC_USE_MOCK=false
EXPO_PUBLIC_API_BASE=https://백엔드주소/api
```
- 폰에서 실행하므로 `localhost`는 안 됩니다. 백엔드는 같은 와이파이의 컴퓨터 IP(`http://192.168.x.x:8000/api`)나 배포 주소를 쓰세요.
- 시연 당일 API가 불안하면 `EXPO_PUBLIC_USE_MOCK=true`로 되돌리면 시연 모드 그대로 동작합니다.
- 응답 형식은 웹 버전 README의 "백엔드와 맞출 API 명세"와 같습니다 (`GET /map`, `GET /segments/{id}`, `GET /routes`, `GET·POST /reports`).
  - 제보 사진은 앱에서 가로 800px JPEG로 줄인 **파일 경로(uri)** 로 넘어옵니다. 실제 연결 시 `client.js`의 `createReport`를 multipart 업로드로 바꾸면 됩니다.

## 알아둘 점

- **화면이 꺼지면 GPS 기록이 멈춥니다.** 백그라운드 기록이 필요하면 `expo-location`의 백그라운드 위치 + `expo-task-manager`를 추가해야 하고, 그때부터는 Expo Go 대신 개발 빌드가 필요합니다.
- 지도는 `react-native-maps`(안드로이드는 Google 지도)입니다. Expo Go에서는 키 없이 되지만, **APK로 빌드할 때는 Google Maps API 키**를 `app.json`의 `android.config.googleMaps.apiKey`에 넣어야 합니다.
- 구간 좌표·관측소·참고 수위·추천 경로는 `src/mock/data.js`의 임시값입니다.

## APK 만들기 (발표용 설치 파일)

```bash
npx eas-cli@latest login        # expo.dev 무료 계정
npx eas-cli@latest build -p android --profile preview
```
처음 실행 시 설정 파일(`eas.json`)을 만들지 물어보면 y. 빌드는 Expo 클라우드에서 되고, 끝나면 APK 다운로드 링크가 나옵니다. (Android Studio 불필요)
