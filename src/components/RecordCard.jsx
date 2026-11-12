// 기록 카드 (최종 시안 2026-11-11 기록 흐름) — 측정 화면 위 · 코스 화면 아래에 같은 모양으로 써요
//   '러닝 기록' + 오른쪽 칩 / 00:00:00 / 거리 · 평균 페이스(자전거는 평균 속도)
//   시안 353×170, 모서리 20, 그림자. 아직 거리가 없으면 시안처럼 단위만 보여요(km · ′″ / km).
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Text } from './AppText';
import { COLOR } from '../constants/colors';
import { LETTERING } from '../constants/lettering';
import { ACT, clock, pace } from '../lib/records';

/** 시안 손글씨풍 글자 (정해진 글자만). height 를 주면 비율대로 맞춰요 */
export function Lettering({ name, height, color = COLOR.white, style }) {
  const g = LETTERING[name];
  if (!g) return null;
  const [x, y, w, h] = g.vb;
  const k = height ? height / h : 1;
  return (
    <Svg width={w * k} height={h * k} viewBox={`${x} ${y} ${w} ${h}`} style={style}>
      <Path d={g.d} fill={color} />
    </Svg>
  );
}

/** 칩: 기록중(초록 고리) · AI 분석 결과(반짝이) 등 */
export function RecChip({ label, fg = COLOR.okText, bg = COLOR.okSoft, icon = 'ring', style }) {
  return (
    <View style={[s.chip, { backgroundColor: bg }, style]}>
      {icon === 'ring' ? (
        <Svg width={11} height={11} viewBox="0 0 11 11">
          <Circle cx={5.5} cy={5.5} r={4.6} stroke={fg} strokeWidth={1.4} fill="none" />
          <Circle cx={5.5} cy={5.5} r={2.2} fill={fg} />
        </Svg>
      ) : icon === 'sparkle' ? (
        <Svg width={16} height={16} viewBox="0 0 24 24">
          <Path d="M10 3c.7 4.6 2.4 6.3 7 7-4.6.7-6.3 2.4-7 7-.7-4.6-2.4-6.3-7-7 4.6-.7 6.3-2.4 7-7z" fill={fg} />
          <Path d="M19 14c.3 2 1 2.7 3 3-2 .3-2.7 1-3 3-.3-2-1-2.7-3-3 2-.3 2.7-1 3-3z" fill={fg} />
        </Svg>
      ) : icon === 'alert' ? (
        <Svg width={13} height={13} viewBox="0 0 24 24">
          <Path d="M12 3 2 20.5h20z" fill={fg} />
          <Path d="M12 10v4.5M12 17.3v.2" stroke={COLOR.white} strokeWidth={2.2} strokeLinecap="round" />
        </Svg>
      ) : null}
      <Text style={[s.chipText, { color: fg }]}>{label}</Text>
    </View>
  );
}

export default function RecordCard({ activity = 'walk', elapsed = 0, km = 0, chip, style }) {
  const a = ACT[activity] ?? ACT.walk;
  const bike = activity === 'bike';
  const hasKm = km >= 0.005;
  const p = pace(elapsed, km);
  const second = bike ? (hasKm && elapsed ? `${((km / elapsed) * 3600).toFixed(1)} km/h` : 'km/h') : p === '--' ? '′″ / km' : `${p} / km`;
  return (
    <View style={[s.card, style]}>
      <View style={s.head}>
        <Text style={s.title}>{a.label} 기록</Text>
        {chip ? <RecChip {...chip} /> : null}
      </View>
      <Text style={s.timer} accessibilityLabel={`경과 시간 ${clock(elapsed)}`}>
        {clock(elapsed)}
      </Text>
      <View style={s.hr} />
      <View style={{ flexDirection: 'row' }}>
        <View style={{ width: 164 }}>
          <Text style={s.label}>거리</Text>
          <Text style={s.value}>{hasKm ? `${km.toFixed(1)} km` : 'km'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.label}>{bike ? '평균 속도' : '평균 페이스'}</Text>
          <Text style={s.value}>{second}</Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  // 시안: 353×170 · 모서리 20 · 흰 바탕 · 옅은 그림자
  card: {
    height: 170,
    borderRadius: 20,
    backgroundColor: COLOR.white,
    paddingLeft: 26,
    paddingRight: 13,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 29, marginTop: 12, paddingLeft: 3 },
  title: { fontSize: 14, fontWeight: '600', color: COLOR.ink },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 29, borderRadius: 14.5, paddingHorizontal: 13 },
  chipText: { fontSize: 12, fontWeight: '600' },
  // 시안: 00:00:00 폭 164 = Pretendard Bold 36
  timer: { fontSize: 36, fontWeight: '700', color: COLOR.ink, marginTop: 6, lineHeight: 42, fontVariant: ['tabular-nums'], paddingLeft: 4 },
  hr: { height: 1, backgroundColor: COLOR.line, marginTop: 8, marginBottom: 10, marginRight: 13 },
  label: { fontSize: 12, color: COLOR.sub },
  value: { fontSize: 18, fontWeight: '700', color: COLOR.ink, marginTop: 7 },
});
