// F-08 이용 유형별 경로 추천 (통제 구간이 포함된 경로는 추천 제외)
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import { getRoutes } from '../api/client';
import { ACTIVITIES, STATUS } from '../constants/status';
import { C, radius, shadow } from '../constants/theme';
import { Button, Dot, Empty } from './ui';

export default function RoutePanel({ activity, now, selectedRouteId, onSelectRoute, onStartRecord }) {
  const [routes, setRoutes] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    getRoutes(activity, now)
      .then((r) => alive && setRoutes(r))
      .catch(() => alive && setRoutes([]));
    return () => {
      alive = false;
    };
  }, [activity, now]);

  if (!routes) return null;
  const ok = routes.filter((r) => !r.excluded);
  const excluded = routes.filter((r) => r.excluded);
  const selected = ok.find((r) => r.id === selectedRouteId);
  const a = ACTIVITIES[activity];

  return (
    <View style={s.panel}>
      <Pressable style={s.head} onPress={() => setOpen((o) => !o)}>
        <Text style={s.headText}>
          {a.icon} {a.label} 추천 경로 {ok.length}개
          {excluded.length > 0 && <Text style={s.headSub}> · 통제로 {excluded.length}개 제외</Text>}
        </Text>
        <Text style={s.chev}>{open ? '▾' : '▴'}</Text>
      </Pressable>

      {!open && selected && (
        <View style={s.selected}>
          <Text style={s.selText} numberOfLines={1}>
            {selected.name} · {selected.distanceKm}km
          </Text>
          <Button small title="기록 시작" onPress={() => onStartRecord(selected)} />
        </View>
      )}

      {open && (
        <ScrollView style={s.list}>
          {ok.length === 0 && <Empty>  지금은 이용 가능한 추천 경로가 없어요.</Empty>}
          {ok.map((r) => (
            <Pressable key={r.id} style={[s.item, r.id === selectedRouteId && { backgroundColor: C.accentSoft }]} onPress={() => onSelectRoute(r)}>
              <Dot color={STATUS[r.status].color} />
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{r.name}</Text>
                <Text style={s.meta}>
                  {r.distanceKm}km{r.roundTrip ? ' 왕복' : ''} · {r.tags.join(' · ')}
                </Text>
                {r.warnings.length > 0 && <Text style={s.warn}>⚠ {r.warnings.join(', ')}</Text>}
              </View>
              <Button small title="기록" onPress={() => onStartRecord(r)} />
            </Pressable>
          ))}
          {excluded.map((r) => (
            <View key={r.id} style={[s.item, { opacity: 0.5 }]}>
              <Dot color={STATUS.closed.color} />
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{r.name}</Text>
                <Text style={s.meta}>추천 제외 · {r.excludedReason}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  panel: { marginHorizontal: 12, marginBottom: 10, backgroundColor: '#fff', borderRadius: radius, overflow: 'hidden', ...shadow },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13 },
  headText: { fontSize: 14, fontWeight: '800', color: C.ink, flex: 1 },
  headSub: { fontSize: 12.5, fontWeight: '500', color: C.muted },
  chev: { color: C.muted },
  selected: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingBottom: 12, gap: 8 },
  selText: { fontSize: 13, color: C.ink2, flex: 1 },
  list: { maxHeight: 320, borderTopWidth: 1, borderTopColor: C.line },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  name: { fontSize: 14, fontWeight: '700', color: C.ink },
  meta: { fontSize: 12, color: C.muted, marginTop: 2 },
  warn: { fontSize: 12, color: '#B45309', marginTop: 2 },
});
