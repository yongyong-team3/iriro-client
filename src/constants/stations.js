// 실제 수위관측소 (한강홍수통제소)
export const WOLCHON_STATION = {
  code: '1016607',
  name: '월촌교 수위관측소',
  address: '용인시 처인구 모현읍 갈담리',
  // WAMIS 관측소 제원: 위도 37-19-57, 경도 127-14-22 (초 단위라 약 30m 오차)
  position: [37.3325, 127.23944],
  zeroElevationM: 49.553, // 영점표고 (수위 0m의 해발 높이)
  benchmarkElevationM: 56.949, // 수준거표고
  observedSince: '2012-10-15',
  catchmentKm2: 149.43,
  levels: { interest: 1.5, caution: 4.5, warning: 5.0, severe: 6.7 }, // 관심·주의·경계·심각 (m)
};
