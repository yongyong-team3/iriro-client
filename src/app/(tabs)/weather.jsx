// 날씨 탭 (최종 시안 2026-11-11)
//   '날씨' / 지금 카드(지역 · 동의 지금 · 기온 · 그림 · 체감 · 최고/최저) / 시간별 예보 / 10일간의 날씨
//   '오늘의 날씨' / 강수 확률 · 바람 · 습도 · 자외선 지수 / 우리 동네 공기 / 오늘의 산책 가이드
//   ⚠ 서버(WEATHER-01)는 지금 기온·하늘만 줘요. 나머지는 lib/weatherSample.js 의 예시 데이터라 '예시 데이터'로 표시해요.
//   아이콘·그림은 시안에서 잘라 낸 그림(assets/design)이에요.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../../components/AppText';
import { Lettering } from '../../components/RecordCard';
import { currentWeather } from '../../api/me';
import { useAppState } from '../../context/AppState';
import { KIND_LABEL, kindOf, sampleWeather } from '../../lib/weatherSample';
import { FillSvg } from '../../components/FillSvg';

const STATUS_TOP = 59;
const A = {
  pin: require('../../../assets/design/wx_pin.png'),
  up: require('../../../assets/design/wx_arrow_up.png'),
  down: require('../../../assets/design/wx_arrow_down.png'),
  heroRain: require('../../../assets/design/wx_hero_rain.png'),
  caption: require('../../../assets/design/wx_hero_caption.png'),
  hourly: require('../../../assets/design/wx_hourly.png'),
  calendar: require('../../../assets/design/wx_calendar.png'),
  drop: require('../../../assets/design/wx_drop.png'),
  wind: require('../../../assets/design/wx_wind.png'),
  humid: require('../../../assets/design/wx_humid.png'),
  uv: require('../../../assets/design/wx_uv.png'),
  air: require('../../../assets/design/wx_air.png'),
  steps: require('../../../assets/design/wx_guide_steps.png'),
  umbrella: require('../../../assets/design/wx_umbrella.png'),
  leaf: require('../../../assets/design/wx_leaf.png'),
};
// 작은 날씨 아이콘 (시안 크기 그대로)
const ICON = {
  sun: { src: require('../../../assets/design/wx_sun.png'), w: 22, h: 22 },
  partly: { src: require('../../../assets/design/wx_partly.png'), w: 23, h: 22 },
  cloud: { src: require('../../../assets/design/wx_cloud.png'), w: 26, h: 18 },
  drizzle: { src: require('../../../assets/design/wx_drizzle.png'), w: 26, h: 22 },
  rain: { src: require('../../../assets/design/wx_rain.png'), w: 22, h: 22 },
};
// 지금 카드 큰 그림: 비 그림은 시안 그대로, 나머지는 아이콘을 키워요
const HERO = { drizzle: A.heroRain, rain: A.heroRain };

function WxIcon({ kind, scale = 1, style }) {
  const i = ICON[kind] ?? ICON.cloud;
  return <Image source={i.src} style={[{ width: i.w * scale, height: i.h * scale }, style]} resizeMode="contain" />;
}

export default function WeatherScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { rivers, now } = useAppState();
  const [srv, setSrv] = useState(null); // WEATHER-01 (목업이면 null)
  useEffect(() => {
    currentWeather()
      .then(setSrv)
      .catch(() => {});
  }, []);
  const base = rivers?.[0]?.weather ?? { tempC: 21, sky: 'sunny' };
  const tempC = srv?.tempC ?? base.tempC ?? 21;
  const kind = kindOf(srv ?? base);
  const w = useMemo(() => sampleWeather({ tempC, kind, at: now ? new Date(now) : new Date() }), [tempC, kind, now]);
  // 지역: '용인시 ○○구 ○○읍' 꼴이면 그대로, 아니면 월촌교가 있는 용인시 처인구 모현읍
  const raw = srv?.area ?? rivers?.[0]?.area ?? '';
  const words = raw.startsWith('용인시') ? raw.split(' ') : ['용인시', '처인구', '모현읍'];
  const area = words.slice(0, 2).join(' ');
  const dong = words[2] ?? '모현읍';
  const top = Math.max(insets.top - STATUS_TOP, 0); // 시안은 상태바 59 기준: 상태바가 얇은 폰(안드로이드)에서도 시안 위치 그대로
  const hourRef = useRef(null);
  const [hx, setHx] = useState(0);
  const [open, setOpen] = useState(null); // 10일 예보에서 펼친 날
  const page = (dir) => {
    const x = Math.max(0, hx + dir * 219);
    hourRef.current?.scrollTo({ x, animated: true });
  };
  const min = Math.min(...w.days.map((d) => d.lo));
  const max = Math.max(...w.days.map((d) => d.hi));

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#fff' }} contentContainerStyle={{ paddingTop: 76 + top, paddingBottom: 130 }}>
      <View style={{ marginLeft: 28 }} accessibilityRole="header" accessibilityLabel="날씨">
        <Lettering name="wxTitle" color="#3993D4" />
      </View>

      {/* 지금 카드 */}
      <View style={[s.hero, { marginTop: 26 }]}>
        <FillSvg>
          <Defs>
            <LinearGradient id="wxHero" x1="0" y1="0.15" x2="1" y2="1">
              <Stop offset="0" stopColor="#F0F7FC" />
              <Stop offset="0.7" stopColor="#F9FCFF" />
              <Stop offset="1" stopColor="#FFFFFF" />
            </LinearGradient>
            <RadialGradient id="wxGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#CFE2F2" stopOpacity="0.9" />
              <Stop offset="1" stopColor="#CFE2F2" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" rx="20" fill="url(#wxHero)" />
          <Circle cx={width - 32 - 29 - 56.5} cy={143} r={78} fill="url(#wxGlow)" />
        </FillSvg>
        <Pressable style={s.areaRow} onPress={() => Alert.alert('지역', '지금은 월촌교 주변 날씨만 볼 수 있어요.')} accessibilityRole="button" accessibilityLabel={`지역 ${area}`}>
          <Image source={A.pin} style={{ width: 14, height: 16 }} />
          <Text style={s.area}>{area}</Text>
          <Text style={s.caret}>⌄</Text>
        </Pressable>
        <Text style={s.nowLabel}>{dong}의 지금</Text>
        <Text style={s.temp} accessibilityLabel={`기온 ${Math.round(tempC)}도`}>
          {Math.round(tempC)}°
        </Text>
        <View style={s.heroArt} pointerEvents="none">
          {HERO[kind] ? <Image source={HERO[kind]} style={{ width: 113, height: 113 }} /> : <WxIcon kind={kind} scale={4.2} style={{ marginTop: 14 }} />}
          {HERO[kind] && <Image source={A.caption} style={{ width: 96, height: 8, marginTop: 24 }} />}
        </View>
        <View style={s.condRow}>
          <Text style={s.cond}>{KIND_LABEL[kind]}</Text>
          <View style={s.vbar} />
          <Text style={s.feels}>체감 {w.feels}°</Text>
        </View>
        <View style={s.heroHr} />
        <View style={s.hiloRow}>
          <Image source={A.up} style={s.arrow} />
          <Text style={s.hiloLabel}>최고</Text>
          <Text style={s.hiloValue}>{w.hi}°</Text>
          <Image source={A.down} style={[s.arrow, { marginLeft: 22 }]} />
          <Text style={s.hiloLabel}>최저</Text>
          <Text style={s.hiloValue}>{w.lo}°</Text>
          <View style={{ flex: 1 }} />
          <View style={s.sampleDot} />
          <Text style={s.sample}>예시 데이터</Text>
        </View>
      </View>

      {/* 시간별 예보 */}
      <View style={[s.card, { height: 278 }]}>
        <View style={s.head}>
          <Image source={A.hourly} style={{ width: 19, height: 19 }} />
          <Text style={s.headTitle}>시간별 예보</Text>
          <View style={{ flex: 1 }} />
          <Pressable onPress={() => page(-1)} style={s.navBtn} accessibilityRole="button" accessibilityLabel="이전 시간">
            <Text style={s.navText}>‹</Text>
          </Pressable>
          <Pressable onPress={() => page(1)} style={[s.navBtn, { marginLeft: 6 }]} accessibilityRole="button" accessibilityLabel="다음 시간">
            <Text style={s.navText}>›</Text>
          </Pressable>
        </View>
        <Text style={s.summary}>{w.summary}</Text>
        <View style={s.hr} />
        <ScrollView
          ref={hourRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          onScroll={(e) => setHx(e.nativeEvent.contentOffset.x)}
          scrollEventThrottle={32}
          contentContainerStyle={{ paddingHorizontal: 22, gap: 11 }}
          style={{ marginTop: 19 }}
        >
          {w.hourly.map((h, i) => (
            <View key={i} style={[s.cell, i === 0 && { backgroundColor: '#EEF6FC' }]}>
              <Text style={[s.cellLabel, i === 0 && { color: '#2678B1' }]}>{h.label}</Text>
              <View style={s.cellIcon}>
                <WxIcon kind={h.kind} />
              </View>
              <Text style={[s.cellPop, !h.pop && { color: '#B4C2CB' }]}>{h.pop}%</Text>
              <Text style={s.cellTemp}>{h.temp}°</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* 10일간의 날씨 */}
      <View style={s.card}>
        <View style={s.head}>
          <Image source={A.calendar} style={{ width: 18, height: 18 }} />
          <Text style={s.headTitle}>10일간의 날씨</Text>
          <View style={{ flex: 1 }} />
          <Text style={s.eng}>DAILY FORECAST</Text>
        </View>
        <Text style={[s.summary, { fontSize: 11, color: '#94A3AC', marginTop: 12 }]}>날짜를 누르면 자세한 예보를 볼 수 있어요.</Text>
        <View style={[s.hr, { marginTop: 17 }]} />
        {w.days.map((d, i) => {
          const L = 133;
          const a = ((d.lo - min) / Math.max(max - min, 1)) * L;
          const b = ((d.hi - min) / Math.max(max - min, 1)) * L;
          const dot = i === 0 ? ((Math.round(tempC) - min) / Math.max(max - min, 1)) * L : null;
          return (
            <View key={i}>
              <Pressable onPress={() => setOpen(open === i ? null : i)} style={s.dayRow} accessibilityRole="button" accessibilityLabel={`${d.day} ${KIND_LABEL[d.kind]} 최저 ${d.lo}도 최고 ${d.hi}도`}>
                <View style={{ width: 46 }}>
                  <Text style={s.dayName}>{d.day}</Text>
                  <Text style={s.dayDate}>{d.date}</Text>
                </View>
                <View style={{ width: 40, alignItems: 'center' }}>
                  <WxIcon kind={d.kind} />
                  {d.pop ? <Text style={s.dayPop}>{d.pop}%</Text> : null}
                </View>
                <Text style={s.dayLo}>{d.lo}°</Text>
                <View style={s.track}>
                  <Svg width={L} height={5} style={{ position: 'absolute', left: 0, top: 0 }}>
                    <Defs>
                      <LinearGradient id={`dayBar${i}`} x1="0" y1="0" x2="1" y2="0">
                        <Stop offset="0" stopColor="#A0CEE9" />
                        <Stop offset="1" stopColor="#8CC2B6" />
                      </LinearGradient>
                    </Defs>
                    <Rect x={a} y={0} width={Math.max(b - a, 6)} height={5} rx={2.5} fill={`url(#dayBar${i})`} />
                  </Svg>
                  {dot != null && <View style={[s.nowDot, { left: Math.min(Math.max(dot - 5.5, -2), L - 9) }]} />}
                </View>
                <Text style={s.dayHi}>{d.hi}°</Text>
                <Text style={s.chev}>{open === i ? '⌃' : '⌄'}</Text>
              </Pressable>
              {open === i && (
                <Text style={s.dayMore}>
                  {KIND_LABEL[d.kind]} · 강수 확률 {d.pop}% · 최저 {d.lo}° / 최고 {d.hi}° (예시)
                </Text>
              )}
            </View>
          );
        })}
        <View style={{ height: 8 }} />
      </View>

      {/* 오늘의 날씨 */}
      <View style={{ marginLeft: 28, marginTop: 34 }} accessibilityRole="header" accessibilityLabel="오늘의 날씨">
        <Lettering name="wxTodayTitle" color="#3993D4" />
      </View>
      <View style={s.grid}>
        <Detail icon={A.drop} iw={14} label="강수 확률" value={w.pop} unit="%" note={w.popNote} />
        <Detail icon={A.wind} iw={17} ih={14} label="바람" value={w.wind} unit="m/s" note={w.windNote} />
        <Detail icon={A.humid} iw={14} label="습도" value={w.humidity} unit="%" note={w.humidNote} />
        <Detail icon={A.uv} iw={17} ih={18} label="자외선 지수" value={w.uv} unit={w.uvLabel} note={w.uvNote} />
      </View>

      {/* 우리 동네 공기 */}
      <View style={[s.card, { height: 208, marginTop: 20 }]}>
        <View style={s.head}>
          <Image source={A.air} style={{ width: 19, height: 17 }} />
          <Text style={s.headTitle}>우리 동네 공기</Text>
          <View style={{ flex: 1 }} />
          <View style={s.goodChip}>
            <Text style={s.goodText}>{w.air}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', marginTop: 20 }}>
          <View style={{ width: 180, paddingLeft: 23 }}>
            <Text style={s.airLabel}>미세먼지</Text>
            <Text style={s.airValue}>
              {w.pm10}
              <Text style={s.airUnit}> ㎍/㎥</Text>
            </Text>
          </View>
          <View style={s.airDiv} />
          <View style={{ paddingLeft: 26 }}>
            <Text style={s.airLabel}>초미세먼지</Text>
            <Text style={s.airValue}>
              {w.pm25}
              <Text style={s.airUnit}> ㎍/㎥</Text>
            </Text>
          </View>
        </View>
        <View style={s.airBar}>
          <Svg width="100%" height={5}>
            <Defs>
              <LinearGradient id="airBar" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor="#A2C3AB" />
                <Stop offset="0.4" stopColor="#C9D6B3" />
                <Stop offset="0.7" stopColor="#E1D6AA" />
                <Stop offset="1" stopColor="#D9B6AA" />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="5" rx="2.5" fill="url(#airBar)" />
          </Svg>
          <View style={[s.airDot, { left: `${Math.min(w.pm10 / 150, 1) * 100}%` }]} />
        </View>
        <Text style={s.airNote}>{w.airNote}</Text>
      </View>

      {/* 오늘의 산책 가이드 */}
      <View style={s.guide}>
        <Image source={A.leaf} style={s.leaf} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          <Image source={A.steps} style={{ width: 17, height: 19 }} />
          <Text style={s.guideHead}>오늘의 산책 가이드</Text>
        </View>
        <Text style={s.guideTitle}>{w.guide.title}</Text>
        <Text style={s.guideBody}>{w.guide.body}</Text>
        <View style={s.guideHr} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          <Image source={A.umbrella} style={{ width: 19, height: 19 }} />
          <Text style={s.guideItems}>{w.guide.items}</Text>
        </View>
      </View>
      <Text style={s.foot}>{srv ? '지금 기온·하늘: 기상청 초단기실황 · 나머지는 예시 데이터예요' : '시연용 예시 데이터예요 · 서버 연결 시 지금 기온·하늘이 실제 값으로 바뀌어요'}</Text>
    </ScrollView>
  );
}

function Detail({ icon, iw, ih, label, value, unit, note }) {
  return (
    <View style={s.detail}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Image source={icon} style={{ width: iw, height: ih ?? 16 }} resizeMode="contain" />
        <Text style={s.detailLabel}>{label}</Text>
      </View>
      <Text style={s.detailValue}>
        {value}
        <Text style={s.detailUnit}> {unit}</Text>
      </Text>
      <Text style={s.detailNote}>{note}</Text>
    </View>
  );
}

const card = { marginHorizontal: 16, marginTop: 20, borderRadius: 20, borderWidth: 1, borderColor: '#E6ECEE', backgroundColor: '#fff' };
const s = StyleSheet.create({
  hero: { marginHorizontal: 16, height: 307, borderRadius: 20, overflow: 'hidden', paddingHorizontal: 24 },
  areaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 29, alignSelf: 'flex-start' },
  area: { fontSize: 14, fontWeight: '600', color: '#4E6D80' },
  caret: { fontSize: 14, color: '#4E6D80', marginTop: -6, marginLeft: 2 },
  nowLabel: { fontSize: 12, color: '#8198A7', marginTop: 34 },
  temp: { fontSize: 86, lineHeight: 96, fontWeight: '400', color: '#253F52', letterSpacing: -3, marginTop: 2, marginLeft: -3 },
  heroArt: { position: 'absolute', right: 29, top: 87, width: 113, alignItems: 'center' },
  condRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  cond: { fontSize: 14, fontWeight: '600', color: '#526F82' },
  vbar: { width: 1.5, height: 16, backgroundColor: '#D9E5ED', marginHorizontal: 14 },
  feels: { fontSize: 11, color: '#8A9EAB' },
  heroHr: { height: 1.5, backgroundColor: '#E2ECF2', marginTop: 30, marginRight: 15 },
  hiloRow: { flexDirection: 'row', alignItems: 'center', marginTop: 19 },
  arrow: { width: 11, height: 12, marginRight: 5 },
  hiloLabel: { fontSize: 11, color: '#849AA8' },
  hiloValue: { fontSize: 12, fontWeight: '700', color: '#56778E', marginLeft: 8 },
  sampleDot: { width: 4.5, height: 4.5, borderRadius: 2.25, backgroundColor: '#91B69F', marginRight: 5 },
  sample: { fontSize: 10, color: '#9BAEB9', marginRight: 0 },
  card,
  head: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 22, marginTop: 21, height: 31 },
  headTitle: { fontSize: 15, fontWeight: '700', color: '#182630' },
  navBtn: { width: 31, height: 31, borderRadius: 9, borderWidth: 1.5, borderColor: '#E8EEF2', alignItems: 'center', justifyContent: 'center' },
  navText: { fontSize: 18, color: '#8BA0AC', marginTop: -2 },
  eng: { fontSize: 8, letterSpacing: 0.8, color: '#AAB4B9' },
  summary: { fontSize: 12, color: '#8599A5', paddingHorizontal: 23, marginTop: 15 },
  hr: { height: 1.5, backgroundColor: '#EDF2F5', marginHorizontal: 22, marginTop: 19 },
  cell: { width: 62, height: 130, borderRadius: 13, alignItems: 'center' },
  cellLabel: { fontSize: 12, fontWeight: '600', color: '#8A9CA7', marginTop: 13 },
  cellIcon: { height: 26, justifyContent: 'center', marginTop: 16 },
  cellPop: { fontSize: 11, color: '#62A4CF', marginTop: 9 },
  cellTemp: { fontSize: 18, fontWeight: '700', color: '#2D4A5E', marginTop: 8 },
  dayRow: { flexDirection: 'row', alignItems: 'center', height: 66, marginHorizontal: 22, borderBottomWidth: 1.5, borderBottomColor: '#EDF2F4' },
  dayName: { fontSize: 13, fontWeight: '600', color: '#536D7D' },
  dayDate: { fontSize: 9, color: '#A0B0B9', marginTop: 7 },
  dayPop: { fontSize: 9, color: '#62A4CF', marginTop: 4 },
  dayLo: { width: 36, textAlign: 'right', fontSize: 15, color: '#9AAFB9', marginRight: 12 },
  track: { width: 133, height: 5, borderRadius: 2.5, backgroundColor: '#F0F4F6' },
  nowDot: { position: 'absolute', top: -3, width: 11, height: 11, borderRadius: 5.5, backgroundColor: '#4F9CC5', borderWidth: 2, borderColor: '#fff' },
  dayHi: { width: 36, textAlign: 'right', fontSize: 15, color: '#587184' },
  chev: { fontSize: 14, color: '#BAC7CF', marginLeft: 12, marginTop: -6 },
  dayMore: { fontSize: 12, color: '#657983', marginHorizontal: 22, paddingVertical: 12, borderBottomWidth: 1.5, borderBottomColor: '#EDF2F4' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: 16, gap: 14, marginTop: 20 },
  detail: { width: '47.7%', flexGrow: 1, height: 147, borderRadius: 20, borderWidth: 1, borderColor: '#E6ECEE', paddingLeft: 23, paddingTop: 24 },
  detailLabel: { fontSize: 12, color: '#879DA9' },
  detailValue: { fontSize: 30, color: '#577C94', marginTop: 25 },
  detailUnit: { fontSize: 11, color: '#91A7B5' },
  detailNote: { fontSize: 11, color: '#96A7B1', marginTop: 14, marginRight: 8 },
  goodChip: { height: 23, borderRadius: 7, paddingHorizontal: 9, backgroundColor: '#EEF6F0', justifyContent: 'center' },
  goodText: { fontSize: 11, fontWeight: '600', color: '#7B9E88' },
  airLabel: { fontSize: 11, color: '#96A7AF' },
  airValue: { fontSize: 24, color: '#658876', marginTop: 14 },
  airUnit: { fontSize: 11, color: '#9DAEB7' },
  airDiv: { width: 1.5, height: 59, backgroundColor: '#EEF2F3' },
  airBar: { marginHorizontal: 22, marginTop: 20, height: 5 },
  airDot: { position: 'absolute', top: -3, marginLeft: -5.5, width: 11, height: 11, borderRadius: 5.5, backgroundColor: '#68957C', borderWidth: 2, borderColor: '#fff' },
  airNote: { fontSize: 11, color: '#96A7AF', paddingHorizontal: 23, marginTop: 16 },
  guide: {
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0EBE3',
    backgroundColor: '#EDF5EF',
    paddingHorizontal: 25,
    paddingTop: 22,
    paddingBottom: 20,
    overflow: 'hidden',
  },
  leaf: { position: 'absolute', right: -2, top: 29, width: 52, height: 81 },
  guideHead: { fontSize: 11, color: '#769782' },
  guideTitle: { fontSize: 20, fontWeight: '700', color: '#446853', marginTop: 20, marginRight: 30 },
  guideBody: { fontSize: 13, lineHeight: 21, color: '#789181', marginTop: 16 },
  guideHr: { height: 1.5, backgroundColor: '#DCE8DF', marginTop: 19, marginBottom: 15 },
  guideItems: { fontSize: 12, color: '#698B75' },
  foot: { fontSize: 11, color: '#A6AFB4', textAlign: 'center', marginTop: 22, marginHorizontal: 24 },
});
