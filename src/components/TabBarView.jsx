// 하단 탭 바 모양 (최종 시안 2026-11-11) — 탭 화면과, 시안에서 탭 바가 보이는 하위 화면(활동 기록 · 배지)이 같이 써요
//   흰 바 가운데가 둥글게 파여 있고, 그 자리에 파란 ▶ 버튼이 떠 있어요.
import { Image, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Text } from './AppText';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { G2, H, IMG, Icon } from './homeUi';
import { closePickSheet, openPickSheet } from '../lib/pickSheet';

// 시안 393 폭 기준 가운데 x (지도 60 · 기록 135 · ▶ 196.5 · 날씨 260.5 · MY 335.5)
export const TABS = [
  { name: 'index', label: '지도', icon: 'tabMap', x: 60 },
  { name: 'history', label: '기록', icon: 'tabRecord', x: 135 },
  { name: 'record', label: '기록 시작', x: 196.5, play: true },
  { name: 'weather', label: '날씨', img: 'weatherTab', x: 260.5 },
  { name: 'my', label: 'MY', icon: 'tabMy', x: 335.5 },
];
const PLAY_X = 196.5;
const BAR = 51; // 아이콘+글자 줄 높이 (시안 85 - 홈 바 34)

export const useTabBarHeight = () => BAR + Math.max(useSafeAreaInsets().bottom, 34);

function Notch({ width, height, k }) {
  // 시안: 가운데(196.5) 반지름 22.5 원으로 파낸 흰 바
  const cx = PLAY_X * k;
  const r = 22.5;
  const d = `M0 0 H${cx - 20.4} A${r} ${r} 0 1 0 ${cx + 20.4} 0 H${width} V${height} H0 Z`;
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
      <Path d={`M0 0 H${cx - 20.4} A${r} ${r} 0 1 0 ${cx + 20.4} 0 H${width}`} stroke="rgba(0,0,0,0.06)" strokeWidth={1} fill="none" />
      <Path d={d} fill={H.white} />
    </Svg>
  );
}

/** current: 지금 밝게 보일 탭 이름 · onTab(name) · onPlay() */
export function TabBarView({ current, onTab, onPlay }) {
  const { width } = useWindowDimensions();
  const height = useTabBarHeight();
  const k = width / 393;
  return (
    <View style={[s.bar, { height }]} pointerEvents="box-none">
      <Notch width={width} height={height} k={k} />
      {TABS.map((t) => {
        const active = current === t.name;
        if (t.play) {
          return (
            <Pressable
              key={t.name}
              onPress={onPlay}
              accessibilityRole="tab"
              accessibilityLabel={t.label}
              accessibilityState={{ selected: active }}
              hitSlop={8}
              style={[s.play, { left: t.x * k - 23.5 }]}
            >
              <Icon name="tabPlay" />
            </Pressable>
          );
        }
        const color = active ? G2.navy : G2.text;
        const dim = active ? null : { opacity: 0.6 }; // 시안: 안 고른 탭은 아이콘·글자 60%
        return (
          <Pressable
            key={t.name}
            onPress={() => onTab(t.name)}
            accessibilityRole="tab"
            accessibilityLabel={t.label}
            accessibilityState={{ selected: active }}
            style={[s.item, { left: t.x * k - 28 }, active && { backgroundColor: 'rgba(227,241,253,0.61)' }]}
          >
            {t.img ? (
              // 시안: 53×36 그림 (여백이 커서 위아래로 겹치게 둬요)
              <Image source={IMG[t.img]} style={[s.weather, { tintColor: color }, dim]} resizeMode="contain" />
            ) : (
              <Icon name={t.icon} color={color} style={dim} />
            )}
            <Text style={[s.label, { color }, dim]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** 탭 밖 하위 화면(활동 기록 · 배지)에 붙이는 탭 바: 누르면 하위 화면을 닫고 그 탭으로 가요 */
export function StackTabBar({ current = 'history' }) {
  const router = useRouter();
  const toTab = (name, keepPick) => {
    if (!keepPick) closePickSheet();
    if (router.canDismiss()) router.dismissAll();
    router.navigate(name === 'index' ? '/' : `/${name}`);
  };
  const play = () => {
    openPickSheet();
    toTab('index', true);
  };
  return <TabBarView current={current} onTab={toTab} onPlay={play} />;
}

const s = StyleSheet.create({
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  item: { position: 'absolute', top: 4, width: 56, height: 52, borderRadius: 19, alignItems: 'center', paddingTop: 9, gap: 6 },
  label: { fontSize: 12, fontWeight: '500' },
  weather: { width: 53, height: 36, marginTop: -9, marginBottom: -8 },
  // 시안: 파란 원(반지름 18.5) + 흰 테두리 5 + 옅은 그림자, 가운데가 바 위 9.5
  play: {
    position: 'absolute',
    top: -14,
    width: 47,
    height: 47,
    borderRadius: 23.5,
    borderWidth: 5,
    borderColor: H.white,
    backgroundColor: H.brand,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 2,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
    elevation: 5,
  },
});
