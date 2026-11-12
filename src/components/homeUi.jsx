// 홈 시안(Figma 2026-11-09) 공통 조각: 색, 아이콘, 로고, 상태 칩, 화면 머리(← 제목 부제), 큰 버튼
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { ICONS } from '../constants/homeIcons';
import { COLOR } from '../constants/colors';
import * as LOGO from '../constants/splashPaths';

// 홈 2차 시안(2026-11-09 저녁) 이미지 아이콘 (시안에서 PNG로 뽑음)
export const IMG = {
  search: require('../../assets/home/ic_search.png'),
  mic: require('../../assets/home/ic_mic.png'),
  pin: require('../../assets/home/ic_pin.png'),
  bell: require('../../assets/home/ic_bell.png'),
  walkWhite: require('../../assets/home/ic_walk_white.png'),
  walk: require('../../assets/home/ic_walk_dark.png'),
  run: require('../../assets/home/ic_run.png'),
  bike: require('../../assets/home/ic_bike.png'),
  // 여백을 잘라 그림이 정확히 가운데 오게 한 활동 그림 (활동 고르기 · 기록 목록)
  act_walk: require('../../assets/home/act_walk.png'),
  act_run: require('../../assets/home/act_run.png'),
  act_bike: require('../../assets/home/act_bike.png'),
  weather: require('../../assets/home/ic_weather.png'),
  weatherTab: require('../../assets/home/ic_weather_tab.png'), // 하단 탭 (최종 시안 53×36)
  riverPhoto: require('../../assets/home/photo1.png'),
};

// 홈·코스·즐겨찾기 색 (최종 시안 2026-11-11, 값은 constants/colors.js)
export const G2 = {
  text: COLOR.muted, // 보조 글자 · 아이콘 #525252
  ok: COLOR.okText, // 이용 가능 글자·체크 #61A940
  okBadge: COLOR.okBadge, // '현재 이용 가능' 배지 #DEFC96
  okChip: COLOR.okSoft, // 'AI 분석 결과' 칩 #EDFEC6
  lime: COLOR.toggleOn, // '이용 가능만' 토글 켜짐 #C3F636
  chip: COLOR.chipBg, // 선택 안 된 칩 #ECF6FF
  soft: COLOR.brandSoft,
  navy: COLOR.brandDeep, // 선택된 탭 #13649E
  line: COLOR.cardLine, // 카드 테두리 #D9D9D9
};

export const H = {
  brand: COLOR.brand,
  ink: COLOR.ink, // 제목·본문
  sub: COLOR.sub, // 보조 글자·회색 아이콘
  line: COLOR.line, // 테두리
  fill: COLOR.fill, // 회색 카드·입력칸
  white: COLOR.white,
  lime: COLOR.lime, // 코스 도착 지점
  hint: COLOR.hint,
  text: COLOR.text,
  danger: COLOR.danger,
  dangerBg: COLOR.dangerBg,
  brandLine: COLOR.brandLine,
  map: COLOR.map,
};

// 상태: 이용 가능(초록) · 회복 중(주황) · 이용 위험(빨강, 경고 아이콘) · 확인 불가(회색) + 공식 통제 중(빨강)
export const RIVER_STATUS = {
  available: { label: '이용 가능', fg: COLOR.ok, bg: COLOR.okBg },
  recovering: { label: '회복 중', fg: COLOR.warn, bg: COLOR.warnBg },
  flooded: { label: '이용 위험', fg: COLOR.danger, bg: COLOR.dangerBg, warn: true },
  unknown: { label: '확인 불가', fg: COLOR.unknown, bg: COLOR.unknownBg, text: COLOR.ink },
};
export const statusOf = (river) => RIVER_STATUS[river?.status] ?? RIVER_STATUS.unknown;

/** 화면에서 보여줄 상황: 공식 통제가 AI 결과보다 우선 */
export const situationOf = (river) => (river?.official ? 'closed' : (river?.status ?? 'unknown'));

/** 시안 아이콘. size 를 주면 긴 변 기준으로 맞추고, color 를 주면 색을 바꿔요 */
export function Icon({ name, size, color, style }) {
  const ic = ICONS[name];
  const [x, y, w, h] = ic.vb;
  const k = size ? size / Math.max(w, h) : 1;
  return (
    <Svg width={w * k} height={h * k} viewBox={`${x} ${y} ${w} ${h}`} style={style}>
      {ic.paths.map((p, i) => {
        const common = {
          fill: p.fill ? color || p.fill : 'none',
          stroke: p.stroke ? color || p.stroke : undefined,
          strokeWidth: p.sw,
          strokeLinecap: p.cap,
          strokeLinejoin: p.join,
          transform: p.transform,
        };
        // 흰색 부분(체크 표시·X 등)은 색을 바꾸지 않아요
        if (color && (p.fill === 'white' || p.stroke === 'white')) {
          common.fill = p.fill ? p.fill : 'none';
          common.stroke = p.stroke ?? undefined;
        }
        if (p.tag === 'rect') return <Rect key={i} x={p.x} y={p.y} width={p.width} height={p.height} rx={p.rx} {...common} />;
        if (p.tag === 'circle') return <Circle key={i} cx={p.cx} cy={p.cy} r={p.r} {...common} />;
        return <Path key={i} d={p.d} fillRule={p.fr} {...common} />;
      })}
    </Svg>
  );
}

/** 파란 '이리로' 로고 (진입 화면과 같은 벡터, 시안 87×28) */
export function Logo({ width = 87, color = H.brand }) {
  return (
    <Svg width={width} height={width * (72.7 / 229.4)} viewBox="82 33.7 229.4 72.7">
      <G fill={color}>
        {['GLYPH_I', 'GLYPH_RI', 'GLYPH_RO', 'ARROW_1', 'ARROW_2', 'WAVE_SMALL_1', 'WAVE_SMALL_2'].map((k) => (
          <Path key={k} d={LOGO[k]} />
        ))}
      </G>
    </Svg>
  );
}

/** 'AI 분석 · 이용 가능' 알약 칩. lg = 코스·우회 화면용(가운데 정렬) */
export function StatusChip({ river, size = 'sm', style }) {
  const st = statusOf(river);
  const lg = size === 'lg';
  const center = size !== 'sm';
  return (
    <View style={[s.chip, lg && s.chipLg, size === 'md' && s.chipMd, { backgroundColor: st.bg }, style]}>
      {st.warn ? <Icon name="warnSmall" size={lg ? 15 : 13} /> : !center && <View style={[s.dot, { backgroundColor: st.fg }]} />}
      <Text style={[s.chipText, lg && s.chipTextLg, { color: st.text && !center ? st.text : st.fg }]}>AI 분석 · {st.label}</Text>
    </View>
  );
}

/** 하위 화면 머리: ‹ 제목 / 부제 (시안: ‹ left 28 top 79, 제목 20 bold, 부제 12 #6E7D88) */
export function ScreenHeader({ title, subtitle, onBack, style }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View style={[{ paddingTop: Math.max(insets.top, 59) + 13 }, style]}>
      <View style={s.headRow}>
        <Pressable onPress={onBack || (() => router.back())} hitSlop={10} style={s.backBtn} accessibilityRole="button" accessibilityLabel="뒤로 가기">
          <Icon name="back" />
        </Pressable>
        <Text style={s.headTitle}>{title}</Text>
      </View>
      {subtitle ? <Text style={s.headSub}>{subtitle}</Text> : null}
    </View>
  );
}

export function BigButton({ title, onPress, disabled, muted, style }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [s.big, disabled && { backgroundColor: muted ? H.fill : H.brandLine }, pressed && !disabled && { opacity: 0.88 }, style]}
    >
      <Text style={[s.bigText, disabled && muted && { color: H.sub, fontWeight: '600' }]}>{title}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 8, height: 26, borderRadius: 13, paddingLeft: 10, paddingRight: 14 },
  chipLg: { height: 27, borderRadius: 13.5, paddingHorizontal: 28, justifyContent: 'center' },
  chipMd: { height: 23, borderRadius: 11.5, paddingHorizontal: 24, justifyContent: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  chipText: { fontSize: 12, fontWeight: '600' },
  chipTextLg: { fontSize: 12 },
  headRow: { flexDirection: 'row', alignItems: 'center', height: 28, paddingLeft: 19 },
  backBtn: { width: 30, height: 30, justifyContent: 'center', alignItems: 'center' },
  headTitle: { fontSize: 20, fontWeight: '700', color: H.ink, marginLeft: 6, letterSpacing: -0.3 },
  headSub: { fontSize: 12, color: H.sub, marginTop: 15, marginLeft: 22 },
  big: { height: 54, borderRadius: 16, backgroundColor: H.brand, alignItems: 'center', justifyContent: 'center' },
  bigText: { color: H.white, fontSize: 15, fontWeight: '700' },
});
