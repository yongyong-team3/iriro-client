// 백엔드 API를 흉내 내는 목업 서버. 응답 형식은 README의 API 명세와 동일합니다.
// 상태값: good(양호) · caution(주의) · closed(통제) · unknown(정보 부족)   — F-04
// 출처값: official(공식 통제) · estimate(AI 추정) · observed(관측) · citizen(시민 관찰) — F-05

import { RIVER, ROUTES, RAIN, STATIONS, SEED_REPORTS, REPORT_TYPES, REPLAY_START } from './data';
import { addHours, diffHours } from '../lib/time';
import { getKV, setKV } from '../lib/kv';
import { hasFloodHistory } from '../lib/floodHistory';
import { pathKm, subPath } from '../lib/geo';
import { THRESHOLD_M, sceneAt } from './scenes';
import { COURSE_PATH, DETOUR_PATH, RISK_POINT } from './wolchonMaesan';

const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const round = (n) => Math.round(n * 100) / 100;
const hourOf = (time) => diffHours(time, REPLAY_START);
const timeOf = (h) => addHours(REPLAY_START, h);

// ── 수위 시뮬레이션 ─────────────────────────────
function trueLevel(sim, h) {
  const { base, peak, peakHour, rise, decay } = sim;
  const shape = h <= peakHour ? Math.exp(-(((h - peakHour) / rise) ** 2)) : Math.exp(-(h - peakHour) / decay);
  const wobble = 0.04 * Math.sin(h * 1.7) + 0.03 * Math.cos(h * 0.9);
  return Math.max(0, base + (peak - base) * shape + wobble);
}
function predictedLevel(sim, h, h0) {
  const lead = h - h0;
  return Math.max(0, trueLevel(sim, h) * (1 + 0.004 * lead * Math.sin(h0 * 0.3 + 1)));
}
function rainAt(h) {
  const r = RAIN.find((x) => h >= x.from && h < x.to);
  return r ? r.mm : 0;
}

// 공식 통제 구간(시뮬레이션): 주의 수위 초과 시 통제 → 관심 수위 아래 + 점검 시간 후 해제
function closureWindow(seg) {
  if (!seg.closure || !seg.sim) return null;
  let start = null;
  for (let h = 0; h < 200; h++) {
    const lv = trueLevel(seg.sim, h);
    if (start === null && lv >= seg.thresholds.caution) start = h;
    if (start !== null && h > seg.sim.peakHour && lv < seg.thresholds.interest) {
      return { start, end: h + seg.closure.inspectHours };
    }
  }
  return start === null ? null : { start, end: 999 };
}

// ── 구간 상태 ──────────────────────────────────
function segmentState(seg, time) {
  const h = hourOf(time);
  const win = closureWindow(seg);
  const closedNow = win && h >= win.start && h < win.end;
  const level = seg.sim ? trueLevel(seg.sim, h) : null;

  let status;
  let source;
  if (closedNow) {
    status = 'closed';
    source = 'official';
  } else if (!seg.station || level === null) {
    status = 'unknown'; // 데이터 없음을 양호로 간주하지 않음
    source = 'none';
  } else if (level >= seg.thresholds.interest) {
    status = 'caution';
    source = 'estimate';
  } else {
    status = 'good';
    source = 'observed';
  }

  let trend = null;
  if (seg.sim) {
    const d = predictedLevel(seg.sim, h + 3, h) - level;
    trend = d > 0.08 ? 'rising' : d < -0.08 ? 'falling' : 'steady';
  }

  return {
    status,
    source,
    level: level === null ? null : round(level),
    trend,
    closure: closedNow ? { since: timeOf(win.start), reason: seg.closure.reason, source: '용인시 하천 통제 공지(목업)' } : null,
    recovery: recoveryEstimate(seg, time, level),
  };
}

// F-03 이용 여건 회복 시점 추정 (참고 수위 도달 예상 시각과 범위)
function recoveryEstimate(seg, time, level) {
  if (!seg.station || !seg.sim) return { available: false, reason: '연결된 수위관측소가 없어 추정할 수 없어요' };
  if (!seg.thresholds) return { available: false, reason: '참고 수위가 확보되지 않아 구체 시각을 제공하지 않아요' };
  if (level < seg.thresholds.interest) return { available: true, reached: true };

  const h0 = hourOf(time);
  for (let h = h0 + 1; h <= h0 + 72; h++) {
    if (predictedLevel(seg.sim, h, h0) < seg.thresholds.interest) {
      const lead = h - h0;
      const margin = Math.max(1, Math.round(1 + lead * 0.15)); // 멀수록 범위가 넓어짐
      return {
        available: true,
        reached: false,
        estimate: timeOf(h),
        earliest: timeOf(h - margin),
        latest: timeOf(h + margin),
        uncertainty: lead <= 6 ? 'low' : lead <= 18 ? 'medium' : 'high',
        basis: `현재 수위 ${round(level)}m · 참고 수위 ${seg.thresholds.interest}m · 최근 하강 추세`,
      };
    }
  }
  return { available: false, reason: '72시간 안에 참고 수위로 내려가지 않을 것으로 보여 추정을 보류했어요' };
}

// ── 제보 저장소 (기기 저장) ─────────────────────
const REPORT_KEY = 'mock-reports';
const loadUserReports = () => getKV(REPORT_KEY, []);
const saveUserReports = (list) => setKV(REPORT_KEY, list);
function allReports(time) {
  return [...SEED_REPORTS, ...loadUserReports()].filter((r) => r.mine || diffHours(r.createdAt, time) <= 0);
}

// ── 타임라인 (F-05) ────────────────────────────
function timeline(seg, time) {
  const h0 = hourOf(time);
  const ev = [];
  const push = (h, type, title, detail, source) => h <= h0 && ev.push({ t: timeOf(h), type, title, detail, source });

  push(14, 'rain', '강수 시작', '기상청 관측 강수 시작', '기상청 강수량(목업)');
  push(24, 'rain', '시간당 30mm 이상 강한 비', '집중호우 구간', '기상청 강수량(목업)');
  push(30, 'rain', '강수 종료', '누적 강수량 약 240mm', '기상청 강수량(목업)');

  if (seg.sim) {
    let prevInterest = false;
    let prevCaution = false;
    for (let h = 0; h <= h0; h++) {
      const lv = trueLevel(seg.sim, h);
      const st = STATIONS[seg.station]?.name ?? '수위관측소';
      if (!prevInterest && lv >= seg.thresholds.interest) push(h, 'level', '관심 수위 도달', `${round(lv)}m`, st);
      if (!prevCaution && lv >= seg.thresholds.caution) push(h, 'level', '주의 수위 도달', `${round(lv)}m`, st);
      if (prevCaution && lv < seg.thresholds.caution) push(h, 'level', '주의 수위 아래로 하강', `${round(lv)}m`, st);
      if (prevInterest && lv < seg.thresholds.interest) push(h, 'level', '참고 수위 아래로 하강', `${round(lv)}m`, st);
      prevInterest = lv >= seg.thresholds.interest;
      prevCaution = lv >= seg.thresholds.caution;
    }
  }

  const win = closureWindow(seg);
  if (win) {
    push(win.start, 'official', '공식 출입 통제 시작', seg.closure.reason, '용인시 하천 통제 공지(목업)');
    push(win.end, 'official', '공식 출입 통제 해제', '현장 점검 후 해제', '용인시 하천 통제 공지(목업)');
  }

  allReports(time)
    .filter((r) => r.segmentId === seg.id)
    .forEach((r) =>
      ev.push({
        t: r.createdAt,
        type: 'citizen',
        title: `시민 제보 · ${REPORT_TYPES[r.type]?.label ?? '기타'}`,
        detail: r.description || '설명 없음',
        source: r.status === 'verified' ? '시민 관찰 (확인됨)' : '시민 관찰 (미확인)',
        reportStatus: r.status,
      }),
    );

  return ev.sort((a, b) => diffHours(b.t, a.t));
}

// ── API ───────────────────────────────────────
// GET /api/map?time=
export async function getMap(time) {
  await delay(100);
  const reports = allReports(time);
  return {
    time,
    updatedAt: time,
    river: {
      id: RIVER.id,
      name: RIVER.name,
      district: RIVER.district,
      center: RIVER.center,
      segments: RIVER.segments.map((s) => ({
        id: s.id,
        name: s.name,
        lengthKm: s.lengthKm,
        bikePath: s.bikePath,
        path: s.path,
        station: s.station ? STATIONS[s.station] : null,
        thresholds: s.thresholds,
        floodHistory: hasFloodHistory(s.id), // 행정안전부 침수흔적도 기준
        reportCount: reports.filter((r) => r.segmentId === s.id).length,
        ...segmentState(s, time),
      })),
    },
  };
}

// GET /api/segments/{id}?time=
export async function getSegment(id, time) {
  await delay(140);
  const seg = RIVER.segments.find((s) => s.id === id);
  if (!seg) throw new Error('구간을 찾을 수 없어요');
  const h0 = hourOf(time);
  let forecast = null;
  if (seg.sim) {
    const observed = [];
    const predicted = [];
    const rain = [];
    for (let h = Math.max(0, h0 - 24); h <= h0; h++) {
      observed.push({ t: timeOf(h), level: round(trueLevel(seg.sim, h)) });
      rain.push({ t: timeOf(h), mm: rainAt(h) });
    }
    for (let h = h0; h <= h0 + 24; h++) {
      predicted.push({ t: timeOf(h), level: round(h === h0 ? trueLevel(seg.sim, h) : predictedLevel(seg.sim, h, h0)) });
    }
    forecast = { thresholds: seg.thresholds, observed, predicted, rain };
  }
  return { id, time, forecast, timeline: timeline(seg, time) };
}

// GET /api/routes?activity=walk|run|bike&time=
export async function getRoutes(activity, time) {
  await delay(80);
  const map = await getMap(time);
  const byId = Object.fromEntries(map.river.segments.map((s) => [s.id, s]));
  const rank = { good: 0, unknown: 1, caution: 2, closed: 3 };
  return ROUTES.filter((r) => r.activities.includes(activity))
    .map((r) => {
      const segs = r.segments.map((id) => byId[id]);
      const worst = segs.reduce((w, s) => (rank[s.status] > rank[w] ? s.status : w), 'good');
      const warnings = [];
      if (segs.some((s) => s.status === 'caution')) warnings.push('수위가 높은 구간 포함');
      if (segs.some((s) => s.status === 'unknown')) warnings.push('정보 부족 구간 포함');
      if (activity === 'bike' && segs.some((s) => !s.bikePath)) warnings.push('자전거도로 아님');
      return {
        ...r,
        status: worst,
        excluded: worst === 'closed', // 공식 통제 구간 포함 경로는 추천 제외
        excludedReason: worst === 'closed' ? '공식 통제 구간 포함' : null,
        warnings,
      };
    })
    .sort((a, b) => rank[a.status] - rank[b.status]);
}

// GET /api/reports?time=
export async function getReports(time) {
  await delay(60);
  return allReports(time).sort((a, b) => diffHours(b.createdAt, a.createdAt));
}

// POST /api/reports   { segmentId, type, description, position, photo(사진 파일 uri 또는 data URL), time }
export async function createReport({ segmentId, type, description, position, photo, time }) {
  await delay(500);
  const report = {
    id: `rp-${Date.now()}`,
    segmentId,
    type,
    description,
    position,
    photo,
    createdAt: time,
    status: 'unverified', // 등록 직후에는 항상 미확인 (F-06)
    mine: true,
  };
  saveUserReports([...loadUserReports(), report]);
  return report;
}

// 가장 가까운 구간 찾기 (제보 위치 → 구간 자동 연결)
export function nearestSegmentId(position) {
  let best = null;
  let bestD = Infinity;
  for (const s of RIVER.segments) {
    for (const p of s.path) {
      const d = (p[0] - position[0]) ** 2 + (p[1] - position[1]) ** 2;
      if (d < bestD) {
        bestD = d;
        best = s.id;
      }
    }
  }
  return best;
}

// ── 하천길 (홈 시안 2026-11-09) ─────────────────────────
// 상태 3단계 + 정보 부족: available(이용 가능) · recovering(회복 중) · flooded(침수) · unknown(정보 부족)
// 목업에서는 구간 시뮬레이션 상태를 3단계로 바꿔서 보여줘요. 실제로는 ai-server /live/status 결과를 씁니다.
const RIVER_WAYS = [
  { id: 'wolchon', name: '월촌교 하천길', area: '월촌교 주변', kind: '하천 코스', segmentId: 'gy-07', weather: { tempC: 21, sky: 'sunny' }, detour: true },
  // 관측소 연결이 불확실한 구간 → '확인 불가' 상태 예시
  { id: 'dunjeon', name: '둔전 생태공원 하천길', area: '포곡 둔전', kind: '하천 코스', segmentId: 'gy-05', weather: { tempC: 21, sky: 'sunny' }, detour: false },
];
// 관심 수위 이상(주의)·공식 통제 → AI '이용 위험', 관측소 없음 → '확인 불가'
const TO_3STAGE = { good: 'available', caution: 'flooded', closed: 'flooded', unknown: 'unknown' };

function riverWay(r, time) {
  const seg = RIVER.segments.find((s) => s.id === r.segmentId);
  const station = seg.station ? STATIONS[seg.station] : null;
  // 월촌교 하천길은 시연 장면(scenes.js) 값으로 보여줘요. 공식 통제는 아직 연동 전이라 없음.
  if (r.id === 'wolchon') {
    const sc = sceneAt(time);
    const w = sc.wolchon;
    return {
      id: r.id,
      name: r.name,
      area: r.area,
      kind: r.kind,
      path: seg.path,
      lengthKm: seg.lengthKm,
      status: w.status,
      trend: w.trend,
      official: null,
      officialKnown: false,
      waterLevel: {
        value: w.level,
        unit: 'm',
        observedAt: time,
        station: station?.name ?? '월촌교',
        interest: THRESHOLD_M,
        predicted: w.predicted, // AI 1시간 뒤 예측
        forecastTargetAt: addHours(time, 1),
      },
      // 지금은 기준 아래지만 1시간 뒤 기준을 넘을 것으로 예측 (폭우 장면)
      forecastRisk: w.status === 'available' && w.predicted >= THRESHOLD_M,
      weather: w.weather,
      recovery: w.recovery,
      replay: !!sc.time, // 과거 시점 = 시연 데이터
      scene: sc.id,
      updatedAt: time,
    };
  }
  const st = segmentState(seg, time);
  return {
    id: r.id,
    name: r.name,
    area: r.area,
    kind: r.kind,
    path: seg.path,
    lengthKm: seg.lengthKm,
    status: TO_3STAGE[st.status],
    trend: st.trend,
    official: null,
    officialKnown: false,
    waterLevel: null, // 관측소 연결이 불확실한 구간 → 확인 불가
    weather: sceneAt(time).wolchon.weather,
    recovery: null,
    replay: !!sceneAt(time).time,
    updatedAt: time,
  };
}

// GET /api/rivers?time=
export async function getRivers(time) {
  await delay(100);
  return RIVER_WAYS.map((r) => riverWay(r, time));
}

// GET /api/v1/routes/{id}/detours (목업): 물가 길 대신 안쪽 도로로 가는 경로
// 우회 경로는 선택한 코스 기준으로 미리 등록된 것만 돌려줘요 (없으면 빈 목록) — 목업은 월촌교→매산교만 등록
const DETOUR_ROUTES = ['wolchon-maesan'];
export async function getDetours(id, routeId) {
  await delay(120);
  const r = RIVER_WAYS.find((x) => x.id === id);
  if (!r?.detour) return [];
  if (routeId && !DETOUR_ROUTES.includes(routeId)) return [];
  // 물가 데크 구간 대신 안쪽 큰길(문현로)로 가는 실제 도로 경로
  return [{ id: `${id}-detour-1`, name: '문현로 우회 코스', path: DETOUR_PATH, example: false }];
}

// ── 내 주변 코스 (홈 2차 시안 2026-11-09) ─────────────────
// 월촌교→매산교만 실제 길(능원천 물가 데크, 1.4km)이고, 나머지 두 개는 화면 확인용 임시 코스예요.
const kmOf = (p) => Math.round(pathKm(p) * 10) / 10;
function buildCourses() {
  const up = [...RIVER.segments.find((s) => s.id === 'gy-07').path].reverse(); // 월촌교에서 상류(용인 시내) 쪽으로
  const c1 = COURSE_PATH; // 실제 길: 능원천 물가 데크 (wolchonMaesan.js)
  const c2 = subPath(up, 1.3, pathKm(up));
  const c3 = RIVER.segments.find((s) => s.id === 'gy-05').path;
  return [
    { id: 'wolchon-maesan', trailId: 'wolchon', name: '월촌교→매산교', direction: '매산리 방면', tag: '추천 경로', photo: 'wolchon', path: c1, km: kmOf(c1), riskPoint: RISK_POINT, mock: false },
    { id: 'maesan-pogok', trailId: 'wolchon', name: '매산교→포곡 북부', direction: '포곡 방면', tag: '추천 경로', path: c2, km: kmOf(c2), mock: true },
    { id: 'dunjeon-park', trailId: 'dunjeon', name: '둔전 생태공원 길', direction: '포곡 둔전', tag: '추천 경로', path: c3, km: kmOf(c3), mock: true },
  ];
}
let COURSES = null;

// GET (가정) /api/v1/trails/{id}/routes 를 주변 하천길마다 모은 것
export async function getCourses(time) {
  await delay(80);
  COURSES ??= buildCourses();
  const rivers = await getRivers(time);
  return COURSES.map((c) => {
    const r = rivers.find((x) => x.id === c.trailId);
    return {
      ...c,
      trailName: r?.name,
      area: c.trailId === 'wolchon' ? '용인시 처인구 모현읍 월촌교 일대' : '용인시 처인구 포곡읍 둔전리 일대',
      status: r?.status ?? 'unknown',
      official: r?.official ?? null,
      recovery: r?.recovery ?? null,
      forecastRisk: !!r?.forecastRisk,
      replay: !!r?.replay,
    };
  });
}
