// 화면은 이 파일의 함수만 호출합니다. (웹 버전과 동일한 API 명세)
// 백엔드가 준비되면 프로젝트 루트 .env 에:
//   EXPO_PUBLIC_USE_MOCK=false
//   EXPO_PUBLIC_API_BASE=https://백엔드주소/api
// 시연 중 API가 불안하면 EXPO_PUBLIC_USE_MOCK=true 로 되돌리면 시연 모드 그대로 동작합니다.

import * as mock from '../mock/mockServer';

export const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK !== 'false';
const BASE = process.env.EXPO_PUBLIC_API_BASE ?? '';

async function http(path, options) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API 오류 ${res.status}`);
  return res.json();
}
const q = (time) => `time=${encodeURIComponent(time)}`;

export const getMap = (time) => (USE_MOCK ? mock.getMap(time) : http(`/map?${q(time)}`));

export const getSegment = (id, time) => (USE_MOCK ? mock.getSegment(id, time) : http(`/segments/${id}?${q(time)}`));

export const getRoutes = (activity, time) =>
  USE_MOCK ? mock.getRoutes(activity, time) : http(`/routes?activity=${activity}&${q(time)}`);

export const getReports = (time) => (USE_MOCK ? mock.getReports(time) : http(`/reports?${q(time)}`));

export const createReport = (payload) =>
  USE_MOCK ? mock.createReport(payload) : http('/reports', { method: 'POST', body: JSON.stringify(payload) });

export const getRivers = (time) => (USE_MOCK ? mock.getRivers(time) : http(`/rivers?${q(time)}`));

export const nearestSegmentId = mock.nearestSegmentId;
