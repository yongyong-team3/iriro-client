// 우회 코스 확인 (시안 2026-11-09)
//   지도: 위험 구간(빨강, 굵기 8) · 우회 경로(파랑 점선, 굵기 7) · 가운데 위험 표시
//   우회 경로가 있으면 '우회 코스에서 기록 시작', 없으면 '우회 경로 없음 · 기록 시작 불가'
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../components/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useAppState } from '../../context/AppState';
import { getDetours } from '../../api/trails';
import * as rec from '../../lib/recorder';
import { pathKm, pointAlong, toLatLng, toLatLngs } from '../../lib/geo';
import { BigButton, H, Icon, RIVER_STATUS, StatusChip } from '../../components/homeUi';
import { MyLocationDot } from '../../components/MyLocationDot';
import { RouteEnds } from '../../components/EndpointMarker';

export default function Detour() {
  const { id, routeId } = useLocalSearchParams(); // routeId = 선택한 코스 (코스 화면에서 들어왔을 때)
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { rivers, courses, activity, setRoute, loadTrail } = useAppState();
  const river = rivers?.find((r) => r.id === id);
  const [detours, setDetours] = useState(null); // null = 불러오는 중
  const [error, setError] = useState(null);
  const map = useRef(null);
  // 코스 화면에서 들어왔으면 그 코스의 선을 '원래 코스'로 써요 (없으면 하천길 전체 선)
  const path = courses?.find((c) => c.id === routeId)?.path ?? river?.path ?? [];
  const detour = detours?.[0] ?? null;
  const hazardAt = path.length > 1 ? pointAlong(path, pathKm(path) / 2) : null;

  useEffect(() => {
    if (river && !river.path) loadTrail(river.id);
  }, [river?.id]);

  useEffect(() => {
    let alive = true;
    getDetours(id, activity, routeId)
      .then((d) => alive && setDetours(d))
      .catch((e) => alive && (setError(e.message), setDetours([])));
    return () => {
      alive = false;
    };
  }, [id, activity, routeId]);

  useEffect(() => {
    const all = [...path, ...(detour?.path ?? [])];
    if (all.length < 2) return;
    const t = setTimeout(() => map.current?.fitToCoordinates(toLatLngs(all), { edgePadding: { top: 150, right: 40, bottom: 380, left: 40 }, animated: false }), 200);
    return () => clearTimeout(t);
  }, [path.length, detour?.id]);

  const start = () => {
    setRoute({
      id: `detour-${detour.id}`,
      name: `${river.name} 우회 코스`,
      trailName: `${river.name} 우회 코스`,
      courseId: routeId ?? null,
      detourId: detour.id, // 기록 저장(ACT-01) 때 같이 보내요 (activities.detour_id)
      detour: true, // 위험 구간을 피하는 경로라 ▶ 화면에서 바로 기록할 수 있어요
      path: detour.path,
      segments: [],
      distanceKm: Math.round(detour.distanceKm * 10) / 10,
    });
    // 3·2·1 카운트다운 뒤 측정 (최종 시안 기록 흐름)
    const c = courses?.find((x) => x.id === routeId);
    rec.prepare({
      activity,
      info: {
        courseId: routeId ?? null,
        trailName: `${river.name} 우회 코스`,
        routeName: `${river.name} 우회 코스`,
        detourId: detour.id,
        startPointId: c?.startPoints?.[0]?.id ?? null,
        planned: detour.path,
        place: (c?.area ?? '').split(' ').slice(0, 2).join(' ') || null,
      },
    });
    router.dismissTo('/record');
  };

  const none = detours !== null && !detour;
  // 서버(MAP-06)가 준 추가 거리를 우선, 없으면 직접 계산
  const extra = detour?.extraKm ?? (detour && path.length > 1 ? detour.distanceKm - pathKm(path) : null);

  return (
    <View style={{ flex: 1, backgroundColor: H.line }}>
      <MapView
        ref={map}
        style={StyleSheet.absoluteFill}
        initialRegion={{ latitude: 37.3245, longitude: 127.2355, latitudeDelta: 0.02, longitudeDelta: 0.02 }}
        showsUserLocation={false} // 시안 크기의 내 위치 표시(MyLocationDot)를 따로 그려요
        showsMyLocationButton={false}
        toolbarEnabled={false}
      >
        {path.length > 1 && <Polyline coordinates={toLatLngs(path)} strokeColor={RIVER_STATUS.flooded.fg} strokeWidth={8} lineCap="round" lineJoin="round" />}
        {detour && <Polyline coordinates={toLatLngs(detour.path)} strokeColor={H.brand} strokeWidth={7} lineDashPattern={[8, 10]} lineCap="round" zIndex={2} />}
        {hazardAt && (
          <Marker coordinate={toLatLng(hazardAt)} anchor={{ x: 0.5, y: 0.6 }} tracksViewChanges={false}>
            <Icon name="hazard" />
          </Marker>
        )}
        {/* 출발지·도착지 (통일된 표시) */}
        <RouteEnds path={path} zIndex={3} />
        <MyLocationDot />
      </MapView>

      <View style={[s.head, { paddingTop: Math.max(insets.top, 59) + 13 }]}>
        <View style={s.headRow}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={s.backHit} accessibilityRole="button" accessibilityLabel="뒤로 가기">
            <Icon name="back" />
          </Pressable>
          <Text style={s.headTitle}>우회 코스 확인</Text>
        </View>
      </View>
      <Text style={[s.mapLabel, { top: Math.max(insets.top, 59) + 62 }]}>{river?.name}</Text>

      <View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 34) + 65 }]}>
        <View style={s.handle} />
        <Text style={s.title}>{none ? '우회 경로 없음' : '우회 경로'}</Text>
        {river && <StatusChip river={{ ...river, status: 'flooded' }} size="lg" style={{ marginTop: 12 }} />}
        {detours === null ? (
          <Text style={s.desc}>우회 경로를 찾는 중…</Text>
        ) : none ? (
          <>
            <Text style={s.desc}>{error ? `우회 경로를 불러오지 못했어요. ${error}` : '이용 가능한 우회 경로가 없습니다'}</Text>
            <Text style={s.note}>위험 구간 코스 시작 제한</Text>
          </>
        ) : (
          <>
            <Text style={s.desc}>
              {detour.example ? '표시된 경로는 예시입니다' : `우회 ${detour.distanceKm.toFixed(1)}km`}
              {extra != null && !detour.example ? ` · 원래 코스보다 ${extra >= 0 ? '+' : ''}${extra.toFixed(1)}km` : ''}
            </Text>
            <Text style={s.note}>경로 상태 확인 후 시작</Text>
          </>
        )}
        <BigButton title={none ? '기록 시작 불가' : '우회 코스에서 기록 시작'} onPress={start} disabled={!detour || !river} muted={none} style={{ marginTop: 26 }} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  head: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: 'rgba(255,255,255,0.67)', paddingBottom: 12 },
  headRow: { flexDirection: 'row', alignItems: 'center', height: 28, paddingLeft: 28 },
  backHit: { width: 30, height: 30, justifyContent: 'center', marginLeft: -10, paddingLeft: 10 },
  headTitle: { fontSize: 20, fontWeight: '700', color: H.ink, marginLeft: 8 },
  mapLabel: { position: 'absolute', left: 22.6, fontSize: 12, color: H.sub },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: H.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 17 },
  handle: { alignSelf: 'center', width: 49, height: 5, borderRadius: 2.5, backgroundColor: H.line, marginTop: 9 },
  title: { fontSize: 20, fontWeight: '700', color: H.ink, marginTop: 19, marginLeft: 3 },
  desc: { fontSize: 12, color: H.sub, marginTop: 16, marginLeft: 3 },
  note: { fontSize: 12, color: H.sub, marginTop: 20, marginLeft: 3 },
});
