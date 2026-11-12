// 행정안전부 침수흔적도 → 구간별 과거 침수 이력
// 데이터: src/data/floodHistory.json (scripts/build_flood_history.py 로 생성)
// 구간 좌표를 실제 산책로로 바꾸면 스크립트를 다시 실행하세요.
import data from '../data/floodHistory.json';

export const FLOOD_SOURCE = data.source;
export const FLOOD_NOTE = data.note;

/** 구간의 과거 침수 이력. 기록이 없으면 { count: 0, events: [], polygons: [] } */
export function getFloodHistory(segmentId) {
  return data.segments[segmentId] ?? { count: 0, events: [], polygons: [], max_depth_m: null };
}

export function hasFloodHistory(segmentId) {
  return getFloodHistory(segmentId).count > 0;
}

/** '2022-08-09T07:00' → '2022년 8월' */
export function eventMonth(iso) {
  const [y, m] = iso.split('-');
  return `${y}년 ${Number(m)}월`;
}
