// 로그인한 사용자 데이터 API — 백엔드 상세 명세(2026-11-09) 기준
//
//   ACT-01 POST /activities (Idempotency-Key 헤더)       활동 저장 → { activityId, favoriteAdded }
//   ACT-02 GET  /activities?month=YYYY-MM&activityType&page&size(≤100)
//   ACT-03 GET  /activities/{activityId}                 상세 (geometry, averagePaceSecondsPerKm)
//   ACT-04 GET  /activities/stats/weekly?date            주간 (daily 7일, recentActivities 3건)
//   ACT-05 GET  /activities/stats/monthly?month=YYYY-MM  월간 (activityDates, currentStreakDays)
//   FAV-01 GET  /favorites → { favorites[] } · FAV-02 POST /favorites { routeId } (같은 코스면 기존 id) · FAV-03 DELETE /favorites/{id}
//   BADGE-01 GET /badges → { earnedCount, totalCount, badges[{ code, name, target, progress, earnedAt }] }
//   WEATHER-01 GET /weather/current → { areaName, temperatureCelsius, condition, observedAt }
//   NOTI-01 GET /notifications (회복 예측 알림만) · NOTI-02 PATCH /notifications/{id}/read
//   NOTI-03/04 GET·PATCH /notification-settings { recoveryForecastEnabled }
//   NOTI-05 POST /devices { installationId, platform, expoPushToken } · NOTI-06 DELETE /devices/{deviceId}
//   USER-03 POST /users/me/photo  ⚠ 상세 명세 아직 없음 (multipart 'image' → { profileImageUrl } 로 가정)
//
// 목업 모드(EXPO_PUBLIC_USE_MOCK 기본 true)에서는 지금처럼 이 기기에 저장해요.
import { Platform } from 'react-native';
import { USE_MOCK } from './client';
import { ApiError, authed } from './auth';
import { getKV, setKV } from '../lib/kv';

const qs = (o) =>
  Object.entries(o)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');
const p2 = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
const ym = (y, m) => `${y}-${p2(m + 1)}`; // m: 0~11
const geoToPath = (g) => (g?.coordinates ?? []).map(([lon, lat]) => [lat, lon]);

/** UUID v4 (Idempotency-Key · installationId). 앱에 crypto 가 없어서 직접 만들어요 */
export const uuid = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });

const ACT_OUT = { walk: 'WALK', run: 'RUN', bike: 'BIKE' };
const ACT_IN = { WALK: 'walk', RUN: 'run', BIKE: 'bike' };

// ── 활동 (ACT-01~05) ───────────────────────────
/** 서버 활동 → 앱 기록 { id, activity, trailName, routeName, courseId, distanceKm, durationSec, date, path } */
export const fromActivity = (a) => ({
  id: String(a.activityId),
  activity: ACT_IN[String(a.activityType ?? '').toUpperCase()] ?? 'walk',
  trailName: a.routeName ?? '하천길', // 목록에는 코스 이름만 와요
  routeName: a.routeName ?? '',
  courseId: a.routeId != null ? String(a.routeId) : null,
  distanceKm: (a.distanceMeters ?? 0) / 1000,
  durationSec: a.elapsedSeconds ?? 0,
  date: a.startedAt,
  endedAt: a.endedAt ?? null,
  path: geoToPath(a.geometry),
  paceSecPerKm: a.averagePaceSecondsPerKm ?? null,
});

/**
 * ACT-01 활동 저장 → 저장된 기록 (+ favoriteAdded)
 *   routeId·startPointId 필수, trackPoints 최소 2개, 거리·시간 > 0
 *   Idempotency-Key: 기록(draft)마다 하나 — 같은 기록을 다시 보내면 서버가 중복 저장하지 않아요
 */
export async function saveActivity(rec, { saveAsFavorite = false } = {}) {
  if (USE_MOCK) return rec; // 목업: 기기 저장은 records.js 가 해요
  if (!rec.courseId || !rec.startPointId) throw new ApiError('코스와 출발점을 골라야 기록을 저장할 수 있어요.', { status: 400 });
  const pts = rec.path ?? [];
  if (pts.length < 2 || !(rec.distanceKm > 0) || !(rec.durationSec > 0)) throw new ApiError('이동한 기록이 너무 짧아 저장할 수 없어요.', { status: 400 });
  const t0 = new Date(rec.date).getTime();
  const t1 = t0 + rec.durationSec * 1000;
  const iso = (ms) => new Date(ms).toISOString();
  const d = await authed('/activities', {
    method: 'POST',
    headers: { 'Idempotency-Key': rec.idemKey ?? rec.id },
    body: {
      routeId: Number(rec.courseId),
      startPointId: Number(rec.startPointId),
      activityType: ACT_OUT[rec.activity],
      startedAt: iso(t0),
      endedAt: rec.endedAt ?? iso(t1),
      elapsedSeconds: Math.round(rec.durationSec),
      distanceMeters: Math.round(rec.distanceKm * 1000),
      // 점마다 측정 시각 (없으면 시작~끝을 고르게 나눠요)
      trackPoints: pts.map(([latitude, longitude], i) => ({
        latitude,
        longitude,
        recordedAt: rec.times?.[i] ?? iso(t0 + ((t1 - t0) * i) / Math.max(1, pts.length - 1)),
      })),
      saveAsFavorite,
      // 우회 경로로 걸었으면 그 우회 경로 id (DB activities.detour_id) — 일반 기록에는 안 넣어요
      ...(rec.detourId != null && Number.isFinite(Number(rec.detourId)) ? { detourId: Number(rec.detourId) } : {}),
    },
  });
  return { ...rec, id: String(d.activityId), favoriteAdded: !!d.favoriteAdded };
}

/** ACT-02 한 달 기록 (최신순, 100건씩) */
export async function listActivities({ year, month, activityType } = {}) {
  const now = new Date();
  const out = [];
  for (let page = 0; page < 5; page++) {
    const d = await authed(
      `/activities?${qs({ month: ym(year ?? now.getFullYear(), month ?? now.getMonth()), activityType: ACT_OUT[activityType], page, size: 100 })}`,
    );
    out.push(...(d?.content ?? []).map(fromActivity));
    if (!d?.hasNext) break;
  }
  return out;
}

/** ACT-03 활동 상세 */
export async function getActivity(id) {
  return fromActivity(await authed(`/activities/${id}`));
}

/** ACT-04 주간 통계 → { count, km, sec, days:[{date, km}], recent[] } */
export async function weeklyStats(date = new Date()) {
  const d = await authed(`/activities/stats/weekly?${qs({ date: ymd(date) })}`);
  return {
    count: d.activityCount ?? 0,
    km: (d.distanceMeters ?? 0) / 1000,
    sec: d.elapsedSeconds ?? 0,
    days: (d.daily ?? []).map((x) => ({ date: x.date, km: (x.distanceMeters ?? 0) / 1000 })),
    recent: (d.recentActivities ?? []).map(fromActivity),
  };
}

/** ACT-05 월간 통계 → { count, km, sec, activeDays:Set<일>, streak } */
export async function monthlyStats(y, m) {
  const d = await authed(`/activities/stats/monthly?${qs({ month: ym(y, m) })}`);
  return {
    count: d.activityCount ?? 0,
    km: (d.distanceMeters ?? 0) / 1000,
    sec: d.elapsedSeconds ?? 0,
    activeDays: new Set((d.activityDates ?? []).map((x) => Number(String(x).slice(8, 10)))),
    streak: d.currentStreakDays ?? null,
    longestStreak: d.longestStreakDays ?? null,
  };
}

// ── 즐겨찾기 (FAV-01~03) ─────────────────────────
// 화면은 코스 id 로 즐겨찾기를 다루고, 지울 때 필요한 favoriteId 는 여기서 기억해요.
let favIds = {}; // { 코스 id: favoriteId }
export async function listFavorites() {
  if (USE_MOCK) return getKV('favorites', []) ?? [];
  const rows = (await authed('/favorites'))?.favorites ?? [];
  favIds = Object.fromEntries(rows.map((r) => [String(r.routeId), r.favoriteId]));
  return rows.map((r) => String(r.routeId));
}
export async function addFavorite(courseId) {
  if (USE_MOCK) return;
  const d = await authed('/favorites', { method: 'POST', body: { routeId: Number(courseId) } }); // 이미 있으면 기존 id
  if (d?.favoriteId != null) favIds[String(courseId)] = d.favoriteId;
}
export async function removeFavorite(courseId) {
  if (USE_MOCK) return;
  if (favIds[courseId] == null) await listFavorites(); // favoriteId 를 모르면 목록에서 찾기
  const fid = favIds[courseId];
  if (fid == null) return;
  await authed(`/favorites/${fid}`, { method: 'DELETE' });
  delete favIds[courseId];
}

// ── 배지 (BADGE-01) ───────────────────────────
/** → { earned, total, badges:[{ id(code), name, earned, progress, target, earnedAt }] } */
export async function listBadges() {
  const d = await authed('/badges');
  return {
    earned: d.earnedCount ?? 0,
    total: d.totalCount ?? (d.badges ?? []).length,
    badges: (d.badges ?? []).map((b) => ({ id: b.code, name: b.name, earned: !!b.earnedAt, progress: b.progress ?? 0, target: b.target ?? 0, earnedAt: b.earnedAt })),
  };
}

// ── 날씨 (WEATHER-01) ─────────────────────────
const CONDITION = { SUNNY: '맑음', CLOUDY: '흐림', RAINY: '비', SNOWY: '눈', UNKNOWN: '확인 불가' };
/** → { tempC, condition, skyLabel, area, observedAt } | null(목업) */
export async function currentWeather({ latitude, longitude } = {}) {
  if (USE_MOCK) return null;
  const d = await authed(`/weather/current?${qs({ latitude, longitude })}`); // 좌표를 빼면 월촌교 기준
  const c = String(d.condition ?? 'UNKNOWN').toUpperCase();
  return { tempC: d.temperatureCelsius ?? null, condition: c, skyLabel: CONDITION[c] ?? '확인 불가', area: d.areaName ?? null, observedAt: d.observedAt ?? null };
}

// ── 알림 (NOTI-01~06) ─────────────────────────
/** NOTI-01 (회복 예측 알림만) → [{ id, type, title, body, at, read, trailId }] */
export async function listNotifications() {
  const d = await authed(`/notifications?${qs({ page: 0, size: 50 })}`);
  return (d?.content ?? []).map((n) => ({
    id: String(n.notificationId),
    type: 'river', // RECOVERY_FORECAST
    title: n.title,
    body: n.body ?? '',
    at: n.createdAt,
    read: n.readAt != null,
    trailId: n.trailId != null ? String(n.trailId) : null,
    alert: false,
  }));
}
/** NOTI-02 (모두 읽음 API 는 없어서 안 읽은 것만 하나씩) */
export const markNotificationRead = (id) => authed(`/notifications/${id}/read`, { method: 'PATCH' });

/** NOTI-03 → { recovery } (서버는 회복 예측 스위치 하나, 기본 false) */
export async function getNotificationSettings() {
  const d = await authed('/notification-settings');
  return { recovery: !!d?.recoveryForecastEnabled };
}
/** NOTI-04 */
export async function updateNotificationSettings(patch) {
  if (!('recovery' in patch)) return null;
  return authed('/notification-settings', { method: 'PATCH', body: { recoveryForecastEnabled: !!patch.recovery } });
}

/** 앱 설치별 UUID (NOTI-05 installationId) */
export function installationId() {
  let id = getKV('installation-id', null);
  if (!id) {
    id = uuid();
    setKV('installation-id', id);
  }
  return id;
}
/** NOTI-05 푸시 기기 등록 — 푸시 토큰이 있을 때만 (안드로이드 Expo Go 는 원격 푸시 불가 → 개발 빌드부터) */
export async function registerDevice(expoPushToken) {
  if (USE_MOCK || !expoPushToken) return null;
  const d = await authed('/devices', {
    method: 'POST',
    body: { installationId: installationId(), platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID', expoPushToken },
  });
  if (d?.deviceId != null) setKV('push-device-id', d.deviceId);
  return d?.deviceId ?? null;
}
/** NOTI-06 푸시 기기 해제 (로그아웃 전에) */
export async function unregisterDevice() {
  const id = getKV('push-device-id', null);
  if (USE_MOCK || id == null) return;
  await authed(`/devices/${id}`, { method: 'DELETE' }).catch(() => {});
  setKV('push-device-id', null);
}

// ── 프로필 사진 (USER-03) ⚠ 상세 명세 대기 ─────────
/** 앨범에서 고른 사진 → 서버 URL. 목업은 기기 경로 그대로 */
export async function uploadProfilePhoto(uri) {
  if (USE_MOCK) return uri;
  const form = new FormData();
  const ext = (uri.split('.').pop() || 'jpg').toLowerCase();
  form.append('image', { uri, name: `profile.${ext}`, type: `image/${ext === 'jpg' ? 'jpeg' : ext}` });
  const d = await authed('/users/me/photo', { method: 'POST', body: form });
  return d?.profileImageUrl ?? null;
}
