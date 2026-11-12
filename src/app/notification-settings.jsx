// 알림 설정 (시안 2026-11-09) — 기기 알림 권한 / 하천 상태 변화 · 활동 기록 · 서비스 소식 토글
// ⚠ 푸시 알림(expo-notifications)은 아직 연결 전이라 '기기 알림 권한'은 기기 설정 화면을 여는 버튼이에요.
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../components/AppText';
import { useNotifications } from '../lib/notifications';
import { Card, R, SectionLabel, SubHeader, Toggle } from '../components/recUi';

const KINDS = [
  ['recovery', '회복 예측 알림', 'AI가 수위 회복 시점을 예측하면 한 번 알려드려요 · 통행 재개 알림은 아니에요'],
  ['river', '하천 상태 변화', 'AI 분석 상태가 바뀌면 알려드려요'],
  ['activity', '활동 기록', '측정한 활동이 저장되면 알려드려요'],
  ['service', '서비스 소식', '앱 이용에 필요한 안내를 받아요'],
];

export default function NotificationSettings() {
  const { settings, setSetting } = useNotifications();
  return (
    <View style={{ flex: 1, backgroundColor: R.white }}>
      <SubHeader title="알림 설정" subtitle="받고 싶은 알림을 선택해 주세요" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
        <Card tone="soft" style={{ marginTop: 22 }} onPress={() => Linking.openSettings().catch(() => {})} accessibilityLabel="기기 알림 권한, 기기 설정 열기">
          <View style={s.between}>
            <Text style={s.permTitle}>기기 알림 권한</Text>
            <Text style={s.permState}>설정 열기</Text>
          </View>
          <Text style={s.permSub}>권한 변경은 기기 설정에서 할 수 있어요</Text>
        </Card>

        <SectionLabel>알림 종류</SectionLabel>
        <View style={{ gap: 12 }}>
          {KINDS.filter(([k]) => settings && k in settings).map(([k, title, sub]) => (
            <Card key={k} style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.title}>{title}</Text>
                <Text style={s.sub}>{sub}</Text>
              </View>
              <Toggle value={!!settings?.[k]} onChange={(v) => setSetting(k, v)} label={title} />
            </Card>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  permTitle: { fontSize: 15, fontWeight: '800', color: R.ink },
  permState: { fontSize: 12, fontWeight: '700', color: R.deep },
  permSub: { fontSize: 12, color: R.sub, marginTop: 12 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 20 },
  title: { fontSize: 15, fontWeight: '700', color: R.ink },
  sub: { fontSize: 12, color: R.sub, marginTop: 8 },
});
