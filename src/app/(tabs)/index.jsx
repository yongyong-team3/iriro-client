// 지도 홈 (홈 2차 시안 2026-11-09 저녁 · 최종 시안 2026-11-11 색·글꼴·즐겨찾기 반영)
//   비가 오면 (시연: 2 폭우 · 3 침수 위험 장면 / 서버: WEATHER-01 condition RAINY)
//     ① 비 화면 3초(시트 접힘) → ② 이용 위험 코스면 경고 삼각형 → ③ 말풍선 + 시트 반으로 (최종 시안 순서)
//   위: 로고 · 알림 / '오늘은 어디로 나가볼까요?' 검색(마이크) / 산책·러닝·자전거 · '이용 가능만' 토글
//   오른쪽: 내 위치 · 즐겨찾기(★) · 확대/축소
//   아래 시트 '내 주변 코스': 손잡이를 끌거나 눌러서 접힘 · 반 · 전체 3단계
//   코스 카드를 누르면 코스 화면. 월촌교→매산교만 실제 코스, 나머지는 임시 목업이에요.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Image, PanResponder, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Text } from '../../components/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import MapView, { Polyline } from 'react-native-maps';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import * as Location from 'expo-location';
import { useAppState } from '../../context/AppState';
import { midPoint, toLatLngs } from '../../lib/geo';
import RiskMarker from '../../components/RiskMarker';
import RainOverlay from '../../components/RainOverlay';
import { currentWeather } from '../../api/me';
import { closePickSheet, usePickSheet } from '../../lib/pickSheet';
import { Lettering } from '../../components/RecordCard';
import { useNotifications } from '../../lib/notifications';
import { COLOR } from '../../constants/colors';
import { SceneBar } from '../../components/DemoBanner';
import { USE_MOCK } from '../../api/client';
import { G2, H, IMG, Icon, Logo, RIVER_STATUS } from '../../components/homeUi';
import { CourseCard, courseKm, courseSituation, lineColor, minutesFor } from '../../components/courseUi';
import { useTabBarHeight } from './_layout';
import { MyLocationDot } from '../../components/MyLocationDot';
import { locateMe } from '../../lib/locate';
import { CalendarGlyph, DemoCalendar } from '../../components/DemoCalendar';

const ACTS = [
  { key: 'walk', label: '산책', img: 'walk', w: 68 },
  { key: 'run', label: '러닝', img: 'run', w: 68 },
  { key: 'bike', label: '자전거', img: 'bike', w: 82 },
];
const STATUS_TOP = 59; // 시안 상태바 높이
const FAV_RISE = 129; // 즐겨찾기 시트는 검색칸 위까지 올라와요 (시안 top 81 = 210 - 129)

export default function Home() {
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const tabH = useTabBarHeight();
  const router = useRouter();
  const app = useAppState();
  const { courses, rivers, activity, setActivity, favorites, toggleFavorite, demoMode, scene, route } = app;
  const picking = usePickSheet(); // 하단 ▶ → '어떤 활동을 기록할까요?' 시트
  const [calOpen, setCalOpen] = useState(false); // 달력(날짜·시각 골라 보기)
  // 지도 화면을 떠나면(다른 탭 · 다른 화면) 활동 고르기 창은 닫아요
  useFocusEffect(useCallback(() => () => closePickSheet(), []));
  const [onlyOk, setOnlyOk] = useState(false);
  const [onlyFav, setOnlyFav] = useState(false);
  const [favSort, setFavSort] = useState('recent'); // 즐겨찾기 정렬: 최신순 · 이름순
  const map = useRef(null);
  const top = Math.max(insets.top - STATUS_TOP, 0); // 시안은 상태바 59 기준: 상태바가 얇은 폰(안드로이드)에서도 시안 위치 그대로
  const { unread } = useNotifications();

  const list = useMemo(() => (courses ?? []).filter((c) => (!onlyOk || courseSituation(c) === 'available') && (!onlyFav || favorites.includes(c.id))), [courses, onlyOk, onlyFav, favorites]);
  // 즐겨찾기 목록: 최신순(나중에 저장한 것이 위) · 이름순
  const favList = useMemo(() => {
    const l = [...list];
    if (favSort === 'name') return l.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    return l.sort((a, b) => favorites.indexOf(b.id) - favorites.indexOf(a.id));
  }, [list, favSort, favorites]);
  const badge = badgeOf(rivers?.find((r) => r.id === courses?.[0]?.trailId) ?? rivers?.[0]);

  // ── 아래 시트 3단계 (시안 852 높이 기준 top: 전체 210 · 반 523 · 접힘 696) ──
  const fullTop = 210 + top;
  const snaps = [onlyFav ? -FAV_RISE : 0, screenH - 329 - fullTop, screenH - 156 - fullTop]; // translateY
  const [snap, setSnap] = useState(1);
  const y = useRef(new Animated.Value(snaps[1])).current;
  const yNow = useRef(snaps[1]);
  const snapsRef = useRef(snaps);
  snapsRef.current = snaps;
  useEffect(() => {
    const id = y.addListener(({ value }) => (yNow.current = value));
    return () => y.removeListener(id);
  }, []);
  const goSnap = (i) => {
    setSnap(i);
    Animated.spring(y, { toValue: snapsRef.current[i], useNativeDriver: true, bounciness: 2 }).start();
  };
  // 즐겨찾기를 켜면 시트를 끝까지 올리고, 끄면 반으로 내려요 (처음 한 번은 건너뜀)
  const favFirst = useRef(true);
  useEffect(() => {
    if (favFirst.current) return void (favFirst.current = false);
    goSnap(onlyFav ? 0 : 1);
  }, [onlyFav]);
  // ── 비 화면 → 경고 → 말풍선 순서 ──
  //   stage: idle(평소) · rain(비 3초) · warn(삼각형만) · done(말풍선 + 시트 반)
  const [stage, setStage] = useState('idle');
  const [rainKey, setRainKey] = useState(null);
  const timer = useRef(null);
  const favRef = useRef(onlyFav);
  favRef.current = onlyFav;
  const hasRiskRef = useRef(false);
  hasRiskRef.current = list.some((c) => courseSituation(c) === 'flooded');
  const startRain = () => {
    clearTimeout(timer.current);
    setStage('rain');
    setRainKey(Date.now());
    if (!favRef.current) goSnap(2); // 시안: 비 오는 동안 시트는 접힘
  };
  const rainEnded = () => {
    const show = () => {
      setStage('done');
      if (!favRef.current) goSnap(1);
    };
    if (!hasRiskRef.current) return show();
    setStage('warn'); // 경고 삼각형만 먼저
    timer.current = setTimeout(show, 1200);
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  // 시연: 2 폭우 · 3 침수 위험 장면을 누를 때마다
  useEffect(() => {
    if (USE_MOCK && (scene?.id === 'rain' || scene?.id === 'flood')) startRain();
  }, [scene?.id]);
  // 서버: 날씨가 '비'로 바뀌면 (10분마다 확인, 앱을 열었을 때 비가 오고 있으면 한 번)
  useEffect(() => {
    if (USE_MOCK) return;
    let last = null;
    let alive = true;
    const check = () =>
      currentWeather()
        .then((w) => {
          if (!alive || !w) return;
          if (w.condition === 'RAINY' && last !== 'RAINY') startRain();
          last = w.condition;
        })
        .catch(() => {});
    check();
    const id = setInterval(check, 10 * 60 * 1000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  // 시트를 끝까지 올리면: 뒤 지도는 10% 어둡게, 시트는 흰색 (최종 시안)
  const dim = y.interpolate({ inputRange: [0, Math.max(snaps[1], 1)], outputRange: [1, 0], extrapolate: 'clamp' });
  const tint = y.interpolate({ inputRange: [0, Math.max(snaps[1], 1)], outputRange: [0, 1], extrapolate: 'clamp' });
  const startY = useRef(0);
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 6,
      onPanResponderGrant: () => (startY.current = yNow.current),
      onPanResponderMove: (_, g) => {
        const sn = snapsRef.current;
        y.setValue(Math.min(Math.max(startY.current + g.dy, sn[0]), sn[2]));
      },
      onPanResponderRelease: (_, g) => {
        const sn = snapsRef.current;
        const target = startY.current + g.dy + g.vy * 120;
        let best = 0;
        sn.forEach((v, i) => Math.abs(v - target) < Math.abs(sn[best] - target) && (best = i));
        goSnap(best);
      },
    }),
  ).current;

  // 달력에서 시각을 고르면: 그 하천 코스가 한눈에 보이게 지도를 옮겨요 (위 머리·아래 목록에 가리지 않게 여백)
  const focusRiver = () => {
    const c = courses?.find((x) => x.id === (route?.courseId ?? 'wolchon-maesan')) ?? courses?.find((x) => x.path?.length > 1);
    if (!(c?.path?.length > 1)) return;
    setTimeout(() => map.current?.fitToCoordinates(toLatLngs(c.path), { edgePadding: { top: 230 + top, right: 70, bottom: 360, left: 40 }, animated: true }), 350);
  };

  const zoom = async (d) => {
    const cam = await map.current?.getCamera();
    if (cam) map.current.animateCamera({ zoom: (cam.zoom ?? 14) + d }, { duration: 250 });
  };
  const locate = () => locateMe(map);

  return (
    <View style={{ flex: 1, backgroundColor: H.line }}>
      <MapView
        ref={map}
        style={StyleSheet.absoluteFill}
        initialRegion={{ latitude: 37.3265, longitude: 127.2375, latitudeDelta: 0.014, longitudeDelta: 0.014 }}
        showsUserLocation={false} // 시안 크기의 내 위치 표시(MyLocationDot)를 따로 그려요
        showsMyLocationButton={false}
        showsCompass={false}
        onPress={() => picking && closePickSheet()}
        toolbarEnabled={false}
        userInterfaceStyle="light"
      >
        {list.map((c) =>
          c.path ? (
            <Polyline
              key={`${c.id}-${courseSituation(c)}`} // 상태가 바뀌면 선을 새로 그려요 (안드로이드에서 빨간 선이 파란 선으로 되돌아가던 문제)
              coordinates={toLatLngs(c.path)}
              strokeColor={lineColor(courseSituation(c))}
              strokeWidth={5}
              lineCap="round"
              tappable
              onPress={() => router.push(`/course/${c.id}`)}
            />
          ) : null,
        )}
        {/* 이용 위험 코스: 빨간 경고 삼각형 + '이용 위험이 있어요!' (최종 시안) */}
        {list
          .filter((c) => stage !== 'rain' && courseSituation(c) === 'flooded')
          .map((c) => (
            <RiskMarker key={`risk-${c.id}`} point={c.riskPoint ?? midPoint(c.path)} bubble={stage !== 'warn'} onPress={() => router.push(`/course/${c.id}`)} />
          ))}
        <MyLocationDot />
      </MapView>

      {/* 위쪽 회색 그라데이션 (시안: #BBBBBB 19% → 0, 높이 216) */}
      <View style={[s.topFade, { height: 216 + top }]} pointerEvents="none">
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="top" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#BBBBBB" stopOpacity="0.19" />
              <Stop offset="1" stopColor="#BBBBBB" stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#top)" />
        </Svg>
      </View>

      {/* 오른쪽 지도 버튼 (시안 x 333 · y 340 / 387 / 434) + 맨 위 달력(날짜·시각 골라 보기, 시연 데이터가 있을 때만) */}
      <View style={[s.ctrls, { top: (USE_MOCK ? 293 : 340) + top }]} pointerEvents="box-none">
        {USE_MOCK && (
          <Pressable
            style={[s.round, s.shadow, scene.time && { backgroundColor: G2.soft }]}
            onPress={() => setCalOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={scene.time ? `날짜·시각 골라 보기, 지금 ${scene.caption}` : '날짜·시각 골라 보기'}
          >
            <CalendarGlyph color={scene.time ? H.brand : undefined} />
          </Pressable>
        )}
        <Pressable style={[s.round, s.shadow]} onPress={locate} accessibilityRole="button" accessibilityLabel="내 위치">
          <Icon name="locate2" />
        </Pressable>
        <Pressable
          style={[s.round, s.shadow, onlyFav && { backgroundColor: G2.soft }]}
          onPress={() => setOnlyFav((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel="즐겨찾기한 코스만 보기"
          accessibilityState={{ selected: onlyFav }}
        >
          <Icon name="star" />
        </Pressable>
        <View style={[s.zoom, s.shadow]}>
          <Pressable onPress={() => zoom(1)} style={s.zoomBtn} accessibilityRole="button" accessibilityLabel="확대">
            <Icon name="plus2" />
          </Pressable>
          <Pressable onPress={() => zoom(-1)} style={s.zoomBtn} accessibilityRole="button" accessibilityLabel="축소">
            <Icon name="minus2" />
          </Pressable>
        </View>
      </View>

      {/* 비 화면: 지도·오른쪽 버튼 위, 위쪽 머리(검색·칩)와 시트 아래 (시안) */}
      <RainOverlay playKey={rainKey} onEnd={rainEnded} />

      <View style={[s.head, { paddingTop: Math.max(insets.top, 59) + 1 }]} pointerEvents="box-none">
        <View style={s.logoRow} pointerEvents="box-none">
          <Logo />
          <Pressable
            style={[s.round, s.shadow, { width: 35, height: 35, borderRadius: 17.5 }]}
            onPress={() => router.push('/notifications')}
            accessibilityRole="button"
            accessibilityLabel={`알림${unread.length ? `, 읽지 않은 알림 ${unread.length}개` : ''}`}
          >
            <Image source={IMG.bell} style={{ width: 28, height: 30 }} />
            {unread.length > 0 && <View style={s.bellDot} />}
          </Pressable>
        </View>

        <Pressable style={[s.search, s.shadow]} onPress={() => router.push('/search')} accessibilityRole="search" accessibilityLabel="하천길 검색">
          <Image source={IMG.search} style={{ width: 28, height: 30 }} />
          <Text style={s.searchText}>오늘은 어디로 나가볼까요?</Text>
          <Image source={IMG.mic} style={{ width: 28, height: 38 }} />
        </Pressable>

        <View style={s.chips}>
          {ACTS.map((a) => {
            const on = activity === a.key;
            return (
              <Pressable
                key={a.key}
                onPress={() => setActivity(a.key)}
                style={[s.chip, s.shadowSm, { width: a.w }, on && { backgroundColor: H.brand }]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <Image source={IMG[a.img]} style={[s.chipIcon, on && { tintColor: H.white }]} resizeMode="contain" />
                <Text style={[s.chipText, on && { color: H.white }]}>{a.label}</Text>
              </Pressable>
            );
          })}
          <Pressable onPress={() => setOnlyOk((v) => !v)} style={[s.chip, s.shadowSm, { width: 107, gap: 7, paddingLeft: 2 }]} accessibilityRole="switch" accessibilityState={{ checked: onlyOk }}>
            <Text style={[s.chipText, { fontSize: 12 }]}>이용 가능만</Text>
            <View style={[s.toggle, onlyOk && { backgroundColor: G2.lime }]}>
              <View style={[s.knob, onlyOk && { alignSelf: 'flex-end' }]} />
            </View>
          </Pressable>
        </View>

        {/* 시연 장면 버튼 (목업) · 과거 장면이면 '시연 데이터' 표시 */}
        {/* 장면 칩 줄: 평상시(실시간)엔 숨기고, 달력에서 과거 시각을 고르면 나타나요 */}
        {scene.time ? <SceneBar style={{ marginTop: 10 }} /> : null}
      </View>

      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: Animated.multiply(dim, 0.1) }]} pointerEvents="none" />

      {/* 아래 시트 '내 주변 코스' (반·접힘: 흰색 → #E3EAF3 그라데이션 / 전체: 흰색, 모서리 40) */}
      {!picking && (
        <Animated.View style={[s.sheet, { top: fullTop, height: screenH - fullTop + FAV_RISE, transform: [{ translateY: y }] }]}>
          <Animated.View style={[StyleSheet.absoluteFill, s.sheetBg, { opacity: tint }]} pointerEvents="none">
            <Svg width="100%" height="100%">
              <Defs>
                <LinearGradient id="sheet" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#FFFFFF" />
                  <Stop offset="0.6" stopColor="#E3EAF3" />
                </LinearGradient>
              </Defs>
              <Rect x="0" y="0" width="100%" height="100%" fill="url(#sheet)" />
            </Svg>
          </Animated.View>
          <View {...pan.panHandlers}>
            <Pressable style={s.handleHit} onPress={() => goSnap(snap === 0 ? 1 : 0)} accessibilityLabel={snap === 0 ? '목록 줄이기' : '목록 펼치기'}>
              <View style={s.handle} />
            </Pressable>
            <View style={s.titleRow}>
              <Text style={s.title}>{onlyFav ? '즐겨찾기' : '내 주변 코스'}</Text>
              {!onlyFav && badge && (
                <View style={[s.badge, { backgroundColor: badge.bg }]}>
                  {badge.ok ? (
                    <Icon name="check" color={G2.ok} />
                  ) : badge.alert ? (
                    <View style={s.alertDot}>
                      <Text style={s.alertMark}>!</Text>
                    </View>
                  ) : (
                    <View style={[s.badgeDot, { backgroundColor: badge.fg }]} />
                  )}
                  <Text style={[s.badgeText, { color: badge.text }]}>{badge.label}</Text>
                </View>
              )}
            </View>
            {onlyFav ? (
              <Pressable
                style={s.sortChip}
                onPress={() => setFavSort((v) => (v === 'recent' ? 'name' : 'recent'))}
                accessibilityRole="button"
                accessibilityLabel={`정렬: ${favSort === 'recent' ? '최신순' : '이름순'}, 눌러서 바꾸기`}
              >
                <Text style={s.sortText}>{favSort === 'recent' ? '최신순' : '이름순'}</Text>
                <View style={s.sortTri} />
              </Pressable>
            ) : (
              <View style={s.areaRow}>
                <Image source={IMG.pin} style={{ width: 20, height: 27 }} />
                <Text style={s.area}>{courses?.[0]?.area ?? '용인시 처인구 모현읍 월촌교 일대'}</Text>
              </View>
            )}
          </View>

          <ScrollView
            style={{ marginHorizontal: -25 }}
            contentContainerStyle={{ gap: 14, paddingTop: 11, paddingHorizontal: 25.5, paddingBottom: tabH + 24 + (onlyFav ? 0 : FAV_RISE) }}
            scrollEnabled={snap === 0}
            showsVerticalScrollIndicator={false}
          >
            {courses === null && <Text style={s.empty}>코스를 불러오는 중…</Text>}
            {courses && list.length === 0 && <Text style={s.empty}>{onlyFav ? '즐겨찾기한 코스가 없어요.\n코스 화면에서 ☆를 눌러 저장해 보세요.' : '지금 이용 가능한 코스가 없어요.'}</Text>}
            {onlyFav &&
              favList.map((c, i) => (
                <Pressable
                  key={c.id}
                  style={s.favRow}
                  onPress={() => router.push(`/course/${c.id}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`${c.name}, ${FAV_STATUS[courseSituation(c)] ?? '확인 불가'}`}
                >
                  <View style={[s.favStar, { backgroundColor: FAV_COLORS[i % FAV_COLORS.length] }]}>
                    <Icon name="starSmall" size={30} color={FAV_COLORS[i % FAV_COLORS.length]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.favName} numberOfLines={1}>
                      {c.name}
                    </Text>
                    <Text style={s.favArea} numberOfLines={1}>
                      {areaOf(c.area)}
                    </Text>
                  </View>
                  <Pressable
                    hitSlop={12}
                    style={s.favMore}
                    onPress={() =>
                      Alert.alert(c.name, undefined, [
                        { text: '취소', style: 'cancel' },
                        { text: '즐겨찾기 해제', style: 'destructive', onPress: () => toggleFavorite(c.id) },
                      ])
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`${c.name} 더보기`}
                  >
                    {[0, 1, 2].map((k) => (
                      <View key={k} style={s.favDot} />
                    ))}
                  </Pressable>
                </Pressable>
              ))}
            {!onlyFav &&
              list.map((c) => (
                <CourseCard
                  key={c.id}
                  course={c}
                  minutes={minutesFor(courseKm(c), activity)}
                  fav={favorites.includes(c.id)}
                  onPress={() => router.push(`/course/${c.id}`)}
                  onLongPress={() => toggleFavorite(c.id)}
                />
              ))}
          </ScrollView>
        </Animated.View>
      )}

      {calOpen && <DemoCalendar visible onClose={() => setCalOpen(false)} onPicked={(id) => id !== 'live' && focusRiver()} />}

      {/* 하단 ▶ → 활동 고르기 시트 (최종 시안 2026-11-11) */}
      {picking && (
        <PickSheet
          top={476 + top}
          initial={activity}
          onClose={closePickSheet}
          onDone={(k) => {
            setActivity(k);
            closePickSheet();
            const id = route?.courseId ?? courses?.[0]?.id ?? 'wolchon-maesan';
            router.push({ pathname: '/course/[id]', params: { id, ready: '1' } });
          }}
        />
      )}

      {app.error && (
        <Pressable onPress={app.reload} style={[s.errorBox, { bottom: tabH + 8 }]}>
          <Text style={s.errorText}>
            정보를 새로 받지 못했어요. 눌러서 다시 시도{'\n'}({String(app.error)})
          </Text>
        </Pressable>
      )}
    </View>
  );
}

// ── 활동 고르기 시트 (최종 시안: 100×85 카드 3개 · 고르면 라임 테두리 · '준비 완료') ──
const PICKS = [
  // 그림(여백 잘라 낸 것) 크기는 시안 그대로, 칸 가운데 · 위에서 33.5 높이에 그림 가운데가 오게 놓아요
  { key: 'walk', lettering: 'walk', label: '산책', gw: 18, gh: 25.2 },
  { key: 'run', lettering: 'run', label: '러닝', gw: 27.1, gh: 26 },
  { key: 'bike', lettering: 'bike', label: '자전거', gw: 30.9, gh: 20.1 },
];
function PickSheet({ top, initial, onClose, onDone }) {
  const [pick, setPick] = useState(initial ?? 'walk');
  // 위 회색 손잡이를 아래로 끌면 따라 내려오고, 60 넘게 내리면 닫혀요(누르기만 해도 닫혀요)
  const dragY = useRef(new Animated.Value(0)).current;
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
      onPanResponderMove: (_, g) => dragY.setValue(Math.max(0, g.dy)),
      onPanResponderRelease: (_, g) => {
        if (g.dy > 60 || g.vy > 0.8) Animated.timing(dragY, { toValue: 500, duration: 160, useNativeDriver: true }).start(onClose);
        else Animated.spring(dragY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
      },
      onPanResponderTerminate: () => Animated.spring(dragY, { toValue: 0, useNativeDriver: true }).start(),
    }),
  ).current;
  return (
    <Animated.View style={[s.sheet, s.pickSheet, { top, transform: [{ translateY: dragY }] }]}>
      <View style={[StyleSheet.absoluteFill, s.sheetBg]} pointerEvents="none">
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="pick" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#FFFFFF" />
              <Stop offset="0.6" stopColor="#E3EAF3" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#pick)" />
        </Svg>
      </View>
      <View {...pan.panHandlers}>
        <Pressable style={s.handleHit} onPress={onClose} accessibilityRole="button" accessibilityLabel="활동 고르기 닫기 (아래로 끌어도 닫혀요)">
          <View style={s.handle} />
        </Pressable>
      </View>
      <Text style={s.pickTitle}>어떤 활동을 기록할까요?</Text>
      <Text style={s.pickSub}>선택하면 기록 준비가 완료돼요</Text>
      <View style={s.pickRow} accessibilityRole="radiogroup">
        {PICKS.map((p) => {
          const on = pick === p.key;
          const c = on ? H.brand : G2.text;
          return (
            <Pressable key={p.key} onPress={() => setPick(p.key)} style={[s.pickTile, on && s.pickTileOn]} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={p.label}>
              <View style={[s.pickIcon, { top: 33.5 - p.gh / 2 - 1 }]}>
                <Image source={IMG[`act_${p.key}`]} style={{ width: p.gw, height: p.gh, tintColor: c }} resizeMode="contain" />
              </View>
              <View style={s.pickLabel}>
                <Lettering name={p.lettering} height={15} color={c} />
              </View>
            </Pressable>
          );
        })}
      </View>
      <Pressable onPress={() => onDone(pick)} style={({ pressed }) => [s.pickBtn, pressed && { opacity: 0.88 }]} accessibilityRole="button">
        <Text style={s.pickBtnText}>준비 완료</Text>
      </Pressable>
    </Animated.View>
  );
}

// 즐겨찾기 별 동그라미 색 (최종 시안: 라임 · 파랑 · 초록 · 진회색 순서, 상태와는 관계없음)
const FAV_COLORS = [H.lime, H.brand, G2.ok, G2.text];
const FAV_STATUS = { available: '이용 가능', recovering: '회복 중', flooded: '이용 위험', closed: '공식 통제 중', unknown: '확인 불가' };
// '용인시 처인구 모현읍 월촌교 일대' → '용인시 처인구 모현읍' (시안)
const areaOf = (area) =>
  (area ?? '')
    .replace(/ 일대$/, '')
    .split(' ')
    .slice(0, 3)
    .join(' ');

// '현재 이용 가능' 배지 (시안: #DEFC96 + 초록 체크)
function badgeOf(trail) {
  if (!trail) return null;
  const red = RIVER_STATUS.flooded;
  // 이용 위험 · 공식 통제: 연분홍 바탕 + 빨간 ! 동그라미 + 회색 글자 (최종 시안)
  if (trail.official) return { label: '현재 공식 통제 중', bg: red.bg, alert: true, text: G2.text };
  if (trail.forecastRisk) return { label: '곧 이용 위험 예상', bg: RIVER_STATUS.recovering.bg, fg: RIVER_STATUS.recovering.fg, text: RIVER_STATUS.recovering.fg };
  if (trail.status === 'available') return { label: '현재 이용 가능', bg: G2.okBadge, ok: true, text: G2.text };
  if (trail.status === 'flooded') return { label: '현재 이용 위험', bg: red.bg, alert: true, text: G2.text };
  if (trail.status === 'recovering') return { label: '현재 회복 중', bg: RIVER_STATUS.recovering.bg, fg: RIVER_STATUS.recovering.fg, text: RIVER_STATUS.recovering.fg };
  return { label: '현재 확인 불가', bg: H.fill, fg: H.sub, text: G2.text };
}

const s = StyleSheet.create({
  topFade: { position: 'absolute', top: 0, left: 0, right: 0 },
  head: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 25 },
  logoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginLeft: 6, marginRight: -12, height: 35 },
  shadow: { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
  shadowSm: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  round: { width: 38, height: 38, borderRadius: 19, backgroundColor: H.white, alignItems: 'center', justifyContent: 'center' },
  bellDot: { position: 'absolute', left: 26, top: 1, width: 10, height: 10, borderRadius: 5, backgroundColor: H.lime, borderWidth: 2, borderColor: H.white },
  search: { marginTop: 15, height: 46, borderRadius: 23, backgroundColor: H.white, flexDirection: 'row', alignItems: 'center', paddingLeft: 11, paddingRight: 15 },
  searchText: { flex: 1, fontSize: 13, color: G2.text, opacity: 0.47, marginLeft: 2 },
  chips: { flexDirection: 'row', gap: 9, marginTop: 14 },
  chip: { height: 28, borderRadius: 14, backgroundColor: G2.chip, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingRight: 4 },
  chipIcon: { width: 26, height: 22, marginRight: -1 },
  chipText: { fontSize: 13, fontWeight: '500', color: G2.text },
  toggle: { width: 29, height: 16, borderRadius: 8, backgroundColor: G2.line, padding: 2, justifyContent: 'center' },
  knob: { width: 12, height: 12, borderRadius: 6, backgroundColor: H.white },
  demo: { alignSelf: 'flex-start', marginTop: 10, backgroundColor: 'rgba(24,38,48,0.78)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 },
  demoText: { color: H.white, fontSize: 12, fontWeight: '600' },
  ctrls: { position: 'absolute', right: 21.5, gap: 9, alignItems: 'center' },
  zoom: { width: 39, height: 59, borderRadius: 19.5, backgroundColor: H.white },
  zoomBtn: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingHorizontal: 25,
    backgroundColor: H.white,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -2 },
    elevation: 10,
  },
  sheetBg: { borderTopLeftRadius: 40, borderTopRightRadius: 40, overflow: 'hidden' },
  handleHit: { alignItems: 'center', paddingTop: 23, paddingBottom: 15 },
  pickSheet: { bottom: 0 },
  pickTitle: { fontSize: 23, fontWeight: '700', color: '#000', marginTop: 2, marginLeft: 0, letterSpacing: -0.3 },
  pickSub: { fontSize: 12, color: G2.text, marginTop: 9 },
  // 세 칸은 아래 '준비 완료' 버튼과 같은 가운데에 맞추고, 폰 폭에 따라 칸 너비가 늘어나요(시안 393 폭에서 약 100)
  pickRow: { flexDirection: 'row', marginTop: 22, marginRight: -2, gap: 18 },
  // 칸 100×85 · 아이콘은 시안 좌표에 고정 · 글자는 칸 위에서 53px (아이콘과 약 9px 띄움)
  pickTile: { flex: 1, height: 85, borderRadius: 9.5, borderWidth: 1, borderColor: COLOR.line, backgroundColor: H.white },
  pickLabel: { position: 'absolute', left: 0, right: 0, top: 52, alignItems: 'center' },
  pickIcon: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  pickTileOn: { borderColor: COLOR.lime, shadowColor: COLOR.lime, shadowOpacity: 0.6, shadowRadius: 6, shadowOffset: { width: 0, height: 0 }, elevation: 3 },
  pickBtn: { height: 34, borderRadius: 16, backgroundColor: H.brand, alignItems: 'center', justifyContent: 'center', marginTop: 18, marginLeft: -4, marginRight: -6 },
  pickBtnText: { fontSize: 14, fontWeight: '700', color: H.white },
  handle: { width: 55, height: 8, borderRadius: 4, backgroundColor: G2.line },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginLeft: 4, marginRight: -11 },
  title: { fontSize: 23, fontWeight: '800', color: '#000' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 25, borderRadius: 12.5, paddingLeft: 9, paddingRight: 13 },
  badgeDot: { width: 8, height: 8, borderRadius: 4 },
  alertDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: COLOR.alert, alignItems: 'center', justifyContent: 'center' },
  alertMark: { color: H.white, fontSize: 12, fontWeight: '800', lineHeight: 14 },
  badgeText: { fontSize: 12, fontWeight: '500' },
  areaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, marginLeft: -6 },
  area: { fontSize: 12, color: G2.text, marginLeft: 1 },
  sortChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 28,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.25)',
    backgroundColor: H.white,
    paddingLeft: 13,
    paddingRight: 12,
    marginTop: 14,
    marginLeft: -2,
  },
  sortText: { fontSize: 12, fontWeight: '500', color: G2.text },
  sortTri: { width: 0, height: 0, borderLeftWidth: 4.5, borderRightWidth: 4.5, borderTopWidth: 6, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: G2.text },
  favRow: { flexDirection: 'row', alignItems: 'center', gap: 22, height: 70, borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.26)', marginVertical: -7, paddingLeft: 1.5 },
  favStar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  favName: { fontSize: 15, fontWeight: '600', color: '#000' },
  favArea: { fontSize: 12, color: G2.text, marginTop: 3 },
  favMore: { width: 24, alignItems: 'center', gap: 2 },
  favDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: COLOR.dots },
  empty: { color: H.sub, fontSize: 13, paddingVertical: 14, textAlign: 'center', lineHeight: 19 },
  errorBox: { position: 'absolute', left: 25, right: 25, backgroundColor: H.dangerBg, borderRadius: 12, padding: 10 },
  errorText: { color: H.danger, fontSize: 12, textAlign: 'center' },
});
