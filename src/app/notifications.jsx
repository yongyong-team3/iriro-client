// 알림 (시안 2026-11-09) — 전체 n / 읽지 않음 n · 오늘 / 이전 · 화면을 나가면 모두 읽음 처리
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../components/AppText';
import { useRouter } from 'expo-router';
import { useNotifications } from '../lib/notifications';
import { whenShort } from '../lib/records';
import { Card, Ic, R, Segmented, SubHeader } from '../components/recUi';

const LOOK = {
  river: { tone: 'red', circle: '#FAD9D3', icon: 'alert', color: R.red },
  activity: { tone: 'white', circle: R.soft, icon: 'arrowUpRight', color: R.brand },
  recover: { tone: 'white', circle: R.soft, icon: 'sparkle', color: R.brand },
  service: { tone: 'white', circle: R.soft, icon: 'info', color: R.brand },
};

export default function Notifications() {
  const router = useRouter();
  const { list, unread, isRead, markAllRead } = useNotifications();
  const [tab, setTab] = useState('all');
  const mark = useRef(markAllRead);
  mark.current = markAllRead;
  useEffect(() => () => mark.current(), []); // 나갈 때 읽음 처리

  const shown = tab === 'all' ? list : unread;
  const today = new Date().toDateString();
  const groups = [
    ['오늘', shown.filter((n) => new Date(n.at).toDateString() === today)],
    ['이전', shown.filter((n) => new Date(n.at).toDateString() !== today)],
  ].filter(([, l]) => l.length);

  return (
    <View style={{ flex: 1, backgroundColor: R.white }}>
      <SubHeader
        title="알림"
        right={
          <Pressable onPress={() => router.push('/notification-settings')} hitSlop={10} accessibilityRole="link">
            <Text style={s.setting}>설정</Text>
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
        <Segmented
          style={{ marginTop: 34 }}
          value={tab}
          onChange={setTab}
          items={[
            ['all', `전체 ${list.length}`],
            ['unread', `읽지 않음 ${unread.length}`],
          ]}
        />
        {groups.map(([label, l]) => (
          <View key={label}>
            <Text style={s.group}>{label}</Text>
            <View style={{ gap: 12 }}>
              {l.map((n) => {
                const k = n.type === 'river' && !n.alert ? LOOK.recover : (LOOK[n.type] ?? LOOK.service);
                return (
                  <Card key={n.id} tone={k.tone} style={s.item}>
                    <View style={[s.circle, { backgroundColor: k.circle }]}>
                      <Ic name={k.icon} size={20} color={k.color} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <Text style={s.title}>{n.title}</Text>
                      <Text style={s.body}>{n.body}</Text>
                      <Text style={s.meta}>{n.meta ?? whenShort(n.at)}</Text>
                    </View>
                    {!isRead(n.id) && <View style={s.dot} accessibilityLabel="읽지 않음" />}
                  </Card>
                );
              })}
            </View>
          </View>
        ))}
        {shown.length === 0 && <Text style={s.empty}>{tab === 'all' ? '알림이 없어요.' : '읽지 않은 알림이 없어요.'}</Text>}
        <Text style={s.foot}>새 알림은 이곳에서 확인할 수 있어요</Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  setting: { fontSize: 13, color: R.brand, fontWeight: '600' },
  group: { fontSize: 16, fontWeight: '800', color: R.ink, marginTop: 28, marginBottom: 12 },
  item: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 18, paddingHorizontal: 16 },
  circle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 14.5, fontWeight: '800', color: R.ink },
  body: { fontSize: 12.5, color: R.text, marginTop: 9, lineHeight: 21 },
  meta: { fontSize: 12, color: R.sub, marginTop: 12 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: R.red, marginTop: 6 },
  empty: { textAlign: 'center', color: R.sub, marginTop: 40 },
  foot: { fontSize: 12, color: R.sub, textAlign: 'center', marginTop: 40 },
});
