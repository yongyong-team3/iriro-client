// 기록 저장 완료 (시안 2026-11-09) — 초록 체크 / 기록이 저장됐어요 / 요약 카드 / [기록 통계 보기] [홈으로]
import { StyleSheet, View } from 'react-native';
import { Text } from '../../components/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ACT, clock, km2, useRecords } from '../../lib/records';
import { Button, Card, Ic, R } from '../../components/recUi';

export default function ActivitySaved() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const { records } = useRecords();
  const rec = records.find((r) => r.id === id);

  return (
    <View style={{ flex: 1, backgroundColor: R.white, paddingTop: insets.top, paddingHorizontal: 20 }}>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <View style={s.halo}>
          <View style={s.ring}>
            <View style={s.dot}>
              <Ic name="check" size={20} color={R.white} />
            </View>
          </View>
        </View>
        <Text style={s.title}>기록이 저장됐어요</Text>
        <Text style={s.sub}>기록 통계에서 다시 볼 수 있어요</Text>

        {rec && (
          <Card tone="gray" style={{ marginTop: 40 }}>
            <Text style={s.cardTitle}>
              {ACT[rec.activity].label} · {rec.trailName}
            </Text>
            <View style={s.hr} />
            <View style={{ flexDirection: 'row' }}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>거리</Text>
                <Text style={s.value}>{km2(rec.distanceKm)} km</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>시간</Text>
                <Text style={s.value}>{clock(rec.durationSec)}</Text>
              </View>
            </View>
          </Card>
        )}
      </View>
      <View style={{ gap: 12, paddingBottom: insets.bottom + 20 }}>
        <Button title="기록 통계 보기" onPress={() => router.dismissTo('/history')} />
        <Button title="홈으로" kind="outline" onPress={() => router.dismissTo('/')} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  halo: { alignSelf: 'center', width: 80, height: 80, borderRadius: 40, backgroundColor: R.soft, alignItems: 'center', justifyContent: 'center' },
  ring: { width: 60, height: 60, borderRadius: 30, backgroundColor: R.bar, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 30, height: 30, borderRadius: 15, backgroundColor: R.brand, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 25, fontWeight: '800', color: R.ink, textAlign: 'center', marginTop: 36, letterSpacing: -0.5 },
  sub: { fontSize: 13, color: R.sub, textAlign: 'center', marginTop: 14 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: R.ink },
  hr: { height: 1, backgroundColor: R.line, marginVertical: 14 },
  label: { fontSize: 12, color: R.sub },
  value: { fontSize: 19, fontWeight: '800', color: R.ink, marginTop: 10 },
});
