// 활동 기록 목록 (최종 시안 2026-11-11)
//   '활동 기록'(손글씨풍) / 이번 달 기록 n회 · 거리 · 시간(연두 카드) / 전체·산책·러닝·자전거 / 2026년 11월 ‹ › / 기록 카드 → 상세
//   시안처럼 아래 탭 바(기록 밝게)를 같이 보여줘요.
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../components/AppText';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ACT, dateLabel, km2, useMonthList, useMonthStats, shortClock, useRecords } from '../../lib/records';
import { Ic } from '../../components/recUi';
import { Lettering } from '../../components/RecordCard';
import { ACT_BG, ActImg, MonthCard, RC } from '../../components/recDesign';
import { StackTabBar, useTabBarHeight } from '../../components/TabBarView';

const STATUS_TOP = 59;
const FILTERS = [
  ['all', '전체', 69],
  ['walk', '산책', 70],
  ['run', '러닝', 70],
  ['bike', '자전거', 100],
];
export default function Records() {
  const router = useRouter();
  const top = Math.max(useSafeAreaInsets().top - STATUS_TOP, 0); // 시안은 상태바 59 기준: 상태바가 얇은 폰(안드로이드)에서도 시안 위치 그대로
  const barH = useTabBarHeight();
  const { records } = useRecords();
  const today = new Date();
  const [[y, m], setYm] = useState([today.getFullYear(), today.getMonth()]);
  const [filter, setFilter] = useState('all');
  const st = useMonthStats(records, y, m);
  const monthList = useMonthList(records, y, m); // 서버: ACT-02 ?month=
  const list = (monthList ?? []).filter((r) => filter === 'all' || r.activity === filter);
  const atNow = y === today.getFullYear() && m === today.getMonth();
  const move = (k) => setYm(([yy, mm]) => [yy + Math.floor((mm + k) / 12), (mm + k + 12) % 12]);

  const header = (
    <View>
      <View style={{ marginLeft: -0.8 }} accessibilityRole="header" accessibilityLabel="활동 기록">
        <Lettering name="actTitle" color={RC.brand} />
      </View>
      <MonthCard y={y} m={m} st={st} style={{ marginTop: 26, marginLeft: -5 }} />
      <View style={s.chips}>
        {FILTERS.map(([k, label, w], i) => {
          const on = filter === k;
          return (
            <Pressable
              key={k}
              onPress={() => setFilter(k)}
              style={[s.chip, { width: w, marginLeft: i ? 11 : 0 }, on && { backgroundColor: RC.brand }]}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
            >
              <Text style={[s.chipText, on && { color: '#fff', fontWeight: '700' }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={s.monthHead}>
        <Text style={s.monthTitle}>
          {y}년 {m + 1}월
        </Text>
        <View style={{ flexDirection: 'row', gap: 20, marginRight: 14 }}>
          <Pressable onPress={() => move(-1)} hitSlop={10} accessibilityLabel="이전 달">
            <Text style={s.arrow}>‹</Text>
          </Pressable>
          <Pressable onPress={() => !atNow && move(1)} hitSlop={10} accessibilityLabel="다음 달" disabled={atNow}>
            <Text style={[s.arrow, atNow && { opacity: 0.3 }]}>›</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <FlatList
        data={list}
        keyExtractor={(r) => r.id}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingTop: 68 + top, paddingLeft: 21, paddingRight: 20, paddingBottom: barH + 30 }}
        ItemSeparatorComponent={() => <View style={{ height: 11 }} />}
        ListEmptyComponent={<Text style={s.empty}>{monthList === null ? '불러오는 중…' : <>이 달에는 {filter === 'all' ? '' : `${ACT[filter].label} `}기록이 없어요.</>}</Text>}
        renderItem={({ item: r }) => (
          <Pressable
            style={({ pressed }) => [s.row, pressed && { opacity: 0.85 }]}
            onPress={() => router.push(`/records/${r.id}`)}
            accessibilityRole="button"
            accessibilityLabel={`${ACT[r.activity].label} ${r.trailName} ${km2(r.distanceKm)}km`}
          >
            <View style={[s.ic, { backgroundColor: ACT_BG[r.activity] ?? RC.track }]}>
              <ActImg activity={r.activity} size={26} />
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={s.title}>
                {ACT[r.activity].label} · {r.trailName}
              </Text>
              <Text style={s.date}>{dateLabel(r.date)}</Text>
              <Text style={s.meta}>
                {km2(r.distanceKm)} km{'  ·  '}
                {shortClock(r.durationSec)}
              </Text>
            </View>
            <Ic name="chevron" size={16} color={RC.sub} />
          </Pressable>
        )}
      />
      <StackTabBar current="history" />
    </View>
  );
}

const s = StyleSheet.create({
  chips: { flexDirection: 'row', marginTop: 20, marginLeft: -1 },
  chip: { height: 35, borderRadius: 17.5, backgroundColor: '#E3F1FD', alignItems: 'center', justifyContent: 'center' },
  chipText: { fontSize: 14, color: '#525252', fontWeight: '500' },
  monthHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 14 },
  monthTitle: { fontSize: 19, fontWeight: '700', color: RC.ink },
  arrow: { fontSize: 18, color: RC.sub },
  row: { flexDirection: 'row', alignItems: 'center', height: 92, borderRadius: 17.5, borderWidth: 1, borderColor: RC.line, paddingLeft: 15, paddingRight: 16 },
  ic: { width: 45, height: 45, borderRadius: 22.5, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '700', color: RC.ink },
  date: { fontSize: 12, color: RC.sub, marginTop: 6 },
  meta: { fontSize: 12.5, color: RC.ink, marginTop: 8, fontWeight: '500' },
  empty: { textAlign: 'center', color: RC.sub, marginTop: 30, fontSize: 13 },
});
