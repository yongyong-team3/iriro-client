// 활동 기록 · 통계 · 배지 (기기 저장소 'activity-records')
//   기록 = { id, activity: walk|run|bike, trailName, courseId, routeName, distanceKm, durationSec, date(ISO), path?, fav, simulated }
// 서버 모드: 활동(ACT-01~05)·배지(BADGE-01) API 사용 / 목업 모드: 이 기기에 저장하고 앱에서 계산
import { useEffect, useMemo, useState } from 'react';
import { getKV, setKV, useKV } from './kv';
import { useAppState } from '../context/AppState';
import { USE_MOCK } from '../api/client';
import { listActivities, listBadges, monthlyStats, saveActivity, weeklyStats } from '../api/me';

export const ACT = {
  walk: { label: '산책', icon: 'walk' },
  run: { label: '러닝', icon: 'run' },
  bike: { label: '자전거', icon: 'bike' },
};
export const DAY = ['일', '월', '화', '수', '목', '금', '토'];

const p2 = (n) => String(n).padStart(2, '0');

/** 00:14:32 */
export const clock = (sec) => {
  const s = Math.max(0, Math.floor(sec));
  return `${p2(Math.floor(s / 3600))}:${p2(Math.floor((s % 3600) / 60))}:${p2(s % 60)}`;
};
/** 14:32 (1시간 넘으면 1:02:10) */
export const shortClock = (sec) => {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  return h ? `${h}:${p2(Math.floor((s % 3600) / 60))}:${p2(s % 60)}` : `${p2(Math.floor(s / 60))}:${p2(s % 60)}`;
};
/** 5′52″ (거리가 너무 짧으면 --) */
export const pace = (sec, km) => {
  if (!km || km < 0.05) return '--';
  const spk = sec / km;
  let m = Math.floor(spk / 60);
  let s = Math.round(spk % 60);
  if (s === 60) (m += 1), (s = 0);
  return `${m}′${p2(s)}″`;
};
/** 6시간 10분 / 42분 */
export const hoursMin = (sec) => {
  const m = Math.round(sec / 60);
  const h = Math.floor(m / 60);
  return h ? `${h}시간 ${m % 60}분` : `${m}분`;
};
export const km1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
export const km2 = (v) => (Math.round(v * 100) / 100).toFixed(2);

const ymd = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
export const sameDay = (a, b) => ymd(a) === ymd(b);

/** 11월 8일 일요일 · 08:20 / 오늘 08:20 */
export function dateLabel(iso, { year = false, todayWord = false } = {}) {
  const d = new Date(iso);
  const t = `${p2(d.getHours())}:${p2(d.getMinutes())}`;
  if (todayWord && sameDay(d, new Date())) return `오늘 ${t}`;
  return `${year ? `${d.getFullYear()}년 ` : ''}${d.getMonth() + 1}월 ${d.getDate()}일 ${DAY[d.getDay()]}요일 · ${t}`;
}

/** 오늘 08:20 · 어제 18:10 · 11월 7일 18:10 */
export function whenShort(iso) {
  const d = new Date(iso);
  const t = `${p2(d.getHours())}:${p2(d.getMinutes())}`;
  const y = new Date();
  y.setDate(y.getDate() - 1);
  if (sameDay(d, new Date())) return `오늘 ${t}`;
  if (sameDay(d, y)) return `어제 ${t}`;
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${t}`;
}

// ── 시연용 예시 기록 ─────────────────────────────
// 시연 모드에서 아직 기록이 하나도 없으면 화면이 비어 보이지 않게 예시를 보여줘요(저장은 안 해요).
function sampleRecords() {
  const today = new Date();
  const at = (daysAgo, h, m) => {
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };
  const rows = [
    [1, 8, 20, 'run', 2.48, 872],
    [2, 18, 10, 'walk', 3.52, 2538],
    [3, 7, 10, 'run', 2.1, 760],
    [4, 7, 40, 'run', 3.62, 1331],
    [5, 19, 5, 'walk', 2.9, 2150],
    [6, 9, 30, 'bike', 6.4, 1580],
    [7, 9, 30, 'bike', 2.48, 680],
    [8, 7, 50, 'walk', 4.1, 3010],
    [10, 18, 30, 'run', 3.3, 1200],
    [13, 8, 0, 'walk', 3.2, 2400],
    [16, 18, 40, 'bike', 5.6, 1400],
    [19, 7, 30, 'walk', 2.5, 1900],
  ];
  return rows.map(([ago, h, m, activity, distanceKm, durationSec], i) => ({
    id: `sample-${i}`,
    activity,
    trailName: '월촌교 하천',
    routeName: '월촌교 하천 코스',
    courseId: 'wolchon-maesan',
    distanceKm,
    durationSec,
    date: at(ago, h, m),
    sample: true,
  }));
}

// 서버 기록은 'srv-activities' 에 담아 두고 여러 화면이 같이 써요 (30초 안에 다시 받지 않음)
let lastFetch = 0;
export function refreshActivities(force = false) {
  if (USE_MOCK || (!force && Date.now() - lastFetch < 30000)) return Promise.resolve();
  lastFetch = Date.now();
  return listActivities()
    .then((l) => setKV('srv-activities', l))
    .catch(() => {
      lastFetch = 0;
    });
}

/** 기록 목록(최신순). 목업 + 시연 모드 + 기록 없음 → 예시 기록 */
export function useRecords() {
  const [saved, setSaved] = useKV('activity-records', []);
  const [remote] = useKV('srv-activities', null);
  const { demoMode } = useAppState();
  useEffect(() => {
    refreshActivities();
  }, []);
  const mine = USE_MOCK ? saved : remote;
  const records = useMemo(() => {
    const list = mine?.length ? mine : USE_MOCK && demoMode ? sampleRecords() : [];
    return [...list].sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [mine, demoMode]);
  /** 기록 저장 → 저장된 기록(서버 id) */
  const add = async (rec, opts) => {
    if (USE_MOCK) {
      setSaved((r) => [rec, ...(r ?? [])].slice(0, 300));
      return rec;
    }
    const r = await saveActivity(rec, opts);
    setKV('srv-activities', [r, ...(getKV('srv-activities', []) ?? [])]);
    refreshActivities(true);
    return r;
  };
  return { records, add, isSample: !mine?.length && records.length > 0, loading: !USE_MOCK && remote === null };
}

const sum = (list, k) => list.reduce((a, r) => a + (r[k] ?? 0), 0);
export const totals = (list) => ({ count: list.length, km: sum(list, 'distanceKm'), sec: sum(list, 'durationSec') });

/** 이번 주(월~일) */
export function weekStats(records, now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); // 월요일
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const inWeek = records.filter((r) => {
    const d = new Date(r.date);
    return d >= start && d < end;
  });
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const list = inWeek.filter((r) => sameDay(new Date(r.date), d));
    return { date: d, label: DAY[d.getDay()], km: sum(list, 'distanceKm'), today: sameDay(d, now), future: d > now };
  });
  const last = new Date(end);
  last.setDate(last.getDate() - 1);
  const best = days.reduce((a, b) => (b.km > a.km ? b : a), days[0]);
  return { ...totals(inWeek), days, from: start, to: last, best: best.km > 0 ? best : null };
}

/** 한 달 (y, m: 0~11) */
export function monthStats(records, y, m) {
  const list = records.filter((r) => {
    const d = new Date(r.date);
    return d.getFullYear() === y && d.getMonth() === m;
  });
  const activeDays = new Set(list.map((r) => new Date(r.date).getDate()));
  return { ...totals(list), list, activeDays };
}

/** 오늘(또는 어제)까지 이어진 연속 활동 일수 */
export function streak(records, now = new Date()) {
  const days = new Set(records.map((r) => ymd(new Date(r.date))));
  const d = new Date(now);
  if (!days.has(ymd(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(ymd(d))) {
    n += 1;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

// ── 배지 (⚠ 이름·획득 기준은 임시, 추후 확정) ───────────
// 배지 3종 — 백엔드 BADGE-01 과 같은 기준 (첫 활동 · 활동 5회 · 누적 10km)
const IMG_BY_CODE = {
  FIRST_ACTIVITY: require('../../assets/badges/badge01.png'),
  FIVE_ACTIVITIES: require('../../assets/badges/badge03.png'),
  TEN_KM: require('../../assets/badges/badge02.png'),
};
const SPARE_IMGS = [require('../../assets/badges/badge04.png'), require('../../assets/badges/badge05.png'), require('../../assets/badges/badge06.png')];
export const BADGES = [
  { id: 'FIRST_ACTIVITY', name: '첫 활동', target: 1, unit: '회', value: (r) => r.length },
  { id: 'FIVE_ACTIVITIES', name: '활동 5회', target: 5, unit: '회', value: (r) => r.length },
  { id: 'TEN_KM', name: '누적 10km', target: 10000, unit: 'm', value: (r) => Math.round(sum(r, 'distanceKm') * 1000) },
];
const badgeImg = (code, i) => IMG_BY_CODE[code] ?? SPARE_IMGS[i % SPARE_IMGS.length];
/** 진행도 문구: 1 / 5회 · 2.4 / 10km */
export const badgeProgress = (b) =>
  b.unit === 'm' || b.id === 'TEN_KM' ? `${km1(Math.min(b.progress, b.target) / 1000)} / ${b.target / 1000}km` : `${Math.min(b.progress, b.target)} / ${b.target}회`;
export const badgeState = (records) =>
  BADGES.map((b, i) => {
    const progress = b.value(records);
    return { id: b.id, name: b.name, target: b.target, unit: b.unit, progress, earned: progress >= b.target, img: badgeImg(b.id, i) };
  });

// ── 서버 통계·배지 훅 (목업이면 앱에서 계산한 값 그대로) ───────────
/** ACT-04 주간 통계. 서버 값이 오면 합계·요일별 거리를 바꿔 끼워요 */
export function useWeekStats(records) {
  const local = weekStats(records);
  const [srv, setSrv] = useState(null);
  useEffect(() => {
    if (USE_MOCK) return;
    weeklyStats().then(setSrv).catch(() => {});
  }, [records.length]);
  if (!srv) return local;
  const days = local.days.map((d) => {
    const hit = srv.days.find((x) => sameDay(new Date(x.date), d.date));
    return hit ? { ...d, km: hit.km } : d;
  });
  const best = days.reduce((a, b) => (b.km > a.km ? b : a), days[0]);
  return { ...local, count: srv.count, km: srv.km, sec: srv.sec, days, best: best.km > 0 ? best : null };
}

/** ACT-05 월간 통계 + 연속 기록 */
export function useMonthStats(records, y, m) {
  const local = { ...monthStats(records, y, m), streak: streak(records) };
  const [srv, setSrv] = useState(null);
  useEffect(() => {
    setSrv(null);
    if (USE_MOCK) return;
    monthlyStats(y, m).then(setSrv).catch(() => {});
  }, [y, m, records.length]);
  return srv ? { ...local, ...srv, streak: srv.streak ?? local.streak } : local;
}

/** BADGE-01 배지. 서버 모드에서는 받기 전까지 빈 목록 (이번 달 기록만으로 계산하면 틀려서) */
export function useBadges(records) {
  const [srv, setSrv] = useState(null);
  useEffect(() => {
    if (USE_MOCK) return;
    listBadges()
      .then((d) => setSrv(d.badges))
      .catch(() => {});
  }, [records.length]);
  if (USE_MOCK) return badgeState(records);
  return (srv ?? []).map((b, i) => ({ ...b, unit: b.id === 'TEN_KM' ? 'm' : '회', img: badgeImg(b.id, i) }));
}

/** 활동 기록 목록 화면: 고른 달의 기록 (서버 모드는 ACT-02 ?month= 로 받아요) */
export function useMonthList(records, y, m) {
  const [srv, setSrv] = useState(null);
  useEffect(() => {
    setSrv(null);
    if (USE_MOCK) return;
    listActivities({ year: y, month: m })
      .then(setSrv)
      .catch(() => setSrv([]));
  }, [y, m, records.length]);
  if (USE_MOCK) return monthStats(records, y, m).list;
  return srv;
}
