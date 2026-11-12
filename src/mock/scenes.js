// 시연 장면 — 발표 때 버튼 하나로 넘기는 5개 장면 (목업)
//   평상시(지금, 실시간) → 폭우 → 침수 위험 → 회복 중 → 회복
// 과거 장면은 2024년 7월 18~19일 집중호우 당시를 따라가요. ⚠ 수위 값은 시연용 예시예요.
//   서버 리플레이(dataSource=REPLAY)가 준비되면 이 파일 대신 서버 값을 쓰면 돼요 (화면은 그대로).
// 기준: 1.5m 이상 = 이용 위험 (백엔드 MAP-04 와 같은 기준)
export const SCENES = [
  {
    id: 'live',
    label: '평상시',
    time: null, // 지금 시각
    caption: null,
    wolchon: { status: 'available', trend: 'steady', level: 0.64, predicted: 0.63, weather: { tempC: 21, sky: 'sunny', label: '맑음', rainMm: 0 }, recovery: null },
  },
  {
    id: 'rain',
    label: '폭우',
    time: '2024-07-18T05:00',
    caption: '2024년 7월 18일 새벽 5시 · 폭우가 쏟아지던 때',
    // 아직 기준 아래지만 빠르게 오르는 중 → AI가 1시간 뒤 기준 초과를 예측
    wolchon: {
      status: 'available',
      trend: 'rising',
      level: 1.24,
      predicted: 1.62,
      weather: { tempC: 23, sky: 'rain', label: '강한 비', rainMm: 32 },
      recovery: { available: false, reason: '비가 오는 중이라 회복 시점을 아직 예측하지 않아요' },
    },
  },
  {
    id: 'flood',
    label: '침수 위험',
    time: '2024-07-18T10:00',
    caption: '2024년 7월 18일 오전 10시 · 수위가 가장 높던 때',
    // 비가 잦아들고 수위가 정점을 지남 → 이용 위험 + 우회 코스 + 회복 예측
    wolchon: {
      status: 'flooded',
      trend: 'falling',
      level: 2.31,
      predicted: 2.18,
      weather: { tempC: 22, sky: 'cloudy', label: '흐림 · 비 그침', rainMm: 0 },
      recovery: { available: true, reached: false, atLeast: true, minutes: 420, estimate: '2024-07-18T17:00', basis: '1.5m 미만이 2시간 유지될 때까지 최소 예상 시간' },
    },
  },
  {
    id: 'recovering',
    label: '회복 중',
    time: '2024-07-18T19:00',
    caption: '2024년 7월 18일 저녁 7시 · 물이 빠지던 때',
    // 기준 아래로 내려왔지만 아직 2시간이 안 지남 → 회복 중 (주의하며 이용)
    wolchon: {
      status: 'recovering',
      trend: 'falling',
      level: 1.42,
      predicted: 1.31,
      weather: { tempC: 22, sky: 'cloudy', label: '흐림', rainMm: 0 },
      recovery: { available: true, reached: false, atLeast: true, minutes: 120, estimate: '2024-07-18T21:00', basis: '1.5m 미만이 2시간 유지될 때까지 최소 예상 시간' },
    },
  },
  {
    id: 'recovered',
    label: '회복',
    time: '2024-07-19T08:00',
    caption: '2024년 7월 19일 오전 8시 · 다음 날 아침',
    wolchon: {
      status: 'available',
      trend: 'steady',
      level: 0.82,
      predicted: 0.8,
      weather: { tempC: 24, sky: 'sunny', label: '맑음', rainMm: 0 },
      recovery: { available: true, reached: true },
    },
  },
];
export const THRESHOLD_M = 1.5;
export const sceneById = (id) => SCENES.find((s) => s.id === id) ?? SCENES[0];
/** 기준 시각 → 장면 (과거 장면 시각이 아니면 '평상시') */
export const sceneAt = (time) => SCENES.find((s) => s.time && s.time === time) ?? SCENES[0];
