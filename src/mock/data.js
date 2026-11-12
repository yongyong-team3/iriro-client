// ⚠️ 목업 데이터 (기능명세서 MVP v0.1 기준)
// - path 좌표는 위치를 대략 맞춘 임시 좌표입니다. 실제 산책로를 따라 다시 찍어 교체하세요. [위도, 경도] 순서.
// - station: 구간과 연결된 수위관측소. null 이면 "연결 불확실 → 추정에 사용하지 않음"(F-01 예외 규칙).
// - thresholds: 참고 수위. null 이면 "기준 수위 미확보 → 회복 시각 미제공"(F-03 예외 규칙).
// - sim / closure 는 목업 곡선·통제 시나리오용이라 실제 API 연결 후엔 쓰지 않습니다.

export const REPLAY_START = '2024-07-17T00:00';
export const REPLAY_HOURS = 96;
export const REPLAY_DEFAULT = '2024-07-18T09:00';

export const STATIONS = {
  'ST-GY-01': { id: 'ST-GY-01', name: '경안천 김량장 수위관측소(가칭)' },
  'ST-GY-02': { id: 'ST-GY-02', name: '경안천 유방 수위관측소(가칭)' },
  // 실제 관측소: 한강홍수통제소 용인시(월촌교) 1016607 · 처인구 모현읍 갈담리 · 영점표고 49.553 EL.m
  WOLCHON: { id: '1016607', name: '월촌교 수위관측소', position: [37.3325, 127.23944], official: true }, // 좌표: WAMIS 관측소 제원
};

// 강수 시나리오 (시간당 mm) — 17일 오후~18일 새벽 집중호우
export const RAIN = [
  { from: 14, to: 18, mm: 6 },
  { from: 18, to: 24, mm: 18 },
  { from: 24, to: 28, mm: 32 },
  { from: 28, to: 30, mm: 9 },
];

export const RIVER = {
  id: 'gyeongan',
  name: '경안천',
  district: '처인구',
  center: [37.278, 127.222],
  segments: [
    {
      id: 'gy-01',
      name: '해곡동 ~ 김량장동',
      lengthKm: 2.1,
      bikePath: true,
      path: [[37.2245, 127.1955], [37.229, 127.199], [37.2335, 127.2035]],
      station: 'ST-GY-01',
      thresholds: { interest: 2.5, caution: 3.5 },
      sim: { base: 1.0, peak: 3.0, peakHour: 30, rise: 6, decay: 18 },
    },
    {
      id: 'gy-02',
      name: '김량장동 ~ 마평교',
      lengthKm: 1.6,
      bikePath: true,
      path: [[37.2335, 127.2035], [37.238, 127.208], [37.242, 127.211]],
      station: 'ST-GY-01',
      thresholds: { interest: 2.5, caution: 3.5 },
      sim: { base: 1.1, peak: 3.4, peakHour: 30, rise: 6, decay: 22 },
    },
    {
      id: 'gy-03',
      name: '마평교 ~ 유방교',
      lengthKm: 1.7,
      bikePath: true,
      path: [[37.242, 127.211], [37.248, 127.214], [37.254, 127.217]],
      station: 'ST-GY-02',
      thresholds: { interest: 2.5, caution: 3.5 },
      sim: { base: 1.2, peak: 4.6, peakHour: 31, rise: 6, decay: 45 },
      // 공식 통제: 수위가 주의 수위를 넘으면 통제, 관심 수위 아래로 내려간 뒤 점검(+8시간) 후 해제
      closure: { inspectHours: 8, reason: '하천 수위 상승에 따른 산책로 출입 통제' },
    },
    {
      id: 'gy-04',
      name: '유방교 ~ 둔전',
      lengthKm: 3.4,
      bikePath: true,
      path: [[37.254, 127.217], [37.265, 127.221], [37.276, 127.225]],
      station: 'ST-GY-02',
      thresholds: { interest: 2.8, caution: 3.8 },
      sim: { base: 1.3, peak: 3.9, peakHour: 33, rise: 7, decay: 32 },
      closure: { inspectHours: 4, reason: '하천 수위 상승에 따른 산책로 출입 통제' },
    },
    {
      id: 'gy-05',
      name: '둔전 ~ 포곡 둔전생태공원',
      lengthKm: 2.3,
      bikePath: false,
      path: [[37.276, 127.225], [37.284, 127.229], [37.291, 127.234]],
      station: null, // 관측소 연결 불확실 → 정보 부족
      thresholds: null,
      sim: null,
    },
    // ── 포곡~모현(월촌교) : 경로는 OpenStreetMap 경안천 하천 중심선(way 160461741)을 따라 잡은 임시 좌표
    //    실제 산책로는 하천 옆 둔치·제방에 있으니 현장 좌표로 교체하세요.
    {
      id: 'gy-06',
      name: '포곡 둔전 ~ 포곡 북부 수변',
      lengthKm: 3.0,
      bikePath: false,
      path: [[37.29086, 127.23393], [37.2923, 127.2342], [37.29375, 127.23398], [37.29432, 127.23364], [37.29499, 127.23295], [37.29585, 127.23232], [37.29715, 127.23146], [37.29837, 127.23063], [37.29881, 127.23033], [37.29988, 127.23004], [37.30108, 127.23022], [37.3019, 127.23055], [37.3027, 127.23089], [37.3033, 127.23133], [37.3037, 127.23196], [37.30396, 127.23236], [37.30425, 127.23265], [37.30488, 127.23296], [37.30508, 127.23299], [37.30619, 127.23316], [37.3073, 127.23346], [37.30839, 127.23406], [37.30993, 127.23531], [37.31151, 127.23632], [37.31313, 127.23768], [37.31368, 127.23804], [37.31405, 127.23828], [37.31486, 127.23875], [37.31553, 127.23885]],
      station: 'WOLCHON',
      // 참고 수위 = 월촌교 공식 기준(한강홍수통제소): 관심 1.5m · 주의 4.5m · 경계 5.0m · 심각 6.7m
      thresholds: { interest: 1.5, caution: 4.5 },
      sim: { base: 0.95, peak: 3.4, peakHour: 32, rise: 7, decay: 30 },
    },
    {
      id: 'gy-07',
      name: '포곡 북부 ~ 모현 월촌교',
      lengthKm: 2.2,
      bikePath: false,
      path: [[37.31553, 127.23885], [37.31631, 127.23847], [37.31817, 127.23665], [37.32003, 127.23493], [37.32257, 127.23386], [37.32361, 127.23373], [37.32511, 127.2342], [37.32643, 127.2347], [37.32738, 127.23506], [37.3281, 127.23543], [37.3292, 127.2355], [37.32996, 127.23581], [37.33075, 127.23655], [37.33159, 127.23767], [37.33258, 127.23973]],
      station: 'WOLCHON',
      thresholds: { interest: 1.5, caution: 4.5 },
      sim: { base: 0.95, peak: 4.9, peakHour: 32, rise: 6, decay: 40 },
      closure: { inspectHours: 6, reason: '하천 수위 상승에 따른 산책로 출입 통제' },
    },
  ],
};

// F-08 이용 유형별 추천 후보 경로
export const ROUTES = [
  {
    id: 'r-walk-1',
    name: '김량장 수변 짧은 산책',
    activities: ['walk'],
    segments: ['gy-02'],
    distanceKm: 1.6,
    tags: ['평지', '화장실 가까움'],
  },
  {
    id: 'r-walk-2',
    name: '마평교~유방교 수변길',
    activities: ['walk', 'run'],
    segments: ['gy-03'],
    distanceKm: 1.7,
    tags: ['평지'],
  },
  {
    id: 'r-walk-3',
    name: '둔전생태공원 숲길 산책',
    activities: ['walk'],
    segments: ['gy-05'],
    distanceKm: 2.3,
    tags: ['그늘 많음'],
  },
  {
    id: 'r-walk-4',
    name: '포곡~모현 월촌교 수변길',
    activities: ['walk', 'run'],
    segments: ['gy-06', 'gy-07'],
    distanceKm: 5.2,
    tags: ['과거 침수 이력', '월촌교 관측소'],
  },
  {
    id: 'r-run-1',
    name: '해곡~마평 왕복 5km',
    activities: ['run'],
    segments: ['gy-01', 'gy-02'],
    distanceKm: 5.0,
    roundTrip: true,
    tags: ['왕복', '평지'],
  },
  {
    id: 'r-run-2',
    name: '마평~둔전 10km 왕복',
    activities: ['run'],
    segments: ['gy-03', 'gy-04'],
    distanceKm: 10.2,
    roundTrip: true,
    tags: ['왕복', '장거리'],
  },
  {
    id: 'r-bike-1',
    name: '경안천 자전거길 전 구간',
    activities: ['bike'],
    segments: ['gy-01', 'gy-02', 'gy-03', 'gy-04'],
    distanceKm: 8.8,
    tags: ['자전거도로'],
  },
  {
    id: 'r-bike-2',
    name: '해곡~마평 자전거 코스',
    activities: ['bike'],
    segments: ['gy-01', 'gy-02'],
    distanceKm: 3.7,
    tags: ['자전거도로', '초보 추천'],
  },
];

// F-06 시민 제보 초기 목업 (상태: unverified 미확인 / verified 확인됨)
export const SEED_REPORTS = [
  {
    id: 'rp-1',
    segmentId: 'gy-03',
    type: 'debris',
    description: '유방교 아래 산책로에 진흙이 쌓여 있어요',
    position: [37.2525, 127.2163],
    createdAt: '2024-07-18T07:20',
    status: 'unverified',
    photo: null,
  },
  {
    id: 'rp-2',
    segmentId: 'gy-04',
    type: 'puddle',
    description: '둔전 방향 저지대 물웅덩이',
    position: [37.2655, 127.2212],
    createdAt: '2024-07-18T08:10',
    status: 'verified',
    photo: null,
  },
];

export const REPORT_TYPES = {
  flood: { label: '침수·물 고임', icon: '💧' },
  puddle: { label: '물웅덩이', icon: '🫧' },
  debris: { label: '토사·진흙', icon: '🟫' },
  facility: { label: '시설 파손', icon: '🚧' },
  tree: { label: '쓰러진 나무', icon: '🌳' },
  etc: { label: '기타 통행 불편', icon: '⚠️' },
};
