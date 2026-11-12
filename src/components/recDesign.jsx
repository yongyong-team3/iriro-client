// 기록 화면들(기록 탭 · 활동 기록 · 기록 상세 · 배지) 공용 — 최종 시안 2026-11-11 색과 활동 그림
import { Image, StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import { IMG } from './homeUi';
import { Lettering } from './RecordCard';
import { hoursMin, km1 } from '../lib/records';

// 시안 색
export const RC = {
  brand: '#3993D4',
  ink: '#182630',
  sub: '#6E7D88',
  line: '#E5EBEE',
  track: '#F3F7F8',
  limeSoft: '#EDFEC6', // 막대 · 활동한 날 · 연속 활동
  limeText: '#61A940',
  dayOn: '#14825F',
  darkSub: '#C8D4D9',
  darkLine: '#4A5962',
  lime: '#CCFF40',
};

/** 활동 그림 (산책·러닝·자전거). 여백을 잘라 낸 그림이라 동그라미 가운데에 정확히 와요.
 *  size: 예전 그림(여백 포함) 높이 기준 — 그림 실제 크기 비율은 그대로예요 */
const GLYPH = { walk: [32, 45, 84], run: [50, 48, 87], bike: [63, 41, 90] }; // 잘라 낸 너비·높이, 원래 그림 높이
export function ActImg({ activity, size = 24, color = RC.brand }) {
  const [gw, gh, H] = GLYPH[activity] ?? GLYPH.run;
  const h = (gh / H) * size;
  return <Image source={IMG[`act_${activity}`] ?? IMG.act_run} style={{ width: (gw / gh) * h, height: h, tintColor: color }} resizeMode="contain" />;
}

// 시안: 활동마다 동그라미 바탕이 조금씩 달라요
export const ACT_BG = { run: '#EDF6FD', walk: '#F3F7F8', bike: '#F3F7F8' };

/** 이번 달 기록 연두 카드 (목록 · 상세 위에 같은 모양) */
export function MonthCard({ y, m, st, style }) {
  const now = new Date();
  const atNow = y === now.getFullYear() && m === now.getMonth();
  return (
    <View style={[s.month, style]}>
      {atNow ? <Lettering name="thisMonth" color={RC.limeText} /> : <Text style={s.monthLabel}>{m + 1}월 기록</Text>}
      <View style={s.monthRow}>
        <Text style={s.count}>{st.count}회</Text>
        <Text style={s.monthSum}>
          {km1(st.km)} km · {hoursMin(st.sec)}
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  month: { height: 79, borderRadius: 20, backgroundColor: RC.limeSoft, paddingLeft: 18, paddingRight: 22, paddingTop: 18 },
  monthLabel: { fontSize: 13, color: RC.limeText, fontWeight: '600' },
  monthRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 8 },
  count: { fontSize: 25, fontWeight: '800', color: RC.ink, lineHeight: 28 },
  monthSum: { fontSize: 14, color: RC.limeText, fontWeight: '600', marginBottom: 2 },
});
