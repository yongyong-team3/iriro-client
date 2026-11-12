// 탭(홈·기록·기록 목록·MY) 사이에서 함께 쓰는 상태
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getMap } from '../api/client';
import { getTrailFull, listCourses, listTrails } from '../api/trails';
import { REPLAY_DEFAULT } from '../mock/data';
import { formatLocal } from '../lib/time';
import { getKV, useKV } from '../lib/kv';
import { USE_MOCK } from '../api/client';
import { addFavorite, listFavorites, removeFavorite } from '../api/me';
import { useAuth } from './Auth';
import { sceneById } from '../mock/scenes';

const Ctx = createContext(null);

export function AppStateProvider({ children }) {
  const [demoMode, setDemoMode] = useKV('demo-mode', true);
  const [replayTime, setReplayTime] = useState(REPLAY_DEFAULT);
  const [clock, setClock] = useState(() => formatLocal(new Date()));
  // 시연 장면: 평상시(지금) · 폭우 · 침수 위험 · 회복 중 · 회복. 앱을 켜면 항상 '평상시'로 시작해요.
  const [sceneId, setSceneId] = useState('live');
  const scene = sceneById(sceneId);
  const now = USE_MOCK && scene.time ? scene.time : clock;

  // 실제 시각 모드에서는 10분마다 기준 시각 갱신
  useEffect(() => {
    if (scene.time) return;
    const id = setInterval(() => setClock(formatLocal(new Date())), 10 * 60 * 1000);
    return () => clearInterval(id);
  }, [scene.time]);

  const [activity, setActivity] = useKV('activity', 'walk');
  const [favorites, setFavorites] = useKV('favorites', []);
  const [route, setRoute] = useState(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState(null);

  const [mapData, setMapData] = useState(null);
  const [rivers, setRivers] = useState(null);
  const [courses, setCourses] = useState(null);
  const [selectedRiverId, setSelectedRiverId] = useState(null);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    // 예전 구간 지도(/map)는 목업에만 있어요. 서버 모드에서는 부르지 않아요 (없는 주소라 하천길까지 실패했음)
    Promise.all([USE_MOCK ? getMap(now) : null, listTrails({ time: now })])
      .then(([m, r]) => {
        if (!alive) return;
        setMapData(m);
        // 이미 받아 둔 상세(경로·수위)는 유지하고 목록 값만 새로 덮어써요
        setRivers((prev) => r.map((x) => ({ ...(prev?.find((p) => p.id === x.id) ?? {}), ...x, path: x.path ?? prev?.find((p) => p.id === x.id)?.path ?? null })));
        setError(null);
      })
      .catch((e) => {
        console.warn('[AppState] 지도·하천길 불러오기 실패', e?.stack ?? e);
        if (alive) setError(`지도·하천길: ${e?.message ?? e}`);
      }); // 실패해도 마지막 데이터는 유지
    return () => {
      alive = false;
    };
  }, [now, reloadKey]);

  // 내 주변 코스는 따로 불러와요 (하나가 실패해도 나머지는 보이게)
  useEffect(() => {
    let alive = true;
    listCourses({ time: now, activity })
      .then((c) => alive && setCourses(c))
      .catch((e) => {
        console.warn('[AppState] 코스 불러오기 실패', e?.stack ?? e);
        if (alive) (setCourses((prev) => prev ?? []), setError(`코스: ${e?.message ?? e}`));
      });
    return () => {
      alive = false;
    };
  }, [now, reloadKey, activity]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  // 하천길 상세(경로·수위·통제)를 받아서 목록에 합쳐요. 목업은 목록에 이미 다 있어서 아무것도 안 해요.
  const loadTrail = useCallback(async (id, extra) => {
    if (extra) setRivers((prev) => (prev?.some((r) => r.id === extra.id) ? prev : [...(prev ?? []), extra]));
    try {
      const full = await getTrailFull(id);
      if (full) setRivers((prev) => (prev ?? []).map((r) => (r.id === id ? { ...r, ...full } : r)));
    } catch (e) {
      setError(e.message);
    }
  }, []);
  // 즐겨찾기 (FAV-01~03): 서버 모드면 로그인할 때 목록을 받고, 누를 때마다 바로 반영 후 서버에 저장(실패하면 되돌림)
  const { status: authStatus } = useAuth();
  useEffect(() => {
    if (USE_MOCK || authStatus !== 'signedIn') return;
    listFavorites()
      .then(setFavorites)
      .catch(() => {});
  }, [authStatus]);
  const toggleFavorite = (id) => {
    const cur = getKV('favorites', []) ?? [];
    const on = !cur.includes(id);
    setFavorites(on ? [...cur, id] : cur.filter((x) => x !== id));
    if (USE_MOCK) return;
    (on ? addFavorite(id) : removeFavorite(id)).catch((e) => {
      setFavorites(cur); // 서버 저장 실패 → 원래대로
      setError(`즐겨찾기: ${e.message}`);
    });
  };

  const value = useMemo(
    () => ({
      now,
      demoMode,
      scene,
      setScene: (id) => {
        setClock(formatLocal(new Date()));
        setSceneId(id);
      },
      setDemoMode,
      replayTime,
      setReplayTime,
      river: mapData?.river ?? null,
      reports: [], // 제보 기능 없음 (2026-11-09 결정)
      rivers,
      courses,
      loadTrail,
      selectedRiverId,
      setSelectedRiverId,
      error,
      reload,
      activity,
      setActivity,
      route,
      setRoute,
      selectedSegmentId,
      setSelectedSegmentId,
      favorites,
      toggleFavorite,
      // 서버가 이미 즐겨찾기한 경우(활동 저장의 saveAsFavorite) 화면 상태만 맞춰요
      markFavorite: (id) => setFavorites((f) => (f.includes(id) ? f : [...f, id])),
    }),
    [now, sceneId, demoMode, replayTime, mapData, rivers, courses, selectedRiverId, error, activity, route, selectedSegmentId, favorites],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAppState = () => useContext(Ctx);
