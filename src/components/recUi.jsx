// 활동 측정 · 기록 · 마이 시안(2026-11-09) 공통 조각
//   색 R, 선 아이콘 Ic, 큰 제목 PageTitle, 하위 화면 머리 SubHeader, 주간/월간 같은 Segmented,
//   흰 카드 Card, 줄 메뉴 MenuRow, 토글 Toggle, 가운데 확인창 ConfirmModal, 경로 지도 TrackMap
import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { pathKm, pointAlong, toLatLng, toLatLngs } from '../lib/geo';
import { COLOR } from '../constants/colors';
import { MyLocationDot, PuckMarker } from './MyLocationDot';
import { EndpointMarker, RouteEnds } from './EndpointMarker';

// 이름은 화면 코드에서 쓰는 짧은 이름, 값은 constants/colors.js
//   mint·green = '이용 가능' 상태에만 / soft·brand = 선택·브랜드 카드·성취
export const R = {
  brand: COLOR.brand,
  soft: COLOR.brandSoft, // 브랜드 카드 · 선택 배경
  deep: COLOR.brandDeep, // 브랜드 카드 위 글자
  bar: COLOR.brandLine, // 막대 그래프 (오늘 아닌 날)
  ink: COLOR.ink, // 제목 · 진한 카드 배경
  text: COLOR.text,
  sub: COLOR.sub,
  line: COLOR.line,
  fill: COLOR.fill, // 회색 카드 · 세그먼트 바탕
  mint: COLOR.okBg, // 이용 가능 배경
  green: COLOR.ok, // 이용 가능 글자
  lime: COLOR.lime,
  red: COLOR.danger,
  redBg: COLOR.dangerBg,
  redSoft: COLOR.dangerSoft, // 회원 탈퇴 버튼 (체크 전)
  white: COLOR.white,
  onDark: COLOR.onDark,
  map: COLOR.map,
  dim: 'rgba(24,38,48,0.45)', // 모달 뒤 어둡게
};

// 24×24 선 아이콘 (시안 모양에 맞춰 그렸어요)
const IC = {
  home: (c) => <Path d="M4 10.5 12 4l8 6.5V20h-5.5v-5.5h-5V20H4z" stroke={c} strokeWidth={1.9} strokeLinejoin="round" fill="none" />,
  play: (c) => <Path d="M8 5.5 19 12 8 18.5z" fill={c} stroke={c} strokeWidth={1.4} strokeLinejoin="round" />,
  pause: (c) => (
    <>
      <Rect x={6.5} y={5} width={3.6} height={14} rx={1} fill={c} />
      <Rect x={13.9} y={5} width={3.6} height={14} rx={1} fill={c} />
    </>
  ),
  stop: (c) => <Rect x={6} y={6} width={12} height={12} rx={2} fill={c} />,
  chart: (c) => <Path d="M5 20V12M9.7 20V6M14.3 20V9M19 20V4M3 20.5h18" stroke={c} strokeWidth={1.8} strokeLinecap="round" fill="none" />,
  person: (c) => (
    <>
      <Circle cx={12} cy={8} r={3.6} stroke={c} strokeWidth={1.8} fill="none" />
      <Path d="M4.5 20.5c.6-3.8 3.6-6 7.5-6s6.9 2.2 7.5 6" stroke={c} strokeWidth={1.8} strokeLinecap="round" fill="none" />
    </>
  ),
  back: (c) => <Path d="M15 5 8 12l7 7" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />,
  chevron: (c) => <Path d="m9.5 6 6 6-6 6" stroke={c} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" fill="none" />,
  arrowUpRight: (c) => <Path d="M7 17 17 7M9 7h8v8" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />,
  check: (c) => <Path d="m6 12.5 4 4 8-9" stroke={c} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" fill="none" />,
  close: (c) => <Path d="M6 6l12 12M18 6 6 18" stroke={c} strokeWidth={1.9} strokeLinecap="round" fill="none" />,
  bookmark: (c) => <Path d="M6.5 4h11v16l-5.5-3.8L6.5 20z" stroke={c} strokeWidth={1.9} strokeLinejoin="round" fill="none" />,
  bookmarkOn: (c) => <Path d="M6.5 4h11v16l-5.5-3.8L6.5 20z" stroke={c} strokeWidth={1.9} strokeLinejoin="round" fill={c} />,
  star: (c) => <Path d="m12 3 2.3 5.6 6 .5-4.6 3.9 1.4 5.9L12 15.8 6.9 18.9l1.4-5.9L3.7 9.1l6-.5z" fill={c} />,
  sparkle: (c) => <Path d="M12 3c.7 4.6 2.4 6.3 7 7-4.6.7-6.3 2.4-7 7-.7-4.6-2.4-6.3-7-7 4.6-.7 6.3-2.4 7-7z" fill={c} />,
  pencil: (c) => <Path d="M5 19l1-4 9.5-9.5 3 3L9 18zM13.5 7.5l3 3" stroke={c} strokeWidth={1.8} strokeLinejoin="round" fill="none" />,
  walk: (c) => (
    <>
      <Circle cx={13} cy={4.5} r={1.8} fill={c} />
      <Path d="M10 21l2-6 2.5 2.5V21M12 15l-.5-5 3 2.5 3 .5M11.5 10 8 11.5 6.5 15" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  run: (c) => (
    <>
      <Circle cx={15} cy={4.5} r={1.8} fill={c} />
      <Path d="M6 20.5l3.5-1 2-3.5 3 2.5-.5 3.5M11.5 16l1-5.5 3 2.5 3.5.5M12.5 10.5 9 9.5 6 12" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  bike: (c) => (
    <>
      <Circle cx={6} cy={15.5} r={3.6} stroke={c} strokeWidth={1.7} fill="none" />
      <Circle cx={18} cy={15.5} r={3.6} stroke={c} strokeWidth={1.7} fill="none" />
      <Path d="M6 15.5 9.5 9h6l2.5 6.5M9.5 9l3 6.5h-6.5M8.5 7h3M15 7.5h2.5" stroke={c} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  bell: (c) => <Path d="M6 17V11a6 6 0 0 1 12 0v6l1.5 1.5h-15zM10 20.5h4" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />,
  info: (c) => <Path d="M12 10.5V17M12 7v.2" stroke={c} strokeWidth={2.2} strokeLinecap="round" fill="none" />,
  alert: (c) => <Path d="M12 6.5V13M12 16.8v.2" stroke={c} strokeWidth={2.4} strokeLinecap="round" fill="none" />,
  dotted: (c) => <Circle cx={12} cy={12} r={7} stroke={c} strokeWidth={1.6} strokeDasharray="2 2.6" fill="none" />,
  diamond: (c) => <Path d="M12 4.5 19.5 12 12 19.5 4.5 12z" stroke={c} strokeWidth={1.6} strokeLinejoin="round" fill="none" />,
};

export function Ic({ name, size = 24, color = R.ink, style }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={style}>
      {IC[name](color)}
    </Svg>
  );
}

/** 큰 제목 (기록 · 활동 기록 · 배지 · 마이) */
export function PageTitle({ title, subtitle, right }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: Math.max(insets.top, 59) + 20, paddingHorizontal: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={s.pageTitle}>{title}</Text>
        {right}
      </View>
      {subtitle ? <Text style={s.pageSub}>{subtitle}</Text> : null}
    </View>
  );
}

/** 하위 화면 머리: ‹ 제목 (오른쪽 버튼) / 부제 */
export function SubHeader({ title, subtitle, right, onBack }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View style={{ paddingTop: Math.max(insets.top, 59) + 16, paddingHorizontal: 20 }}>
      <View style={s.subRow}>
        <Pressable
          onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="뒤로 가기"
          style={{ width: 34, marginLeft: -6 }}
        >
          <Ic name="back" size={22} />
        </Pressable>
        <Text style={s.subTitle}>{title}</Text>
        <View style={{ flex: 1 }} />
        {right}
      </View>
      {subtitle ? <Text style={s.subSub}>{subtitle}</Text> : null}
    </View>
  );
}

/** 주간 | 월간 같은 두 칸 선택 */
export function Segmented({ items, value, onChange, style }) {
  return (
    <View style={[s.seg, style]} accessibilityRole="tablist">
      {items.map(([k, label]) => {
        const on = k === value;
        return (
          <Pressable key={k} onPress={() => onChange(k)} style={[s.segItem, on && s.segOn]} accessibilityRole="tab" accessibilityState={{ selected: on }}>
            <Text style={[s.segText, on && s.segTextOn]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Card({ children, style, tone = 'white', onPress, accessibilityLabel }) {
  const bg = { white: [R.white, R.line], gray: [R.fill, R.fill], mint: [R.mint, R.mint], soft: [R.soft, R.soft], red: [R.redBg, R.redBg], dark: [R.ink, R.ink] }[tone];
  const st = [s.card, { backgroundColor: bg[0], borderColor: bg[1] }, style];
  if (!onPress) return <View style={st}>{children}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [st, pressed && { opacity: 0.85 }]} accessibilityRole="button" accessibilityLabel={accessibilityLabel}>
      {children}
    </Pressable>
  );
}

/** 제목/설명 + › 줄 카드 */
export function MenuRow({ title, sub, onPress, tone = 'white', danger, right }) {
  return (
    <Card tone={danger ? 'red' : tone} onPress={onPress} style={s.menu} accessibilityLabel={title}>
      <View style={{ flex: 1 }}>
        <Text style={[s.menuTitle, danger && { color: R.red }]}>{title}</Text>
        {sub ? <Text style={s.menuSub}>{sub}</Text> : null}
      </View>
      {right ?? <Ic name="chevron" size={18} color={danger ? R.red : R.sub} />}
    </Card>
  );
}

export function SectionLabel({ children, style }) {
  return <Text style={[s.section, style]}>{children}</Text>;
}

/** 시안 토글: 켜짐 파랑 / 꺼짐 회색 */
export function Toggle({ value, onChange, label }) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      hitSlop={8}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      style={[s.toggle, { backgroundColor: value ? R.brand : '#DCE3E7' }]}
    >
      <View style={[s.knob, { transform: [{ translateX: value ? 21 : 0 }] }]} />
    </Pressable>
  );
}

export function Button({ title, onPress, kind = 'primary', disabled, style }) {
  const k = {
    primary: [R.brand, R.white, R.brand],
    gray: [R.fill, R.ink, R.fill],
    outline: [R.white, R.ink, R.line],
    danger: [R.red, R.white, R.red],
    dangerSoft: [R.redSoft, R.red, R.redSoft],
  }[kind];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [s.btn, { backgroundColor: k[0], borderColor: k[2] }, disabled && { opacity: 0.55 }, pressed && !disabled && { opacity: 0.85 }, style]}
    >
      <Text style={[s.btnText, { color: k[1] }]}>{title}</Text>
    </Pressable>
  );
}

/** 가운데 확인창 (기록 종료 · 로그아웃 · 회원 탈퇴) */
export function ConfirmModal({ visible, title, message, cancel = '취소', confirm, onCancel, onConfirm, danger, stacked, busy }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <View style={s.dim}>
        <View style={s.modal} accessibilityViewIsModal>
          <Text style={s.modalTitle}>{title}</Text>
          {message ? <Text style={s.modalMsg}>{message}</Text> : null}
          <View style={[s.modalBtns, stacked && { flexDirection: 'column' }]}>
            <Button title={cancel} kind="gray" onPress={onCancel} style={!stacked && { flex: 1 }} />
            <Button title={busy ? '처리 중…' : confirm} kind={danger ? 'danger' : 'primary'} onPress={onConfirm} disabled={busy} style={!stacked && { flex: 1.2 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

/** 아래에서 올라오는 시트 (프로필 사진 변경) */
export function BottomSheet({ visible, title, onClose, children }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={[s.dim, { justifyContent: 'flex-end', padding: 0 }]} onPress={onClose} accessibilityLabel="닫기">
        <Pressable style={[s.sheet, { paddingBottom: insets.bottom + 20 }]} onPress={() => {}}>
          <View style={s.grab} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <Text style={s.sheetTitle}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="닫기">
              <Ic name="close" color={R.sub} />
            </Pressable>
          </View>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** 지도 + 경로선 (출발 파란 점, 도착 연두 점). planned 는 옅게, path 는 진하게 */
export function TrackMap({ path, planned, fit, style, padding = 50, interactive = true, children, mapRef, follow, routeStyle, myLocation = 'dot' }) {
  const map = useRef(null);
  const target = fit ?? (path?.length > 1 ? path : planned);
  const fitKey = `${fit ? 'f' : target === path ? 'a' : 'p'}${target?.length ? 1 : 0}-${JSON.stringify(padding)}`;
  const edge = typeof padding === 'number' ? { top: padding, right: padding, bottom: padding, left: padding } : padding;
  useEffect(() => {
    if (!target?.length || follow) return;
    const t = setTimeout(
      () =>
        target.length === 1
          ? map.current?.animateCamera({ center: toLatLng(target[0]), zoom: 16 }, { duration: 300 })
          : map.current?.fitToCoordinates(toLatLngs(target), { edgePadding: edge, animated: false }),
      200,
    );
    return () => clearTimeout(t);
  }, [fitKey]);
  // 기록 중에는 마지막 지점을 따라가요
  const lastKey = follow && path?.length ? path[path.length - 1].join(',') : null;
  // 시안 경로선의 화살표 간격(화면에서 약 55)을 지도 확대 정도에 맞춰 계산해요
  const [mPerDp, setMPerDp] = useState(null);
  const mapH = useRef(0);
  useEffect(() => {
    if (lastKey) map.current?.animateCamera({ center: toLatLng(path[path.length - 1]) }, { duration: 400 });
  }, [lastKey]);
  return (
    <MapView
      ref={(m) => {
        map.current = m;
        if (mapRef) mapRef.current = m;
      }}
      style={style ?? StyleSheet.absoluteFill}
      initialRegion={{ latitude: 37.3245, longitude: 127.2355, latitudeDelta: 0.012, longitudeDelta: 0.012 }}
      showsUserLocation={false} // 시안 크기의 내 위치 표시(MyLocationDot)를 따로 그려요
      showsMyLocationButton={false}
      toolbarEnabled={false}
      userInterfaceStyle="light"
      scrollEnabled={interactive}
      zoomEnabled={interactive}
      rotateEnabled={false}
      pitchEnabled={false}
      onLayout={(e) => (mapH.current = e.nativeEvent.layout.height)}
      onRegionChangeComplete={
        routeStyle === 'design'
          ? (rg) => {
              if (!mapH.current || !rg?.latitudeDelta) return;
              const v = (rg.latitudeDelta * 111320) / mapH.current;
              setMPerDp((old) => (old && Math.abs(old - v) / old < 0.15 ? old : v));
            }
          : undefined
      }
    >
      {routeStyle === 'design' ? (
        // 최종 시안(측정 화면): 진한 파란 굵은 선 + 가운데 라임 점선. 코스가 있으면 코스를, 없으면 지나온 길을 그려요
        <DesignRoute line={planned?.length > 1 ? planned : path} mPerDp={mPerDp} />
      ) : (
        <>
          {planned?.length > 1 && <Polyline coordinates={toLatLngs(planned)} strokeColor="rgba(57,147,212,0.28)" strokeWidth={6} lineCap="round" lineJoin="round" />}
          {path?.length > 1 && <Polyline coordinates={toLatLngs(path)} strokeColor={R.brand} strokeWidth={5} lineCap="round" lineJoin="round" />}
        </>
      )}
      {/* 출발지·도착지: 통일된 흰 동그라미 + 남색 테두리 (측정 화면은 코스 양 끝) */}
      {routeStyle === 'design' ? <RouteEnds path={planned?.length > 1 ? planned : null} zIndex={2} /> : <EndpointMarker point={path?.[0]} />}
      {path?.length > 1 && routeStyle !== 'design' && !follow && <EndpointMarker point={path[path.length - 1]} />}
      {path?.length > 1 && routeStyle !== 'design' && follow && (
        <Marker coordinate={toLatLng(path[path.length - 1])} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
          <Dot color={follow ? R.brand : R.lime} big={follow} />
        </Marker>
      )}
      {children}
      <MyLocationDot mode={myLocation} />
    </MapView>
  );
}

/** 두 점 사이 방향 (북쪽 0°, 시계 방향) */
export function bearing([lat1, lon1], [lat2, lon2]) {
  const k = Math.cos((((lat1 + lat2) / 2) * Math.PI) / 180);
  return (Math.atan2((lon2 - lon1) * k, lat2 - lat1) * 180) / Math.PI;
}
/** 경로 시작 방향 (처음 30m 기준) */
export function startBearing(line) {
  if (!(line?.length > 1)) return 0;
  const p = pointAlong(line, Math.min(0.03, pathKm(line))) ?? line[1];
  return bearing(line[0], p);
}

// 안드로이드 지도 표시(Marker)에 그림을 처음 그릴 때 빈칸이 되지 않도록 잠깐만 다시 그리게 해요
function useTrackOnce() {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setOn(false), 800);
    return () => clearTimeout(t);
  }, []);
  return on;
}

/** 진행 방향 라임 화살표 (시안: 밑변 약 10.5 · 높이 약 12.7, 모서리 둥글게) */
function RouteArrow({ coordinate, rotation }) {
  const track = useTrackOnce();
  return (
    <Marker coordinate={coordinate} rotation={rotation} flat anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={track} zIndex={3}>
      <Svg width={16} height={16} viewBox="0 0 16 16">
        <Path d="M8 1.9 L13.4 13.4 L2.6 13.4 Z" fill="#CCFF40" stroke="#CCFF40" strokeWidth={1.6} strokeLinejoin="round" />
      </Svg>
    </Marker>
  );
}

/** 최종 시안 경로선: #0B38FF 굵기 18 + 가운데 라임(#CCFF40) 점선 굵기 3 (5 그리고 5 띄움) + 진행 방향 라임 화살표 약 55 간격 */
function DesignRoute({ line, mPerDp }) {
  if (!(line?.length > 1)) return null;
  const c = toLatLngs(line);
  const total = pathKm(line);
  const gapKm = Math.max(((mPerDp ?? 2.7) * 55) / 1000, total / 40); // 화면에서 약 55 간격 (너무 촘촘해지지 않게 최대 40개)
  const arrows = [];
  for (let km = gapKm * 1.3; km < total - gapKm * 0.4; km += gapKm) {
    const at = pointAlong(line, km);
    const a = pointAlong(line, Math.max(km - 0.01, 0));
    const b = pointAlong(line, Math.min(km + 0.01, total));
    if (at && a && b) arrows.push({ at, rot: bearing(a, b) });
  }
  return (
    <>
      <Polyline coordinates={c} strokeColor="#0B38FF" strokeWidth={18} lineCap="butt" lineJoin="round" />
      <Polyline coordinates={c} strokeColor="#CCFF40" strokeWidth={3} lineDashPattern={[5, 5]} lineCap="butt" lineJoin="round" zIndex={2} />
      {arrows.map((ar, i) => (
        <RouteArrow key={`${i}-${gapKm.toFixed(3)}`} coordinate={toLatLng(ar.at)} rotation={ar.rot} />
      ))}
    </>
  );
}

/** 출발·현재 지점 표시: 내 위치와 같은 작은 아이콘(파란 원 + 흰 테두리 + 방향 삼각형). rotation = 방향 */
export function StartPuck({ coordinate, rotation = 0 }) {
  return <PuckMarker coordinate={coordinate} rotation={rotation} zIndex={4} />;
}

export function Dot({ color, big }) {
  const o = big ? 30 : 16;
  const i = big ? 16 : 10;
  return (
    <View
      style={{
        width: o,
        height: o,
        borderRadius: o / 2,
        backgroundColor: R.white,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 1 },
      }}
    >
      <View style={{ width: i, height: i, borderRadius: i / 2, backgroundColor: color }} />
    </View>
  );
}

/** 활동 유형 동그라미 아이콘 (기록 목록·최근 활동) */
export function ActBadge({ activity, size = 44 }) {
  const name = { run: 'arrowUpRight', walk: 'dotted', bike: 'diamond' }[activity] ?? 'arrowUpRight';
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: R.soft, alignItems: 'center', justifyContent: 'center' }}>
      <Ic name={name} size={size * 0.48} color={R.brand} />
    </View>
  );
}

export const shadow = { shadowColor: '#0B2A40', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 3 };

const s = StyleSheet.create({
  pageTitle: { fontSize: 27, fontWeight: '800', color: R.ink, letterSpacing: -0.5 },
  pageSub: { fontSize: 12.5, color: R.sub, marginTop: 6 },
  subRow: { flexDirection: 'row', alignItems: 'center', height: 32 },
  subTitle: { fontSize: 21, fontWeight: '800', color: R.ink, marginLeft: 8, letterSpacing: -0.4 },
  subSub: { fontSize: 12.5, color: R.sub, marginTop: 14 },
  seg: { flexDirection: 'row', height: 42, borderRadius: 21, backgroundColor: R.fill, padding: 3 },
  segItem: { flex: 1, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: R.white, ...{ shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 } },
  segText: { fontSize: 13.5, color: R.sub, fontWeight: '500' },
  segTextOn: { color: R.ink, fontWeight: '700' },
  card: { borderRadius: 16, borderWidth: 1, padding: 18 },
  menu: { flexDirection: 'row', alignItems: 'center', paddingVertical: 17 },
  menuTitle: { fontSize: 15, fontWeight: '600', color: R.ink },
  menuSub: { fontSize: 12, color: R.sub, marginTop: 6 },
  section: { fontSize: 16.5, fontWeight: '800', color: R.ink, marginTop: 28, marginBottom: 12 },
  toggle: { width: 47, height: 28, borderRadius: 14, padding: 3, justifyContent: 'center' },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: R.white },
  btn: { height: 54, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 15, fontWeight: '700' },
  dim: { flex: 1, backgroundColor: R.dim, justifyContent: 'center', padding: 24 },
  modal: { backgroundColor: R.white, borderRadius: 22, padding: 24, paddingTop: 30 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: R.ink },
  modalMsg: { fontSize: 13, color: R.sub, marginTop: 14, lineHeight: 20 },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 40 },
  sheet: { backgroundColor: R.white, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 20, paddingTop: 10 },
  grab: { alignSelf: 'center', width: 44, height: 4, borderRadius: 2, backgroundColor: '#D5DCE0', marginBottom: 20 },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: R.ink },
});
