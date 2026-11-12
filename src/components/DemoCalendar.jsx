// 날짜·시각 골라 보기 (홈 오른쪽 달력 버튼)
//   데이터가 있는 날짜·시각만 고를 수 있어요. 나머지 날은 흐리게, 누르면 '데이터가 없어요' 안내.
//   지금(시연): 2024년 7월 18~19일 장면 5개(mock/scenes.js)에서 고를 수 있는 시각을 만들어요.
//   나중(서버): availableTimes() 를 서버 '데이터 있는 시각 목록'으로, setScene 을 '그 시각 상태 받기'로 바꾸면 화면은 그대로예요.
import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { Text } from './AppText';
import { useAppState } from '../context/AppState';
import { SCENES } from '../mock/scenes';

const C = { brand: '#3993D4', ink: '#182630', sub: '#6E7D88', line: '#E5EBEE', soft: '#EDFEC6', softText: '#14825F', off: '#C3CBD0', icon: '#6E7D88' };
const DOW = ['일', '월', '화', '수', '목', '금', '토'];

/** 고를 수 있는 시각 목록 [{ id, date:'2024-07-18', time:'05:00', label }] — 나중에 서버 목록으로 바꿔요 */
function availableTimes() {
  return SCENES.filter((s) => s.time).map((s) => ({ id: s.id, date: s.time.slice(0, 10), time: s.time.slice(11, 16), label: s.label }));
}

const ampm = (hhmm) => {
  const h = Number(hhmm.slice(0, 2));
  const m = hhmm.slice(3, 5);
  const part = h < 6 ? '새벽' : h < 12 ? '오전' : h < 18 ? '오후' : '저녁';
  return `${part} ${h % 12 || 12}:${m}`;
};

/** 홈 오른쪽 버튼 줄의 달력 버튼 그림 (다른 버튼과 같은 회색 선) */
export function CalendarGlyph({ color = C.icon }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20">
      <Rect x={2.2} y={3.8} width={15.6} height={13.6} rx={3} fill="none" stroke={color} strokeWidth={1.5} />
      <Path d="M2.6 8.2H17.4" stroke={color} strokeWidth={1.5} />
      <Path d="M6.5 2.3V5.3M13.5 2.3V5.3" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      <Rect x={5.6} y={10.6} width={2.4} height={2.4} rx={0.6} fill={color} />
      <Rect x={8.8} y={10.6} width={2.4} height={2.4} rx={0.6} fill={color} />
      <Rect x={12} y={10.6} width={2.4} height={2.4} rx={0.6} fill={color} />
    </Svg>
  );
}

export function DemoCalendar({ visible, onClose, onPicked }) {
  const { scene, setScene } = useAppState();
  const times = useMemo(availableTimes, []);
  const days = useMemo(() => new Set(times.map((t) => t.date)), [times]);
  // 보여 줄 달: 데이터가 있는 첫 날의 달 (지금은 2024년 7월)
  const first = times[0]?.date ?? '2024-07-18';
  const [y, m] = [Number(first.slice(0, 4)), Number(first.slice(5, 7)) - 1];
  const [day, setDay] = useState(scene.time ? scene.time.slice(0, 10) : first);
  const [pick, setPick] = useState(scene.time ? scene.id : null);
  const [note, setNote] = useState(null);

  const startDow = new Date(y, m, 1).getDay();
  const count = new Date(y, m + 1, 0).getDate();
  const cells = [...Array(startDow).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)];
  const key = (d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const dayTimes = times.filter((t) => t.date === day);

  const choose = (id) => {
    setScene(id);
    onClose();
    onPicked?.(id); // 홈: 그 하천 위치로 지도 이동
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={s.dim} onPress={onClose} accessibilityLabel="닫기">
        <Pressable style={s.card} onPress={() => {}}>
          <View style={s.headRow}>
            <Text style={s.title}>날짜·시각 골라 보기</Text>
            <View style={s.tag}>
              <Text style={s.tagText}>시연 데이터</Text>
            </View>
          </View>
          <Text style={s.sub}>2024년 7월 집중호우 때 기록이에요. 데이터가 있는 날만 고를 수 있어요.</Text>

          <Text style={s.month}>
            {y}년 {m + 1}월
          </Text>
          <View style={s.grid}>
            {DOW.map((d) => (
              <Text key={d} style={[s.cell, s.dow]}>
                {d}
              </Text>
            ))}
          </View>
          <View style={s.grid}>
            {cells.map((d, i) => {
              if (!d) return <View key={i} style={s.cell} />;
              const k = key(d);
              const has = days.has(k);
              const on = k === day;
              return (
                <Pressable
                  key={i}
                  style={s.cell}
                  onPress={() => {
                    if (!has) return setNote(`${m + 1}월 ${d}일은 아직 데이터가 없어요`);
                    setNote(null);
                    setDay(k);
                    setPick(null);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !has, selected: on }}
                  accessibilityLabel={`${m + 1}월 ${d}일${has ? '' : ', 데이터 없음'}`}
                >
                  <View style={[s.day, has && { backgroundColor: C.soft }, on && { backgroundColor: C.brand }]}>
                    <Text style={[s.dayText, !has && { color: C.off }, has && { color: C.softText, fontWeight: '700' }, on && { color: '#fff' }]}>{d}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
          {note ? <Text style={s.note}>{note}</Text> : null}

          <Text style={s.timeHead}>
            {Number(day.slice(5, 7))}월 {Number(day.slice(8, 10))}일 · 고를 수 있는 시각
          </Text>
          <View style={s.times}>
            {dayTimes.map((t) => {
              const on = pick === t.id;
              return (
                <Pressable key={t.id} onPress={() => setPick(t.id)} style={[s.time, on && s.timeOn]} accessibilityRole="radio" accessibilityState={{ checked: on }}>
                  <Text style={[s.timeText, on && { color: '#fff' }]}>{ampm(t.time)}</Text>
                  <Text style={[s.timeLabel, on && { color: '#E3F1FD' }]}>{t.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable onPress={() => pick && choose(pick)} disabled={!pick} style={[s.btn, !pick && { opacity: 0.4 }]} accessibilityRole="button">
            <Text style={s.btnText}>이 시각으로 보기</Text>
          </Pressable>
          <Pressable onPress={() => choose('live')} hitSlop={8} style={s.liveLink} accessibilityRole="button">
            <Text style={s.liveText}>{scene.time ? '지금(실시간)으로 돌아가기' : '지금은 실시간을 보고 있어요'}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  dim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', paddingHorizontal: 20 },
  card: { backgroundColor: '#fff', borderRadius: 24, paddingHorizontal: 20, paddingTop: 22, paddingBottom: 14 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 18, fontWeight: '700', color: C.ink },
  tag: { backgroundColor: '#C3F636', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  tagText: { fontSize: 11, fontWeight: '800', color: C.ink },
  sub: { fontSize: 12, color: C.sub, marginTop: 6, lineHeight: 17 },
  month: { fontSize: 15, fontWeight: '700', color: C.ink, marginTop: 18, marginBottom: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, height: 38, alignItems: 'center', justifyContent: 'center' },
  dow: { height: 24, fontSize: 12, color: C.sub, textAlign: 'center', lineHeight: 24 },
  day: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 13, color: C.ink },
  note: { fontSize: 12, color: '#C77922', textAlign: 'center', marginTop: 4 },
  timeHead: { fontSize: 13, fontWeight: '700', color: C.ink, marginTop: 14 },
  times: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  time: { borderRadius: 14, borderWidth: 1, borderColor: C.line, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', minWidth: 92 },
  timeOn: { backgroundColor: C.brand, borderColor: C.brand },
  timeText: { fontSize: 14, fontWeight: '700', color: C.ink },
  timeLabel: { fontSize: 11, color: C.sub, marginTop: 2 },
  btn: { height: 46, borderRadius: 23, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  btnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  liveLink: { alignSelf: 'center', paddingVertical: 10 },
  liveText: { fontSize: 13, color: C.sub, textDecorationLine: 'underline' },
});
