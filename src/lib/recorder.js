// 측정 상태 — 기록 화면 · 코스 화면 · 하단 ▶ 가 같이 봐요 (최종 시안 2026-11-11 기록 흐름)
//   idle → countdown(3·2·1) → running ⇄ paused → finish() 로 결과 초안을 만들고 idle 로
//   GPS: expo-location 위치 추적(정확도 50m 넘는 점은 버림). 시연 모드: 코스를 따라 20배속으로 가상 이동.
//   메모리 값이라 앱을 완전히 끄면 측정 중이던 기록은 사라져요(예전과 같음).
import { useSyncExternalStore } from 'react';
import * as Location from 'expo-location';
import { getKV, setKV } from './kv';
import { haversineKm, pathKm, pointAlong } from './geo';
import { uuid } from '../api/me';

const SIM_SPEED_KMH = { walk: 4.5, run: 10, bike: 18 };
export const SIM_FACTOR = 20; // 시연 모드: 1초에 20초 분량 이동
const COUNT_FROM = 3;

let st = {
  phase: 'idle', // idle | countdown | running | paused
  count: 0, // 카운트다운 숫자
  activity: 'walk',
  track: [], // [위도, 경도, 측정 시각]
  elapsed: 0, // 초
  startedAt: null,
  sim: true,
  info: null, // { courseId, trailName, routeName, detourId, startPointId, planned, place }
  gps: 'idle', // idle | ok | denied
  error: null,
  askStop: false, // '기록을 종료할까요?' 창
};
const subs = new Set();
const set = (p) => {
  st = { ...st, ...p };
  subs.forEach((fn) => fn());
};
const subscribe = (fn) => (subs.add(fn), () => subs.delete(fn));
export const getRecorder = () => st;
export const useRecorder = () => useSyncExternalStore(subscribe, () => st, () => st);
export const isRecording = () => st.phase !== 'idle';

// 시연 모드(가상 이동) 켜짐 여부 — 이 기기에 기억해요
export const simOn = () => getKV('record-sim', true) !== false;
export const setSim = (v) => setKV('record-sim', !!v);

let watch = null;
let tick = null;
let countTimer = null;
let simKm = 0;
let simSec = 0;
const stopSensors = () => {
  watch?.remove();
  watch = null;
  clearInterval(tick);
  tick = null;
};

/** 코스(또는 우회 경로)에서 '기록 시작' → 3초 카운트다운 뒤 측정 */
export function prepare({ activity, info }) {
  stopSensors();
  clearInterval(countTimer);
  set({ phase: 'countdown', count: COUNT_FROM, activity, info, sim: simOn(), track: [], elapsed: 0, startedAt: null, error: null, askStop: false, gps: 'idle' });
  countTimer = setInterval(() => {
    if (st.count > 1) return set({ count: st.count - 1 });
    clearInterval(countTimer);
    countTimer = null;
    begin();
  }, 1000);
}

function begin() {
  const startedAt = new Date().toISOString();
  const planned = st.info?.planned;
  simKm = 0;
  simSec = 0;
  set({ startedAt, elapsed: 0, track: st.sim && planned?.length ? [[planned[0][0], planned[0][1], startedAt]] : [] });
  startSensors();
}

async function startSensors() {
  set({ error: null });
  if (!st.sim) {
    let status = 'denied';
    try {
      ({ status } = await Location.requestForegroundPermissionsAsync());
    } catch {}
    if (status !== 'granted') {
      set({ gps: 'denied', phase: 'paused', error: '위치 권한이 없어 기록할 수 없어요. 설정에서 위치를 허용해 주세요.' });
      return;
    }
    set({ gps: 'ok' });
    try {
      watch = await Location.watchPositionAsync({ accuracy: Location.Accuracy.BestForNavigation, timeInterval: 2000, distanceInterval: 3 }, (pos) => {
        if (pos.coords.accuracy && pos.coords.accuracy > 50) return; // 부정확한 점 제외
        const p = [pos.coords.latitude, pos.coords.longitude, new Date(pos.timestamp ?? Date.now()).toISOString()];
        const t = st.track;
        if (t.length && haversineKm(t[t.length - 1], p) < 0.003) return;
        set({ track: [...t, p] });
      });
    } catch {
      set({ error: '위치를 가져오지 못했어요.' });
    }
    tick = setInterval(() => set({ elapsed: st.elapsed + 1 }), 1000);
  } else {
    const planned = st.info?.planned;
    if (!planned?.length) {
      set({ phase: 'paused', error: '코스 경로가 없어 시연 모드로 기록할 수 없어요.' });
      return;
    }
    tick = setInterval(() => {
      simKm += (SIM_SPEED_KMH[st.activity] / 3600) * SIM_FACTOR;
      const at = pointAlong(planned, simKm);
      if (!at) {
        // 코스 끝에 도착 → 멈추고 종료 확인
        stopSensors();
        set({ phase: 'paused', askStop: true });
        return;
      }
      simSec += SIM_FACTOR;
      const when = new Date(new Date(st.startedAt).getTime() + simSec * 1000).toISOString();
      set({ track: [...st.track, [at[0], at[1], when]], elapsed: st.elapsed + SIM_FACTOR });
    }, 1000);
  }
  set({ phase: 'running' });
}

export function pause() {
  stopSensors();
  set({ phase: 'paused' });
}
export function resume() {
  set({ askStop: false });
  startSensors();
}
/** ■ 종료 → 멈추고 확인 창 */
export function askStop() {
  if (st.phase === 'countdown') return cancel();
  stopSensors();
  set({ phase: 'paused', askStop: true });
}
/** 카운트다운 중 취소 등: 아무것도 남기지 않고 처음으로 */
export function cancel() {
  stopSensors();
  clearInterval(countTimer);
  countTimer = null;
  set({ phase: 'idle', count: 0, track: [], elapsed: 0, askStop: false, error: null });
}

/** 종료하고 결과 보기 → 결과 화면용 초안 (activity-draft) */
export function finish() {
  stopSensors();
  const { track: t, elapsed: sec, info, activity, startedAt, sim } = st;
  const slim = t.length > 400 ? t.filter((_, i) => i % Math.ceil(t.length / 400) === 0) : t; // 최대 400점
  const draft = {
    id: `rec-${Date.now()}`,
    activity,
    trailName: info?.trailName ?? '월촌교 하천길',
    courseId: info?.courseId ?? null,
    detourId: info?.detourId ?? null, // 우회 경로로 걸은 기록
    routeName: info?.routeName ?? '자유 기록',
    place: info?.place ?? null, // 결과 화면 'Place'
    distanceKm: Math.round(pathKm(t) * 100) / 100,
    durationSec: sec,
    date: startedAt ?? new Date().toISOString(),
    path: slim.map(([la, lo]) => [la, lo]),
    times: slim.map((x) => x[2] ?? null), // ACT-01 trackPoints.recordedAt
    startPointId: info?.startPointId ?? null, // ACT-01 필수 (서버 코스)
    idemKey: uuid(), // ACT-01 Idempotency-Key — 같은 기록 재전송 때 중복 저장 방지
    simulated: sim,
  };
  setKV('activity-draft', draft);
  set({ phase: 'idle', count: 0, track: [], elapsed: 0, askStop: false, error: null, info: null });
  return draft;
}

/** 칼로리 추정 (몸무게를 모르니 70kg 기준, 거리 1km당 산책 0.55 · 러닝 1.0 · 자전거 0.28 kcal/kg) */
export const kcalFor = (activity, km) => Math.round(({ walk: 0.55, run: 1.0, bike: 0.28 }[activity] ?? 0.55) * 70 * (km || 0));
