// 배지 (최종 시안 2026-11-11) — ‹ · '배지'(손글씨풍) · 3/8 / 연한 풀색 바탕에 2열 흰 칸 8개
//   칸: 배지 그림(받은 건 컬러, 아직이면 회색 41%) + 이름(아직이면 ???). 목록은 마이페이지 '나의 배지'와 같아요(lib/badgeCatalog).
//   시안처럼 아래 탭 바(기록 밝게)를 같이 보여줘요.
import { Image, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Text } from '../components/AppText';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRecords } from '../lib/records';
import { ART_OFF, ART_ON, useBadgeTiles } from '../lib/badgeCatalog';
import { Ic } from '../components/recUi';
import { Lettering } from '../components/RecordCard';
import { RC } from '../components/recDesign';
import { StackTabBar, useTabBarHeight } from '../components/TabBarView';

const STATUS_TOP = 59;
const HEAD = 135; // 시안: 흰 머리 높이

export default function Badges() {
  const router = useRouter();
  const top = Math.max(useSafeAreaInsets().top - STATUS_TOP, 0); // 시안은 상태바 59 기준: 상태바가 얇은 폰(안드로이드)에서도 시안 위치 그대로
  const barH = useTabBarHeight();
  const { width } = useWindowDimensions();
  const { records } = useRecords();
  const { tiles, earned } = useBadgeTiles(records);
  const size = (width - 23 * 2 - 13) / 2; // 시안 393 폭에서 167
  const k = size / 167;

  return (
    <View style={{ flex: 1, backgroundColor: '#EBF0DF' }}>
      <View style={[s.head, { height: HEAD + top }]}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          hitSlop={12}
          style={[s.back, { top: 80 + top }]}
          accessibilityRole="button"
          accessibilityLabel="뒤로 가기"
        >
          <Ic name="back" size={24} color="#000" />
        </Pressable>
        <View style={[s.title, { top: 77 + top }]} accessibilityRole="header" accessibilityLabel="배지">
          <Lettering name="badgeTitle" color={RC.ink} />
        </View>
        <Text style={[s.count, { top: 76 + top }]} accessibilityLabel={`${tiles.length}개 중 ${earned}개 획득`}>
          <Text style={{ color: RC.brand }}>{earned}</Text>
          <Text style={{ color: 'rgba(82,82,82,0.66)' }}>/{tiles.length}</Text>
        </Text>
      </View>
      <ScrollView contentContainerStyle={[s.grid, { paddingBottom: barH + 24 }]}>
        {tiles.map((b) => (
          <View key={b.key} style={[s.tile, { width: size, height: size }]} accessibilityLabel={b.earned ? `${b.name} 획득` : '아직 받지 않은 배지'}>
            <Image source={b.earned ? ART_ON[b.key] : ART_OFF[b.key]} style={{ width: 104 * k, height: 104 * k, marginTop: 17 * k, opacity: b.earned ? 1 : 0.41 }} resizeMode="contain" />
            <View style={[s.label, { top: 135 * k }]}>
              {b.earned ? (
                b.lettering ? (
                  <Lettering name={b.lettering} height={15 * k} color="#525252" />
                ) : (
                  <Text style={s.name}>{b.name}</Text>
                )
              ) : (
                <Lettering name="bQ" height={14 * k} color="#525252" />
              )}
            </View>
          </View>
        ))}
      </ScrollView>
      <StackTabBar current="history" />
    </View>
  );
}

const s = StyleSheet.create({
  head: { backgroundColor: '#fff' },
  back: { position: 'absolute', left: 18, width: 32, height: 28, justifyContent: 'center' },
  title: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  count: { position: 'absolute', right: 38, fontSize: 20, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 23, paddingTop: 16, columnGap: 13, rowGap: 16 },
  tile: { borderRadius: 18, backgroundColor: '#fff', alignItems: 'center' },
  label: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  name: { fontSize: 14, fontWeight: '700', color: '#525252' },
});
