// 하천·지도 API — 백엔드 상세 명세 MAP-01~08 (2026-11-09) 기준
//
//   MAP-01 GET /trails?latitude&longitude[&query]          주변 하천길 { trails[], responseGeneratedAt }
//   MAP-02 GET /trails?query                               검색 (MAP-01 의 query, /trails/search 없음)
//   MAP-03 GET /trails/{trailId}                           위치·길이·geometry(GeoJSON [경도, 위도])
//   MAP-04 GET /trails/{trailId}/status                    수위·1시간 예측·회복 예측 (공식 통제는 아직 미연동 → null)
//   MAP-05 GET /trails/{trailId}/routes?activityType       등록 코스 + 지정 출발점(startPoints)
//   MAP-06 GET /routes/{routeId}/detours                   사전 등록 우회 코스 (없으면 [])
//   MAP-07 GET /routes/{routeId}/availability?startPointId  시작 직전 확인 (HIGH_WATER·UNKNOWN 도 시작 허용 + warnings)
//   MAP-08 GET /routes/{routeId}                           코스 상세
//
// 화면은 아래 함수만 부르고, 응답은 앱 안의 'river'·'course' 모양으로 바꿔서 넘겨요.
//   waterStatus: NORMAL → available(이용 가능) · HIGH_WATER(1.5m 이상) → flooded(이용 위험) · UNKNOWN → unknown(확인 불가)
//   dataSource: REPLAY 면 시연 데이터 표시

import { USE_MOCK } from './client';
import { pathKm } from '../lib/geo';
import { formatLocal } from '../lib/time';
import { authed } from './auth';
import * as mock from '../mock/mockServer';

const WATER_IN = { NORMAL: 'available', HIGH_WATER: 'flooded', UNKNOWN: 'unknown' };
const toStatus = (v) => WATER_IN[String(v ?? '').toUpperCase()] ?? 'unknown';
const ACTIVITY_OUT = { walk: 'WALK', run: 'RUN', bike: 'BIKE' };
export const THRESHOLD_M = 1.5; // HIGH_WATER 기준 (MAP-04 처리 규칙)

const DEFAULT_CENTER = { latitude: 37.3245, longitude: 127.2355 }; // 월촌교 (위치 권한이 없을 때)
const qs = (o) =>
  Object.entries(o)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');
const geoToPath = (g) => (g?.coordinates ?? []).map(([lon, lat]) => [lat, lon]); // GeoJSON [경도, 위도] → [위도, 경도]

const toTrail = (t) => ({
  id: String(t.trailId),
  name: t.name,
  area: t.sectionName ?? null,
  kind: '하천 코스',
  status: toStatus(t.waterStatus),
  replay: String(t.dataSource ?? '').toUpperCase() === 'REPLAY',
  center: t.latitude != null ? [t.latitude, t.longitude] : null,
  distanceMeters: t.distanceMeters ?? null, // 내 위치에서 대표 지점까지
  lengthKm: t.lengthMeters != null ? t.lengthMeters / 1000 : null,
  path: null, // 상세(MAP-03)에서 채워요
});

// ── 목록·검색 ─────────────────────────────────────────
/** 주변 하천길 (홈 목록). 위치를 모르면 월촌교 주변 기준 */
export async function listTrails({ latitude, longitude, time } = {}) {
  if (USE_MOCK) return mock.getRivers(time);
  const d = await authed(`/trails?${qs({ latitude: latitude ?? DEFAULT_CENTER.latitude, longitude: longitude ?? DEFAULT_CENTER.longitude })}`);
  const trails = (d?.trails ?? []).map(toTrail);
  // 가까운 5곳은 상태(MAP-04)도 같이 받아요 → 홈에서 '회복 중' · '곧 이용 위험 예상'까지 보여 줄 수 있어요 (실패하면 목록 값 그대로)
  return Promise.all(
    trails.map((tr, i) =>
      i < 5
        ? authed(`/trails/${tr.id}/status`)
            .then((st) => (st ? { ...tr, ...fromStatus(st) } : tr))
            .catch(() => tr)
        : tr,
    ),
  );
}

/** MAP-02 검색 (MAP-01 의 query) */
export async function searchTrails(keyword, { time } = {}) {
  if (USE_MOCK) {
    const all = await mock.getRivers(time);
    const q = keyword.trim().replace(/\s/g, '');
    return all.filter((r) => !q || `${r.name}${r.area}${r.kind}`.replace(/\s/g, '').includes(q));
  }
  const d = await authed(`/trails?${qs({ query: keyword.trim() })}`);
  return (d?.trails ?? []).map(toTrail);
}

// ── 상세·상태 ─────────────────────────────────────────
/** 하천길 상세 + 상태를 한 번에 받아서 river 모양으로 (목업은 목록에 이미 다 들어 있어요) */
export async function getTrailFull(id) {
  if (USE_MOCK) return null;
  const [d, st] = await Promise.all([authed(`/trails/${id}`), authed(`/trails/${id}/status`).catch(() => null)]);
  return {
    id: String(d.trailId),
    name: d.name,
    area: d.sectionName ?? null,
    description: d.description ?? null,
    path: geoToPath(d.geometry),
    lengthKm: d.lengthMeters != null ? d.lengthMeters / 1000 : null,
    center: d.latitude != null ? [d.latitude, d.longitude] : null,
    ...(st ? fromStatus(st) : {}),
  };
}

// 화면 시간 형식('YYYY-MM-DDTHH:mm', 한국 시간)
const plusMin = (iso, min) => formatLocal(new Date(new Date(iso).getTime() + min * 60000));
const RECOVERY_REASON = {
  RISING: '수위가 오르는 중이라 회복 시점을 아직 예측하지 않아요',
  RAINING: '비가 오는 중이라 회복 시점을 아직 예측하지 않아요',
  INSUFFICIENT_DATA: '관측 데이터가 부족해 회복 시점을 예측할 수 없어요',
};
/**
 * F-03 회복 예측 (MAP-04)
 *   recoveryStatus: BELOW_THRESHOLD(이미 1.5m 미만) · PREDICTED · RISING · RAINING · INSUFFICIENT_DATA
 *   recoveryEtaAtLeastMinutes: 1.5m 미만이 2시간 유지될 때까지의 '최소' 예상 시간 → "최소 n시간 뒤"로 보여줘요
 */
function fromRecovery(st) {
  const rs = String(st.recoveryStatus ?? '').toUpperCase();
  if (rs === 'BELOW_THRESHOLD') return { available: true, reached: true };
  if (rs === 'PREDICTED' && st.recoveryEtaAtLeastMinutes != null) {
    const base = st.observedAt ?? st.responseGeneratedAt;
    return {
      available: true,
      reached: false,
      atLeast: true,
      minutes: st.recoveryEtaAtLeastMinutes,
      estimate: base ? plusMin(base, st.recoveryEtaAtLeastMinutes) : null,
      basis: `${THRESHOLD_M}m 미만이 2시간 유지될 때까지 최소 예상 시간`,
    };
  }
  return rs ? { available: false, reason: RECOVERY_REASON[rs] ?? null } : null;
}

const toLocal = (iso) => (iso ? formatLocal(new Date(iso)) : null);
function fromStatus(st) {
  const ds = String(st.dataStatus ?? '').toUpperCase();
  const base = toStatus(st.waterStatus);
  const recovery = fromRecovery(st);
  const predicted = st.predictedWaterLevelMeters ?? null;
  // 상태는 서버 waterStatus 세 가지 그대로 (NORMAL·HIGH_WATER·UNKNOWN). '회복 중'은 따로 만들지 않아요 — 회복 예상 시간은 하천 상세에서 보여요
  //   곧 이용 위험 예상: 지금은 이용 가능인데, 1시간 뒤 예측 수위가 1.5m 이상일 때
  return {
    status: base,
    forecastRisk: base === 'available' && predicted != null && predicted >= THRESHOLD_M,
    replay: String(st.dataSource ?? '').toUpperCase() === 'REPLAY',
    dataStatus: ds || null, // OK · PARTIAL · MISSING · STALE
    waterLevel:
      st.currentWaterLevelMeters == null
        ? null
        : {
            value: st.currentWaterLevelMeters,
            unit: 'm',
            observedAt: toLocal(st.observedAt),
            predicted: st.predictedWaterLevelMeters ?? null,
            forecastTargetAt: toLocal(st.forecastTargetAt),
            station: st.stationName ?? null,
            interest: THRESHOLD_M,
          },
    staleAt: ds === 'STALE' ? toLocal(st.observedAt) : null, // 30분 넘게 실측 없음
    official: null, // 공식 통제는 아직 연동 전 (officialControlStatus = null)
    officialKnown: false,
    notice: st.notice ?? null,
    recovery,
    trend: { RISING: 'rising', FALLING: 'falling', STEADY: 'steady' }[String(st.trend ?? '').toUpperCase()] ?? null,
    updatedAt: toLocal(st.responseGeneratedAt),
  };
}

// ── 코스 ─────────────────────────────────────────────
const toRoute = (r, trail) => ({
  id: String(r.routeId),
  trailId: String(r.trailId ?? trail?.id ?? ''),
  name: r.name,
  activityTypes: (r.activityTypes ?? []).map((a) => String(a).toLowerCase()),
  distanceKm: r.distanceMeters / 1000,
  durationSec: r.estimatedDurationSeconds ?? null,
  path: geoToPath(r.geometry),
  // 지정 출발점만 고를 수 있어요 (MAP-05 처리 규칙)
  startPoints: (r.startPoints ?? []).map((s) => ({ id: String(s.startPointId), name: s.name, point: [s.latitude, s.longitude] })),
  status: r.waterStatus ? toStatus(r.waterStatus) : undefined,
});

/** MAP-05 하천길 코스 목록 */
export async function getTrailRoutes(id, activity) {
  if (USE_MOCK) return [];
  const d = await authed(`/trails/${id}/routes?${qs({ activityType: ACTIVITY_OUT[activity] })}`);
  return (d?.routes ?? []).map((r) => toRoute(r, { id }));
}

/** MAP-08 코스 상세 (즐겨찾기·기록에서 코스로 갈 때) */
export async function getRoute(routeId) {
  if (USE_MOCK) return null;
  return toRoute(await authed(`/routes/${routeId}`));
}

/**
 * MAP-07 기록 시작 직전 확인 → { available, warnings[], checkedAt, status }
 * 서버는 HIGH_WATER·UNKNOWN 이어도 시작을 허용하고 경고를 줘요. 목업은 하천길 상태로 판단.
 */
export async function checkRouteAvailability(routeId, startPointId, river) {
  if (USE_MOCK || !routeId || !startPointId) {
    const blocked = river?.status === 'flooded' || !!river?.official;
    return { available: !blocked, warnings: blocked ? [river.official?.reason ?? '하천 수위가 높아요'] : [], checkedAt: river?.updatedAt ?? null };
  }
  const d = await authed(`/routes/${routeId}/availability?${qs({ startPointId })}`);
  return { available: !!d.startAllowed, warnings: d.warnings ?? [], checkedAt: toLocal(d.checkedAt), status: toStatus(d.waterStatus), replay: d.dataSource === 'REPLAY' };
}

/**
 * MAP-06 우회 코스 → [{ id, name, path, distanceKm, extraKm }]
 * 선택한 코스(routeId) 기준. 모르면(하천길 화면에서 들어온 경우) 그 하천길의 첫 코스로 조회해요.
 */
export async function getDetours(trailId, activity, routeId) {
  if (USE_MOCK) {
    const list = await mock.getDetours(trailId, routeId);
    return list.map((d) => ({ ...d, distanceKm: pathKm(d.path) }));
  }
  const rid = routeId ?? (await getTrailRoutes(trailId, activity).catch(() => []))[0]?.id;
  if (!rid) return [];
  const d = await authed(`/routes/${rid}/detours`);
  return (d?.detours ?? []).map((x) => ({
    id: String(x.detourId),
    routeId: String(rid),
    name: x.name,
    path: geoToPath(x.geometry),
    distanceKm: x.distanceMeters / 1000,
    extraKm: x.extraDistanceMeters != null ? x.extraDistanceMeters / 1000 : null,
    example: false,
  }));
}

/**
 * 홈 '내 주변 코스' → [{ id, trailId, trailName, name, direction, tag, photo, path, km, durationSec, startPoints, status, official, mock }]
 * 실서버: 주변 하천길(MAP-01)마다 코스(MAP-05)를 모아요. 상태는 하천길 waterStatus.
 */
export async function listCourses({ time, activity, latitude, longitude } = {}) {
  if (USE_MOCK) return mock.getCourses(time);
  const trails = await listTrails({ latitude, longitude });
  const lists = await Promise.all(
    trails.map((t) =>
      getTrailRoutes(t.id, activity)
        .then((rs) =>
          rs.map((r) => ({
            ...r,
            trailName: t.name,
            area: t.area,
            direction: t.area ?? '',
            tag: '추천 경로',
            photo: null,
            km: r.distanceKm,
            status: t.status,
            forecastRisk: !!t.forecastRisk,
            recovery: t.recovery ?? null,
            replay: t.replay,
            official: null,
            mock: false,
          })),
        )
        .catch(() => []),
    ),
  );
  return lists.flat();
}
