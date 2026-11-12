// 기록 (최종 시안 2026-11-11) — 주간 / 월간
//   주간: '기록'(손글씨풍) / 주간·월간 / 전체 활동(횟수 · 누적 거리 · 누적 시간) / 이번 주 요일별 막대(연두, 오늘 파랑)
//         / 최근 활동(회색 줄) / 배지 n / 8 획득(연두 줄)
//   월간: 이번 달 거리·횟수·시간(↗ 활동 기록 목록) / 연속 활동 n일째(연두 알약) / 달력(활동한 날 연두, 오늘 파랑)
//   시안 숫자는 393 폭 기준 그대로 옮겼어요.
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/Auth';
import { USE_MOCK } from '../../api/client';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../components/AppText';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { ACT, DAY, hoursMin, km1, km2, shortClock, totals, useMonthStats, useRecords, useWeekStats, whenShort } from '../../lib/records';
import { useBadgeTiles } from '../../lib/badgeCatalog';
import { Ic, Segmented } from '../../components/recUi';
import { Lettering } from '../../components/RecordCard';
import { ActImg, RC } from '../../components/recDesign';

const STATUS_TOP = 59;
export default function HistoryScreen() {
  const [tab, setTab] = useState('week');
  const { records, isSample } = useRecords();
  const top = Math.max(useSafeAreaInsets().top - STATUS_TOP, 0); // 시안은 상태바 59 기준: 상태바가 얇은 폰(안드로이드)에서도 시안 위치 그대로
  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView contentContainerStyle={{ paddingTop: 69 + top, paddingBottom: 30 }}>
        <View style={{ marginLeft: 25.5 }} accessibilityRole="header" accessibilityLabel="기록">
          <Lettering name="recTitle" color={RC.brand} />
        </View>
        <View style={{ paddingHorizontal: 20 }}>
          <Segmented
            style={{ marginTop: tab === 'month' ? 28 : 25 }}
            value={tab}
            onChange={setTab}
            items={[
              ['week', '주간'],
              ['month', '월간'],
            ]}
          />
          {tab === 'week' ? <Weekly records={records} /> : <Monthly records={records} />}
          {isSample && <Text style={s.sample}>시연용 예시 기록이에요 · 첫 활동을 저장하면 내 기록으로 바뀌어요</Text>}
        </View>
      </ScrollView>
    </View>
  );
}

function Weekly({ records }) {
  const router = useRouter();
  // 전체 누적: 서버는 USER-01 요약(횟수·거리)을 써요. 누적 시간은 아직 API에 없어요
  const { user, refreshMe } = useAuth();
  useEffect(() => {
    if (!USE_MOCK) refreshMe().catch(() => {});
  }, []);
  const sum = user?.summary;
  const all = USE_MOCK || !sum ? totals(records) : { count: sum.totalActivityCount ?? 0, km: (sum.totalDistanceMeters ?? 0) / 1000, sec: null };
  const w = useWeekStats(records);
  const max = Math.max(...w.days.map((d) => d.km), 0.1);
  const { tiles, earned } = useBadgeTiles(records);
  const recent = records[0];
  const md = (d) => `${d.getMonth() + 1}.${d.getDate()}`;

  return (
    <>
      {/* 전체 활동 (시안 353×123, 모서리 22) */}
      <View style={s.dark}>
        <Text style={s.darkLabel}>전체 활동</Text>
        <View style={s.darkRow}>
          <Text style={s.darkBig} numberOfLines={1} adjustsFontSizeToFit>
            {all.count}회
          </Text>
          <View style={s.vbar} />
          <View style={{ width: 109 }}>
            <Text style={s.darkMid} numberOfLines={1} adjustsFontSizeToFit>
              {km1(all.km)} km
            </Text>
            <Text style={s.darkSmall}>누적 거리</Text>
          </View>
          <View style={[s.vbar, { marginLeft: 0, marginRight: 12 }]} />
          <View style={{ flex: 1 }}>
            <Text style={[s.darkMid, { fontSize: 17 }]} numberOfLines={1} adjustsFontSizeToFit>
              {all.sec == null ? '—' : hoursMin(all.sec)}
            </Text>
            <Text style={s.darkSmall}>누적 시간</Text>
          </View>
        </View>
      </View>

      {/* 이번 주 (시안 352×245) */}
      <View style={s.week}>
        <View style={s.between}>
          <Text style={s.cardTitle}>이번 주</Text>
          <Text style={s.small}>
            {md(w.from)} – {md(w.to)}
          </Text>
        </View>
        <View style={[s.between, { marginTop: 12, alignItems: 'flex-end' }]}>
          <Text style={s.weekKm}>{km1(w.km)} km</Text>
          <Text style={[s.small, { fontSize: 13 }]}>{w.count}회 활동</Text>
        </View>
        <View style={s.bars} accessibilityLabel={`요일별 거리: ${w.days.map((d) => `${d.label} ${km1(d.km)}km`).join(', ')}`}>
          {w.days.map((d) => (
            <View key={d.label} style={s.barCol}>
              <View style={s.barTrack}>{d.km > 0 && <View style={[s.barFill, { height: `${Math.max((d.km / max) * 100, 28)}%`, backgroundColor: d.today ? RC.brand : RC.limeSoft }]} />}</View>
              <Text style={[s.barLabel, d.today && { color: RC.brand, fontWeight: '700' }]}>{d.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={[s.between, { marginTop: 19, marginBottom: 12 }]}>
        <Text style={s.section}>최근 활동</Text>
        <Pressable onPress={() => router.push('/records')} hitSlop={8} accessibilityRole="link">
          <Text style={s.link}>전체 보기 ›</Text>
        </Pressable>
      </View>
      {recent ? (
        <Pressable
          style={({ pressed }) => [s.recent, pressed && { opacity: 0.85 }]}
          onPress={() => router.push(`/records/${recent.id}`)}
          accessibilityRole="button"
          accessibilityLabel="최근 활동 자세히 보기"
        >
          <View style={[s.dot32, { backgroundColor: '#D5EAEE' }]}>
            <ActImg activity={recent.activity} size={17} color="#276849" />
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={s.recentTitle}>
              {ACT[recent.activity].label} · {recent.trailName}
            </Text>
            <Text style={s.recentSub}>
              {whenShort(recent.date)} · {km2(recent.distanceKm)} km · {shortClock(recent.durationSec)}
            </Text>
          </View>
          <Ic name="chevron" size={15} color="#9AA49F" />
        </Pressable>
      ) : (
        <View style={s.recent}>
          <Text style={s.small}>아직 기록이 없어요. ▶ 버튼으로 첫 활동을 기록해 보세요.</Text>
        </View>
      )}

      <Pressable
        style={({ pressed }) => [s.badgeRow, pressed && { opacity: 0.85 }]}
        onPress={() => router.push('/badges')}
        accessibilityRole="button"
        accessibilityLabel={`배지 ${earned} / ${tiles.length} 획득, 배지 보기`}
      >
        <View style={[s.dot32, { backgroundColor: RC.limeSoft }]}>
          <Svg width={17} height={17} viewBox="0 0 24 24">
            <Path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" fill={RC.limeText} />
          </Svg>
        </View>
        <Text style={s.badgeText}>
          배지 {earned} / {tiles.length} 획득
        </Text>
        <Ic name="chevron" size={15} color={RC.limeText} />
      </Pressable>
    </>
  );
}

function Monthly({ records }) {
  const router = useRouter();
  const today = new Date();
  const [ym, setYm] = useState([today.getFullYear(), today.getMonth()]);
  const [y, m] = ym;
  const st = useMonthStats(records, y, m);
  const run = st.streak;
  const first = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const cells = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const isToday = (d) => d && y === today.getFullYear() && m === today.getMonth() && d === today.getDate();
  const move = (k) => setYm(([yy, mm]) => [yy + Math.floor((mm + k) / 12), (mm + k + 12) % 12]);
  const atNow = y === today.getFullYear() && m === today.getMonth();

  return (
    <>
      {/* 이번 달 (시안 353×117) */}
      <View style={[s.dark, { height: 117, flexDirection: 'row', alignItems: 'center', paddingTop: 0 }]}>
        <View style={{ flex: 1 }}>
          <Text style={s.darkLabel}>
            {y}년 {m + 1}월
          </Text>
          <Text style={s.monthKm}>{km1(st.km)} km</Text>
          <Text style={[s.darkSmall, { fontSize: 13, marginTop: 4 }]}>
            {st.count}회 활동 · {hoursMin(st.sec)}
          </Text>
        </View>
        <Pressable onPress={() => router.push('/records')} style={s.limeBtn} accessibilityRole="button" accessibilityLabel="활동 기록 목록 보기">
          <Ic name="arrowUpRight" size={24} color={RC.ink} />
        </Pressable>
      </View>

      {/* 연속 활동 (시안 353×61 알약) */}
      <View style={s.streak}>
        <Text style={s.streakLabel}>연속 활동</Text>
        <Text style={s.streakText}>{run ? `${run}일째 이어가고 있어요!` : '오늘 다시 시작해 볼까요?'}</Text>
      </View>

      {/* 달력 (시안 352×317) */}
      <View style={s.cal}>
        <View style={[s.between, { paddingHorizontal: 9 }]}>
          <Text style={s.cardTitle}>달력</Text>
          <View style={s.monthNav}>
            <Pressable onPress={() => move(-1)} hitSlop={10} accessibilityLabel="이전 달">
              <Text style={s.navArrow}>‹</Text>
            </Pressable>
            <Text style={[s.small, { fontSize: 13 }]}>{m + 1}월</Text>
            <Pressable onPress={() => !atNow && move(1)} hitSlop={10} accessibilityLabel="다음 달" disabled={atNow}>
              <Text style={[s.navArrow, atNow && { opacity: 0.3 }]}>›</Text>
            </Pressable>
          </View>
        </View>
        <View style={[s.grid, { marginTop: 14 }]}>
          {DAY.map((d) => (
            <Text key={d} style={[s.cell, s.dow]}>
              {d}
            </Text>
          ))}
        </View>
        <View style={s.grid}>
          {cells.map((d, i) => {
            const on = d && st.activeDays.has(d);
            const now = isToday(d);
            return (
              <View key={i} style={s.cell}>
                {d ? (
                  <View style={[s.day, on && { backgroundColor: RC.limeSoft }, now && { backgroundColor: RC.brand }]}>
                    <Text style={[s.dayText, on && { color: RC.dayOn, fontWeight: '700' }, now && { color: '#fff', fontWeight: '700' }]}>{d}</Text>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
        <View style={s.legend}>
          <View style={[s.legendDot, { backgroundColor: RC.limeSoft }]} />
          <Text style={s.legendText}>활동한 날</Text>
          <View style={[s.legendDot, { backgroundColor: RC.brand, marginLeft: 14 }]} />
          <Text style={s.legendText}>오늘</Text>
        </View>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  sample: { fontSize: 12, color: RC.sub, textAlign: 'center', marginTop: 20 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dark: { marginTop: 20, height: 123, borderRadius: 22, backgroundColor: RC.ink, paddingLeft: 20, paddingRight: 18, paddingTop: 17 },
  darkLabel: { fontSize: 13, color: RC.darkSub },
  darkRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  darkBig: { width: 78, fontSize: 40, fontWeight: '700', color: '#fff', letterSpacing: -1 },
  vbar: { width: 1, height: 48, backgroundColor: RC.darkLine, marginLeft: 16, marginRight: 16 },
  darkMid: { fontSize: 20, fontWeight: '700', color: '#fff' },
  darkSmall: { fontSize: 12, color: RC.darkSub, marginTop: 7 },
  monthKm: { fontSize: 31, fontWeight: '800', color: '#fff', marginTop: 6 },
  limeBtn: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: RC.lime, alignItems: 'center', justifyContent: 'center', marginRight: 2 },
  week: { marginTop: 18, height: 245, borderRadius: 21.5, borderWidth: 1, borderColor: RC.line, paddingHorizontal: 17, paddingTop: 16 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: RC.ink },
  small: { fontSize: 12, color: RC.sub },
  weekKm: { fontSize: 25, fontWeight: '700', color: RC.brand },
  bars: { flexDirection: 'row', marginTop: 21, marginLeft: 16 },
  barCol: { width: 44, alignItems: 'flex-start' },
  barTrack: { width: 24, height: 88, borderRadius: 12, backgroundColor: RC.track, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { width: '100%', borderRadius: 12 },
  barLabel: { width: 24, textAlign: 'center', fontSize: 12, color: RC.sub, marginTop: 12 },
  section: { fontSize: 18, fontWeight: '700', color: RC.ink },
  link: { fontSize: 12.5, color: RC.brand, fontWeight: '500' },
  dot32: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  recent: { flexDirection: 'row', alignItems: 'center', height: 53, borderRadius: 16, backgroundColor: '#EDF3F4', paddingLeft: 7, paddingRight: 16, marginHorizontal: -2 },
  recentTitle: { fontSize: 13, fontWeight: '600', color: '#18211D' },
  recentSub: { fontSize: 11, color: '#77817C', marginTop: 5 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', height: 44, borderRadius: 15, backgroundColor: '#F7FCE8', paddingLeft: 7, paddingRight: 16, marginTop: 12, marginHorizontal: -2 },
  badgeText: { flex: 1, marginLeft: 10, fontSize: 15, fontWeight: '700', color: RC.limeText },
  streak: { marginTop: 11, height: 61, borderRadius: 30.5, backgroundColor: RC.limeSoft, paddingLeft: 23, justifyContent: 'center', marginHorizontal: -2 },
  streakLabel: { fontSize: 12, color: RC.limeText, fontWeight: '500' },
  streakText: { fontSize: 17, fontWeight: '700', color: '#2B3A2B', marginTop: 4 },
  cal: { marginTop: 14, minHeight: 317, borderRadius: 21.5, borderWidth: 1, borderColor: RC.line, paddingTop: 18, paddingHorizontal: 18, paddingBottom: 18 },
  monthNav: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  navArrow: { fontSize: 18, color: RC.sub, paddingHorizontal: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, height: 43, alignItems: 'center', justifyContent: 'center' },
  dow: { height: 26, fontSize: 12, color: RC.sub, textAlign: 'center', textAlignVertical: 'center', lineHeight: 26 },
  day: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 12, color: RC.sub },
  // 범례는 달력 아래에 따로 한 줄 (6주짜리 달에도 날짜와 겹치지 않게)
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 6, marginRight: 8 },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 5 },
  legendText: { fontSize: 11, color: RC.sub },
});
