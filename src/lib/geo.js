// [위도, 경도] 배열 ↔ react-native-maps 좌표 객체
export const toLatLng = ([latitude, longitude]) => ({ latitude, longitude });
export const toLatLngs = (path) => path.map(toLatLng);
/** 길의 가운데 지점 (거리 기준) */
export const midPoint = (path) => (path?.length > 1 ? pointAlong(path, pathKm(path) / 2) : (path?.[0] ?? null));

// 두 좌표 사이 거리 (km)
export function haversineKm([lat1, lon1], [lat2, lon2]) {
  const R = 6371;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function pathKm(pts) {
  let km = 0;
  for (let i = 1; i < pts.length; i++) km += haversineKm(pts[i - 1], pts[i]);
  return km;
}

// 경로 위에서 시작점부터 km만큼 이동한 좌표 (끝을 넘으면 null)
export function pointAlong(path, km) {
  let left = km;
  for (let i = 1; i < path.length; i++) {
    const d = haversineKm(path[i - 1], path[i]);
    if (left <= d) {
      const r = d === 0 ? 0 : left / d;
      return [path[i - 1][0] + (path[i][0] - path[i - 1][0]) * r, path[i - 1][1] + (path[i][1] - path[i - 1][1]) * r];
    }
    left -= d;
  }
  return null;
}

export function formatDuration(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const p = (n) => String(n).padStart(2, '0');
  return h ? `${h}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
}

export function formatPace(sec, km) {
  if (km < 0.05) return '--';
  const spk = sec / km;
  return `${Math.floor(spk / 60)}'${String(Math.round(spk % 60)).padStart(2, '0')}"`;
}

// 경로 위에서 주어진 점과 가장 가까운 지점 (짧은 거리라 위경도를 평면처럼 계산)
// → { point: [lat, lon], index: 그 지점이 놓인 선분의 시작 꼭짓점 번호 }
export function nearestOnPath(path, [lat, lon]) {
  const kx = Math.cos((lat * Math.PI) / 180);
  let best = { d: Infinity, point: path[0], index: 0 };
  for (let i = 1; i < path.length; i++) {
    const [ay, ax] = path[i - 1];
    const [by, bx] = path[i];
    const dx = (bx - ax) * kx;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 ? Math.max(0, Math.min(1, (((lon - ax) * kx) * dx + (lat - ay) * dy) / len2)) : 0;
    const py = ay + dy * t;
    const px = ax + (bx - ax) * t;
    const d = ((lon - px) * kx) ** 2 + (lat - py) ** 2;
    if (d < best.d) best = { d, point: [py, px], index: i - 1 };
  }
  return best;
}

/** 경로를 지점(nearestOnPath 결과)에서 잘라 그 뒤쪽만 */
export const pathFrom = (path, at) => [at.point, ...path.slice(at.index + 1)];

/** 경로에서 fromKm ~ toKm 구간만 잘라내기 */
export function subPath(path, fromKm, toKm) {
  const out = [];
  let acc = 0;
  for (let i = 0; i < path.length; i++) {
    if (i > 0) acc += haversineKm(path[i - 1], path[i]);
    if (acc > fromKm && acc < toKm) out.push(path[i]);
  }
  const a = pointAlong(path, fromKm) ?? path[0];
  const b = pointAlong(path, toKm) ?? path[path.length - 1];
  return [a, ...out, b];
}
