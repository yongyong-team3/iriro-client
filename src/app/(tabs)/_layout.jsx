// 로그인 후 하단 탭 (최종 시안 2026-11-11): 지도 · 기록 · ▶(기록 시작) · 날씨 · MY
//   바 모양은 components/TabBarView.jsx. 바는 화면 위에 겹쳐 그려서(position absolute) 지도 홈에서는 아래 시트가 바 뒤로 이어져 보여요.
//   기록 준비·측정 중에는 탭바를 숨겨요(src/lib/tabbar.js).
import { Tabs } from 'expo-router';
import { TabBarView, useTabBarHeight } from '../../components/TabBarView';
import { useTabBarHidden } from '../../lib/tabbar';
import { closePickSheet, openPickSheet } from '../../lib/pickSheet';
import { isRecording } from '../../lib/recorder';

export { useTabBarHeight };

function TabBar({ state, emitter, navigateToTab }) {
  const hidden = useTabBarHidden();
  const current = state.routes[state.index]?.name;
  if (hidden) return null;
  const go = (name, keepPick) => {
    if (!keepPick) closePickSheet(); // 다른 탭을 누르면 '어떤 활동을 기록할까요?' 창은 닫아요
    const route = state.routes.find((r) => r.name === name);
    if (!route) return;
    // expo-router(SDK 58) 탭바 방식: emitter 로 tabPress 알리고 navigateToTab 으로 이동
    const e = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (current !== name && !e.defaultPrevented) navigateToTab(route.key);
  };
  // ▶: 측정 중이면 측정 화면, 아니면 지도 홈에 '어떤 활동을 기록할까요?' 시트 (최종 시안)
  const play = () => {
    if (isRecording()) return go('record');
    openPickSheet();
    if (current !== 'index') go('index', true);
  };
  return <TabBarView current={current} onTab={go} onPlay={play} />;
}

export default function TabsLayout() {
  const barH = useTabBarHeight();
  return (
    <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false, sceneStyle: { paddingBottom: barH } }}>
      {/* 지도 홈 · 활동 측정은 바 뒤까지 지도가 이어지게 여백 없이 */}
      <Tabs.Screen name="index" options={{ sceneStyle: { paddingBottom: 0 } }} />
      <Tabs.Screen name="history" />
      <Tabs.Screen name="record" options={{ sceneStyle: { paddingBottom: 0 } }} />
      <Tabs.Screen name="weather" />
      <Tabs.Screen name="my" />
    </Tabs>
  );
}
