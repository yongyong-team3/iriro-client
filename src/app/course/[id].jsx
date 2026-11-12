// 코스 (최종 시안 2026-11-11 · 색·글꼴·버튼 위치 2차 반영 · 기록 흐름 반영)
//   ?ready=1 (▶ → 활동 고르기 → 준비 완료): 탭 대신 '러닝 기록' 카드 + '이 코스로 기록 시작' → 3·2·1 → 측정 화면
//   이 코스를 측정 중이면: 실시간 기록 카드 + '기록으로 돌아가기'
//   ‹ 코스 / 하천길 이름 / 둥근 지도 카드(거리·시간 칩, ★ · 내 위치 · 확대/축소, 출발 지점 안내) / AI 분석 결과 칩
//   탭: 구간 정보(코스 구간 · 총 길이 · 예상 시간 · 난이도 + 사진) · 수위 정보 · 공식 정보 / '이 코스로 기록 시작'
//   상황별 버튼: 이용 위험 → 우회 코스 확인 · 공식 통제 → 코스 이용 불가 · 확인 불가 → 다시 확인
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../components/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { useAppState } from '../../context/AppState';
import { COLOR } from '../../constants/colors';
import { checkRouteAvailability, getRoute } from '../../api/trails';
import { haversineKm } from '../../lib/geo';
import { nearestOnPath, pathFrom, pathKm, toLatLng, toLatLngs } from '../../lib/geo';
import { G2, H, IMG, Icon, RIVER_STATUS } from '../../components/homeUi';
import { COURSE_PHOTOS, courseKm, courseSituation, lineColor, minutesFor } from '../../components/courseUi';
import { prettyTime } from '../../lib/time';
import * as rec from '../../lib/recorder';
import RecordCard from '../../components/RecordCard';
import { Dot as RecDot } from '../../components/recUi';
import { MyLocationDot } from '../../components/MyLocationDot';
import { FillSvg } from '../../components/FillSvg';
import { EndpointMarker } from '../../components/EndpointMarker';
import { locateMe } from '../../lib/locate';

// '용인시 처인구 모현읍 월촌교 일대' → '용인시 처인구' (결과 화면 Place)
const placeOf = (area) => (area ?? '').split(' ').slice(0, 2).join(' ') || null;

const ACT_LABEL = { walk: '산책', run: '러닝', bike: '자전거' };

export default function Course() {
  const { id, ready } = useLocalSearchParams();
  const r = rec.useRecorder();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { courses, rivers, activity, setRoute, loadTrail, reload, favorites, toggleFavorite } = useAppState();
  // 예전 링크(하천길 id)로 들어와도 그 하천길의 첫 코스를 보여줘요
  // 목록에 없는 코스(즐겨찾기·기록에서 들어옴)는 MAP-08 코스 상세로 받아요
  const [fetched, setFetched] = useState(null);
  const listed = courses?.find((c) => c.id === id) ?? courses?.find((c) => c.trailId === id) ?? null;
  useEffect(() => {
    if (!listed && courses && id)
      getRoute(id)
        .then(setFetched)
        .catch(() => {});
  }, [!!listed, !!courses, id]);
  const course =
    listed ??
    (fetched ? { ...fetched, trailName: rivers?.find((r) => r.id === fetched.trailId)?.name ?? '', direction: '', tag: '코스', km: fetched.distanceKm, status: fetched.status ?? 'unknown' } : null);
  const trail = rivers?.find((r) => r.id === course?.trailId);
  const path = course?.path ?? trail?.path ?? [];
  const sit = courseSituation(course);
  const [picked, setPicked] = useState(null);
  const [checking, setChecking] = useState(false);
  const [tab, setTab] = useState('section');
  const [big, setBig] = useState(false); // '크게 보기': 지도 카드를 길게
  const map = useRef(null);

  useEffect(() => {
    if (course && !course.path && trail && !trail.path) loadTrail(trail.id); // 실서버: 코스 경로가 없으면 하천길 경로라도
  }, [course?.id]);

  useEffect(() => {
    if (path.length < 2) return;
    const t = setTimeout(() => map.current?.fitToCoordinates(toLatLngs(path), { edgePadding: { top: 60, right: 40, bottom: 40, left: 40 }, animated: false }), 250);
    return () => clearTimeout(t);
  }, [course?.id, path.length]);

  const start = picked ?? (path.length > 1 ? { point: path[0], index: 0 } : null);
  const sub = useMemo(() => (start ? pathFrom(path, start) : null), [picked, course?.id, path.length]);
  const totalKm = path.length > 1 ? pathKm(path) : (courseKm(course) ?? 0);
  const km = sub && sub.length > 1 ? pathKm(sub) : totalKm;
  const minutes = minutesFor(km, activity);

  // 서버 코스는 지정 출발점(startPoints)만 고를 수 있어요 → 누른 곳에서 가장 가까운 출발점
  const starts = course?.startPoints ?? [];
  const pick = (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    if (starts.length) {
      const sp = starts.reduce((a, b) => (haversineKm(b.point, [latitude, longitude]) < haversineKm(a.point, [latitude, longitude]) ? b : a));
      const at = nearestOnPath(path, sp.point);
      if (at.index >= path.length - 1) return;
      setPicked({ ...at, startPointId: sp.id, name: sp.name });
      return;
    }
    const at = nearestOnPath(path, [latitude, longitude]);
    if (at.index >= path.length - 1) return;
    setPicked(at);
  };
  const locate = () => locateMe(map);

  const startPointId = picked?.startPointId ?? starts[0]?.id ?? null;
  const go = () => {
    setRoute({
      id: `course-${course.id}`,
      courseId: course.id,
      startPointId,
      trailName: course.trailName,
      name: course.name,
      path: sub,
      picked: !!picked,
      segments: [],
      distanceKm: Math.round(km * 10) / 10,
    });
    // 3·2·1 카운트다운 뒤 측정 (최종 시안)
    rec.prepare({
      activity,
      info: { courseId: course.id, trailName: course.trailName, routeName: course.name, startPointId, planned: sub, place: placeOf(course.area) },
    });
    router.dismissTo('/record');
  };
  // 이 코스를 측정 중인지 · 기록 준비 화면인지
  const recordingHere = r.phase !== 'idle' && !!course && r.info?.courseId === course.id;
  const cardMode = recordingHere || ready === '1';
  // 기록 시작 직전 최신 통제 확인 (GET /trails/{id}/routes → /routes/{routeId}/availability)
  const begin = async () => {
    setChecking(true);
    let check;
    try {
      check = await checkRouteAvailability(course.id, startPointId, course); // MAP-07
    } catch {
      check = { available: null };
    } finally {
      setChecking(false);
    }
    if (check.available === false) {
      Alert.alert('지금은 이용하기 어려워요', check.warnings?.join('\n') || '최신 통제 정보를 확인해 주세요.', [
        { text: '취소', style: 'cancel' },
        { text: '그래도 시작', style: 'destructive', onPress: go },
      ]);
    } else if (check.available === null) {
      Alert.alert('최신 통제 정보를 확인하지 못했어요', '현장 안내를 확인하고 이용해 주세요.', [
        { text: '취소', style: 'cancel' },
        { text: '시작', onPress: go },
      ]);
    } else if (check.warnings?.length) {
      // 서버는 수위가 높아도 시작을 허용하고 경고를 줘요 → 보여주고 확인받기
      Alert.alert('시작 전 확인해 주세요', check.warnings.join('\n'), [
        { text: '취소', style: 'cancel' },
        { text: '확인하고 시작', onPress: go },
      ]);
    } else go();
  };

  const chip = {
    available: { bg: G2.okChip, fg: G2.ok, text: '이용 가능', icon: 'sparkle' },
    recovering: { bg: RIVER_STATUS.recovering.bg, fg: RIVER_STATUS.recovering.fg, text: '회복 중', icon: 'sparkle' },
    flooded: { bg: RIVER_STATUS.flooded.bg, fg: RIVER_STATUS.flooded.fg, text: '이용 위험', icon: 'warnSmall' },
    closed: { bg: RIVER_STATUS.flooded.bg, fg: RIVER_STATUS.flooded.fg, text: '공식 통제 중', icon: 'warnSmall' },
    unknown: { bg: H.fill, fg: H.sub, text: '확인 불가', icon: null },
  }[sit];
  const button = {
    available: { title: checking ? '통제 정보 확인 중…' : '이 코스로 기록 시작', onPress: begin, disabled: checking || !course },
    recovering: { title: '이 코스로 기록 시작', onPress: begin, disabled: !course },
    flooded: { title: '우회 코스 확인', onPress: () => router.push({ pathname: '/detour/[id]', params: { id: course.trailId, routeId: course.id } }) },
    closed: { title: '공식 통제 중 · 코스 이용 불가', disabled: true, muted: true },
    unknown: { title: '다시 확인', onPress: () => (reload(), course && loadTrail(course.trailId)) },
  }[sit];
  const shownButton = recordingHere ? { title: '기록으로 돌아가기', onPress: () => router.dismissTo('/record') } : button;
  const fav = course && favorites.includes(course.id);

  const wl = trail?.waterLevel;
  const off = trail?.official ?? course?.official ?? null;
  const rc = trail?.recovery ?? course?.recovery ?? null;
  const zoom = async (d) => {
    const cam = await map.current?.getCamera?.();
    if (cam?.zoom != null) map.current.animateCamera({ zoom: cam.zoom + d }, { duration: 200 });
  };
  const level = totalKm < 3 ? '쉬움' : totalKm < 6 ? '보통' : '어려움'; // 거리 기준 (3km 미만 쉬움 · 6km 미만 보통)

  return (
    <View style={{ flex: 1, backgroundColor: H.white }}>
      <View style={[s.headRow, { marginTop: Math.max(insets.top, 59) + 13 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={s.back} accessibilityRole="button" accessibilityLabel="뒤로 가기">
          <Icon name="back2" />
        </Pressable>
        <Text style={s.headTitle}>코스</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 34) + 13 }}>
        <Text style={s.trail}>{course ? course.trailName || course.name : '코스를 불러오는 중…'}</Text>

        {/* 둥근 지도 카드 (최종 시안: 오른쪽 위 ★ · 내 위치 · 확대/축소, 아래 출발 지점 안내) */}
        <View style={[s.mapWrap, s.shadow]}>
          <View style={[s.mapCard, big && { height: 440 }]}>
            <MapView
              ref={map}
              style={StyleSheet.absoluteFill}
              initialRegion={{ latitude: 37.3385, longitude: 127.2315, latitudeDelta: 0.012, longitudeDelta: 0.012 }}
              showsUserLocation={false} // 시안 크기의 내 위치 표시(MyLocationDot)를 따로 그려요
              showsMyLocationButton={false}
              toolbarEnabled={false}
              userInterfaceStyle="light"
              onPress={pick}
            >
              {path.length > 1 && (
                <Polyline
                  key={`course-line-${sit}`} // 상태가 바뀌면 선을 새로 그려요 (안드로이드에서 색이 예전 색으로 돌아가는 문제 방지)
                  coordinates={toLatLngs(path)}
                  strokeColor={lineColor(sit)}
                  strokeWidth={6}
                  lineCap="round"
                  lineJoin="round"
                  tappable
                  onPress={pick}
                />
              )}
              {/* 지정 출발점 (서버 코스) */}
              {starts.map((sp) => (
                <Marker
                  key={sp.id}
                  coordinate={toLatLng(sp.point)}
                  title={sp.name}
                  anchor={{ x: 0.5, y: 0.5 }}
                  tracksViewChanges={false}
                  onPress={() => pick({ nativeEvent: { coordinate: toLatLng(sp.point) } })}
                >
                  <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: H.white, borderWidth: 3, borderColor: H.brandLine }} />
                </Marker>
              ))}
              {start && <EndpointMarker point={start.point} zIndex={4} />}
              {path.length > 1 && <EndpointMarker point={path[path.length - 1]} zIndex={4} />}
              {recordingHere && r.track.length > 1 && <Polyline coordinates={toLatLngs(r.track)} strokeColor="#0B38FF" strokeWidth={5} lineCap="round" lineJoin="round" zIndex={3} />}
              {recordingHere && r.track.length > 0 && (
                <Marker coordinate={toLatLng(r.track[r.track.length - 1])} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false} zIndex={4}>
                  <RecDot color={H.brand} big />
                </Marker>
              )}
              <MyLocationDot mode={recordingHere ? 'travel' : 'dot'} />
            </MapView>
            <View style={[s.mapChip, s.shadow]}>
              <Image source={IMG.walk} style={{ width: 24, height: 21 }} resizeMode="contain" />
              <Text style={s.mapChipText}>{km.toFixed(1)}km</Text>
              <View style={s.mapChipBar} />
              <Text style={s.mapChipText}>약{minutes}분</Text>
            </View>
            <View style={s.mapBtns}>
              {course && (
                <Pressable style={[s.round, s.shadow]} onPress={() => toggleFavorite(course.id)} accessibilityRole="button" accessibilityLabel={fav ? '즐겨찾기 해제' : '즐겨찾기에 저장'}>
                  <Mi d={MI.star} size={20} color={fav ? H.brand : H.hint} fill={fav} />
                </Pressable>
              )}
              <Pressable style={[s.round, s.shadow]} onPress={locate} accessibilityRole="button" accessibilityLabel="내 위치">
                <Icon name="locate2" />
              </Pressable>
              <View style={[s.zoom, s.shadow]}>
                <Pressable style={s.zoomBtn} onPress={() => zoom(1)} accessibilityRole="button" accessibilityLabel="지도 확대">
                  <Mi d={MI.plus} size={20} color={G2.text} />
                </Pressable>
                <Pressable style={s.zoomBtn} onPress={() => zoom(-1)} accessibilityRole="button" accessibilityLabel="지도 축소">
                  <Mi d={MI.minus} size={20} color={G2.text} />
                </Pressable>
              </View>
            </View>
            {/* 출발 지점 안내: 지도 위에 흰색이 아래에서 위로 옅어지며 겹쳐요 (최종 시안: 높이의 46%) */}
            <View style={[s.guide, (sit === 'flooded' || sit === 'closed') && { opacity: 0 }]} pointerEvents="none">
              <FillSvg>
                <Defs>
                  <LinearGradient id="guide" x1="0" y1="1" x2="0" y2="0">
                    <Stop offset="0" stopColor="#FFFFFF" stopOpacity="1" />
                    <Stop offset="0.45" stopColor="#FFFFFF" stopOpacity="0.9" />
                    <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
                  </LinearGradient>
                </Defs>
                <Rect x="0" y="0" width="100%" height="100%" fill="url(#guide)" />
              </FillSvg>
              <Text style={s.desc}>
                {picked
                  ? `${picked.name ?? '선택한 지점'}에서 출발해요`
                  : starts.length
                    ? `지도에서 출발점을 선택해 주세요 (${starts.map((x) => x.name).join(' · ')})`
                    : '지도에서 코스 위 출발 지점을 선택해 주세요'}
              </Text>
              <Text style={s.note}>출발 지점에 따라 거리와 예상 시간이 달라져요</Text>
            </View>
            <Pressable style={s.bigBtn} onPress={() => setBig((v) => !v)} hitSlop={10} accessibilityRole="button" accessibilityLabel={big ? '지도 작게 보기' : '지도 크게 보기'}>
              <Text style={s.bigText}>{big ? '작게 보기 ▴' : '크게 보기 ▾'}</Text>
            </Pressable>
            {/* 이용 위험 · 공식 통제: 지도 전체를 어둡게 덮고 가운데 안내 (시안) */}
            {(sit === 'flooded' || sit === 'closed') && (
              <View style={[s.blockDim, { height: big ? 440 : 258 }]} pointerEvents="none" accessibilityLabel="지금은 이용이 불가능해요">
                <Text style={s.blockText}>지금은 이용이 불가능해요</Text>
              </View>
            )}
          </View>
        </View>

        <View style={{ paddingHorizontal: 28 }}>
          {cardMode ? (
            <RecordCard
              activity={recordingHere ? r.activity : activity}
              elapsed={recordingHere ? r.elapsed : 0}
              km={recordingHere ? pathKm(r.track) : 0}
              chip={recordingHere ? null : { label: `AI 분석 결과 - ${chip.text}`, fg: chip.fg, bg: chip.bg, icon: chip.icon === 'sparkle' ? 'sparkle' : chip.icon ? 'alert' : null }}
              style={{ marginTop: 19, marginHorizontal: -9 }}
            />
          ) : (
            <>
              <Pressable
                style={[s.aiChip, { backgroundColor: chip.bg }]}
                onPress={() => course && router.push(`/river/${course.trailId}`)}
                accessibilityRole="button"
                accessibilityLabel={`AI 분석 결과 ${chip.text}, 구간 상태 보기`}
              >
                {chip.icon && <Icon name={chip.icon} size={14} color={chip.icon === 'sparkle' ? chip.fg : undefined} />}
                <Text style={[s.aiText, { color: chip.fg }]}>AI 분석 결과 - {chip.text}</Text>
              </Pressable>
              {course?.forecastRisk && <Text style={s.riskNote}>⚠ AI 예측: 1시간 뒤 이용 위험 예상 · 수위가 빠르게 오르고 있어요</Text>}
              {course?.status === 'recovering' && <Text style={s.riskNote}>물이 빠지는 중이에요. 물이 고인 곳은 피해서 이동해 주세요</Text>}

              {/* 탭: 구간 정보 · 수위 정보 · 공식 정보 */}
              <View style={s.tabs} accessibilityRole="tablist">
                {TABS.map((tb) => {
                  const on = tab === tb.id;
                  return (
                    <Pressable key={tb.id} style={[s.tab, on && s.tabOn]} onPress={() => setTab(tb.id)} accessibilityRole="tab" accessibilityState={{ selected: on }}>
                      <Mi d={MI[tb.icon]} size={14} color={on ? H.white : G2.text} />
                      <Text style={[s.tabText, on && { color: H.white }]}>{tb.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {tab === 'section' && (
                <View style={[s.box, s.shadow, { flexDirection: 'row', alignItems: 'center' }]}>
                  <View style={{ flex: 1 }}>
                    <InfoRow icon="pin" label="코스 구간" value={(course?.name ?? '-').replace('→', ' → ')} />
                    <InfoRow icon="swap" label="총 길이" value={picked ? `${km.toFixed(1)}km (전체 ${totalKm.toFixed(1)}km)` : `${totalKm.toFixed(1)}km`} />
                    <InfoRow icon="walk" label="예상 시간" value={`약 ${minutes}분`} />
                    <InfoRow icon="bars" label="코스 난이도" chip={level} />
                  </View>
                  <View style={s.vline} />
                  {COURSE_PHOTOS[course?.photo] ? (
                    <Image source={COURSE_PHOTOS[course.photo]} style={s.photo} accessibilityLabel="코스 사진" />
                  ) : (
                    <View style={[s.photo, { backgroundColor: G2.soft }]} accessibilityLabel="사진 준비 중" />
                  )}
                </View>
              )}

              {tab === 'water' && (
                <View style={[s.box, s.shadow]}>
                  {wl ? (
                    <>
                      <InfoRow icon="drop" label="현재 수위" value={`${wl.value.toFixed(2)} ${wl.unit}${trail?.trend ? ` · ${TREND[trail.trend] ?? ''}` : ''}`} wide />
                      {wl.predicted != null && <InfoRow icon="sparkle" label="1시간 뒤 예측" value={`${wl.predicted.toFixed(2)} ${wl.unit} (AI)`} wide />}
                      {wl.interest != null && <InfoRow icon="bars" label="참고 수위" value={`${wl.interest} ${wl.unit}`} wide />}
                      <InfoRow icon="pin" label="관측" value={[wl.station, wl.observedAt && prettyTime(wl.observedAt, { withDate: false })].filter(Boolean).join(' · ')} wide />
                      {rc?.available && rc.estimate ? <Text style={s.tabNote}>AI 회복 예측 · {prettyTime(rc.estimate)} 이후 다시 이용할 수 있을 것으로 예상돼요</Text> : null}
                    </>
                  ) : (
                    <Text style={s.emptyTab}>수위 정보 미확인{'\n'}관측 지점이 연결되면 표시됩니다</Text>
                  )}
                  <Pressable onPress={() => course && router.push(`/river/${course.trailId}`)} hitSlop={8} accessibilityRole="button">
                    <Text style={s.more}>구간 상태 자세히 보기 ›</Text>
                  </Pressable>
                </View>
              )}

              {tab === 'official' && (
                <View style={[s.box, s.shadow, off && { backgroundColor: RIVER_STATUS.flooded.bg }]}>
                  <Text style={[s.offTitle, off && { color: RIVER_STATUS.flooded.fg }]}>공식 통제 정보</Text>
                  <Text style={[s.offValue, off && { color: RIVER_STATUS.flooded.fg }]}>{off ? '통제 중' : trail?.officialKnown ? '통제 없음' : '정보 미확인'}</Text>
                  <Text style={s.tabNote}>
                    {off
                      ? [off.reason, off.source, off.since && `${prettyTime(off.since)}부터`].filter(Boolean).join(' · ') || '현장 안내를 확인해 주세요'
                      : trail?.officialKnown
                        ? '용인시 통제 공지 기준이에요'
                        : '출처·확인 시각이 연결되면 표시됩니다'}
                  </Text>
                  <Text style={s.tabNote}>AI 분석 결과와 공식 통제 정보는 별개입니다.</Text>
                </View>
              )}
            </>
          )}
          {/* 시안: 버튼은 정보 상자 바로 아래 */}
          <View style={[s.btnWrap, cardMode && { marginTop: 73 }]}>
            <Pressable
              disabled={shownButton.disabled}
              onPress={shownButton.onPress}
              style={({ pressed }) => [s.btn, shownButton.disabled && { backgroundColor: shownButton.muted ? H.fill : H.brandLine }, pressed && { opacity: 0.88 }]}
              accessibilityRole="button"
              accessibilityState={{ disabled: !!shownButton.disabled }}
            >
              <Text style={[s.btnText, shownButton.muted && { color: H.sub, fontWeight: '600' }]}>{shownButton.title}</Text>
            </Pressable>
          </View>
          {/* 기록 준비: 시연 모드(코스를 20배속 가상 이동) 켜고 끄기 — 시안에는 없지만 발표 시연용으로 남겨요 */}
          {cardMode && !recordingHere && sit !== 'flooded' && sit !== 'closed' && sit !== 'unknown' && <SimToggle />}
          {course?.mock && <Text style={s.mock}>임시 코스예요 (목업). 실제 코스 정보가 정해지면 바뀌어요.</Text>}
        </View>
      </ScrollView>
    </View>
  );
}

const TABS = [
  { id: 'section', label: '구간 정보', icon: 'layers' },
  { id: 'water', label: '수위 정보', icon: 'drop' },
  { id: 'official', label: '공식 정보', icon: 'info' },
];
const TREND = { rising: '오르는 중', falling: '내려가는 중', steady: '변화 적음' };
// 작은 선 아이콘 (24 기준)
const MI = {
  star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  plus: 'M5 12h14M12 5v14',
  minus: 'M5 12h14',
  layers: 'M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  drop: 'M12 2.7l5.7 5.6a8 8 0 1 1-11.3 0L12 2.7z',
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-4M12 8h.01',
  pin: 'M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0zM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  swap: 'M17 3l4 4-4 4M3 7h18M7 21l-4-4 4-4M21 17H3',
  walk: 'M13 4a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM7 21l3-9 3 3v6M10 12l-1-4 4-1 3 3 3 1',
  bars: 'M18 20V10M12 20V4M6 20v-6',
  sparkle: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z',
};
function Mi({ d, size = 16, color, fill }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={d} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill={fill ? color : 'none'} />
    </Svg>
  );
}

function SimToggle() {
  const [on, setOn] = useState(rec.simOn());
  const flip = () => {
    rec.setSim(!on);
    setOn(!on);
  };
  return (
    <Pressable onPress={flip} hitSlop={8} accessibilityRole="switch" accessibilityState={{ checked: on }}>
      <Text style={s.simText}>{on ? `시연 모드 켜짐 (코스를 ${rec.SIM_FACTOR}배속으로 이동) · 실제 GPS로 바꾸기` : '실제 GPS로 기록 · 시연 모드로 바꾸기'}</Text>
    </Pressable>
  );
}

function InfoRow({ icon, label, value, chip, wide }) {
  return (
    <View style={s.infoRow}>
      <Mi d={MI[icon]} size={15} color={G2.text} />
      <Text style={[s.infoLabel, wide && { width: 92 }]}>{label}</Text>
      {chip ? (
        <View style={s.levelChip}>
          <Text style={s.levelText}>{chip}</Text>
        </View>
      ) : (
        <Text style={s.infoValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
          {value}
        </Text>
      )}
    </View>
  );
}

function Dot({ inner, size, innerSize }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: H.white, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: innerSize, height: innerSize, borderRadius: innerSize / 2, backgroundColor: inner }} />
    </View>
  );
}

const s = StyleSheet.create({
  // 안드로이드에서 absoluteFill 이 글자 높이로만 잡히는 일이 있어 지도 높이를 직접 줘요. 버튼(그림자 elevation 3)보다 위에 덮어요
  blockDim: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: 'rgba(24,38,48,0.55)', alignItems: 'center', justifyContent: 'center', zIndex: 10, elevation: 10 },
  blockText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
  riskNote: { fontSize: 12, color: COLOR.warn, fontWeight: '600', marginTop: 8 },
  headRow: { flexDirection: 'row', alignItems: 'center', height: 30, paddingLeft: 27, paddingRight: 22 },
  back: { width: 20 },
  headTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: H.ink, marginLeft: 7 },
  trail: { fontSize: 16, fontWeight: '600', color: '#000', marginTop: 20, marginLeft: 32.5 },
  mapWrap: { marginHorizontal: 19, marginTop: 9, borderRadius: 16, backgroundColor: H.white },
  mapCard: { height: 258, borderRadius: 16, overflow: 'hidden', backgroundColor: H.map },
  mapBtns: { position: 'absolute', top: 9, right: 11, gap: 9, alignItems: 'center' },
  round: { width: 38, height: 38, borderRadius: 19, backgroundColor: H.white, alignItems: 'center', justifyContent: 'center' },
  zoom: { width: 38, borderRadius: 19, backgroundColor: H.white, alignItems: 'center', paddingVertical: 4 },
  zoomBtn: { width: 38, height: 28, alignItems: 'center', justifyContent: 'center' },
  guide: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 118, justifyContent: 'flex-end', paddingHorizontal: 16, paddingBottom: 14 },
  shadow: { shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 5, shadowOffset: { width: 0, height: 0 }, elevation: 3 },
  mapChip: {
    position: 'absolute',
    top: 9,
    left: 10,
    height: 27,
    borderRadius: 13.5,
    backgroundColor: H.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 3,
    paddingRight: 12,
    gap: 4,
  },
  mapChipText: { fontSize: 12, fontWeight: '600', color: G2.text },
  mapChipBar: { width: 1, height: 8, backgroundColor: G2.text, marginHorizontal: 2 },
  aiChip: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, height: 29, borderRadius: 14.5, paddingLeft: 12, paddingRight: 15, marginTop: 15 },
  aiText: { fontSize: 12, fontWeight: '600' },
  desc: { fontSize: 13, fontWeight: '600', color: H.sub },
  note: { fontSize: 12, color: H.sub, opacity: 0.61, marginTop: 3 },
  tabs: { flexDirection: 'row', height: 27, borderRadius: 13.5, backgroundColor: 'rgba(227,241,253,0.65)', marginTop: 12 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 13.5 },
  tabOn: { backgroundColor: H.brand },
  tabText: { fontSize: 12, fontWeight: '500', color: G2.text },
  box: { marginTop: 11, borderRadius: 18, backgroundColor: H.white, paddingLeft: 16, paddingRight: 13, paddingVertical: 12, marginHorizontal: 1 },
  infoRow: { flexDirection: 'row', alignItems: 'center', height: 30, gap: 7 },
  infoLabel: { width: 60, fontSize: 12, color: G2.text },
  infoValue: { flex: 1, fontSize: 12, fontWeight: '600', color: '#000' },
  levelChip: { height: 20, borderRadius: 10, paddingHorizontal: 14, justifyContent: 'center', backgroundColor: G2.okChip },
  levelText: { fontSize: 12, fontWeight: '600', color: G2.ok },
  vline: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: H.line, marginLeft: 4, marginRight: 14 },
  photo: { width: 109, height: 105, borderRadius: 9 },
  tabNote: { fontSize: 12, color: H.sub, marginTop: 8, lineHeight: 17 },
  emptyTab: { fontSize: 12, color: H.sub, lineHeight: 19, paddingVertical: 6 },
  more: { fontSize: 12, fontWeight: '700', color: H.brand, marginTop: 12 },
  offTitle: { fontSize: 12, fontWeight: '700', color: H.sub },
  offValue: { fontSize: 20, fontWeight: '800', color: H.ink, marginTop: 8 },
  mock: { fontSize: 12, color: H.sub, marginTop: 10 },
  btnWrap: { marginTop: 34, marginHorizontal: -2 },
  bigBtn: { position: 'absolute', right: 10, bottom: 10 },
  bigText: { fontSize: 9, fontWeight: '500', color: G2.text },
  simText: { fontSize: 12, color: H.sub, textDecorationLine: 'underline', textAlign: 'center', marginTop: 12 },
  btn: { height: 54, borderRadius: 27, backgroundColor: H.brand, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: H.white, fontSize: 15, fontWeight: '700' },
});
