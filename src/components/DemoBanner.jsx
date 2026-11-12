// 시연 장면 버튼(SceneBar)과 '시연 데이터' 팝업(DemoPopup)
//   과거 장면으로 바꾸면 화면 위에서 알림 카드처럼 '시연 데이터 · 언제 데이터인지' 팝업이 내려오고, X 를 누르면 사라져요.
//   한 번 닫으면 장면을 바꿔도 다시 안 떠요 (앱을 다시 켜면 한 번 더). 닫은 뒤에도 홈의 장면 버튼(검게 칠해진 것)으로 지금 장면을 알 수 있어요.
//   서버 모드에서는 장면 버튼을 숨기고, 서버가 리플레이(dataSource=REPLAY)라고 알려줄 때만 표시해요.
import { useEffect, useRef, useState } from 'react';
import { Animated, Image, Pressable, StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppState } from '../context/AppState';
import { USE_MOCK } from '../api/client';
import { SCENES } from '../mock/scenes';
import { COLOR } from '../constants/colors';

/** 지금 보는 값이 시연(과거·리플레이) 데이터일 때의 설명. 실시간이면 null */
export function useDemoCaption() {
  const { scene, rivers } = useAppState();
  if (USE_MOCK) return scene?.time ? scene.caption : null;
  return rivers?.some((r) => r.replay) ? '서버 리플레이 데이터' : null;
}

const APP_ICON = require('../../assets/icon.png');

/** 앱 맨 위(루트)에 한 번만 올려 두는 팝업. 어느 화면에서든 같은 자리에 떠요 */
export function DemoPopup() {
  const caption = useDemoCaption();
  const insets = useSafeAreaInsets();
  const [closed, setClosed] = useState(false); // 한 번 닫으면 장면을 바꿔도 다시 안 떠요 (앱을 껐다 켜면 다시 한 번)
  const show = !!caption && !closed;
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!show) return;
    anim.setValue(0);
    Animated.timing(anim, { toValue: 1, duration: 320, useNativeDriver: true }).start();
  }, [show, anim]);
  if (!show) return null;
  return (
    <View style={[s.popWrap, { top: insets.top + 8 }]} pointerEvents="box-none">
      <Animated.View
        style={[s.pop, { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-90, 0] }) }] }]}
        accessibilityRole="alert"
        accessibilityLabel={`시연 데이터, ${caption}`}
      >
        <Image source={APP_ICON} style={s.popIcon} />
        <View style={{ flex: 1 }}>
          <View style={s.popHead}>
            <Text style={s.popApp}>이리로</Text>
            <View style={s.tag}>
              <Text style={s.tagText}>시연 데이터</Text>
            </View>
          </View>
          <Text style={s.caption} numberOfLines={2}>
            {caption}
          </Text>
        </View>
        <Pressable onPress={() => setClosed(true)} hitSlop={10} style={s.close} accessibilityRole="button" accessibilityLabel="시연 데이터 안내 닫기">
          <Text style={s.closeText}>✕</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

/** 홈 위쪽 장면 버튼: 평상시 · 폭우 · 침수 위험 · 회복 중 · 회복 (목업에서만)
 *  평소(실시간)에는 숨기고, 달력에서 날짜·시각을 골라 시연 데이터를 보는 동안에만 보여요.
 *  여기서 '1 평상시'를 누르면 실시간으로 돌아가며 다시 숨어요(달력 버튼으로 다시 열 수 있어요). */
export function SceneBar({ style }) {
  const { scene, setScene } = useAppState();
  if (!USE_MOCK || !scene.time) return null;
  return (
    <View style={style}>
      <View style={s.row} accessibilityRole="tablist" accessibilityLabel="시연 장면">
        {SCENES.map((sc, i) => {
          const on = scene.id === sc.id;
          return (
            <Pressable
              key={sc.id}
              onPress={() => setScene(sc.id)}
              style={[s.scene, on && s.sceneOn]}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${i + 1}번 장면 ${sc.label}${sc.time ? ', 시연 데이터' : ', 실시간'}`}
            >
              <Text style={[s.sceneNo, on && { color: COLOR.lime }]}>{i + 1}</Text>
              <Text style={[s.sceneText, on && { color: COLOR.white }]} numberOfLines={1}>{sc.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  popWrap: { position: 'absolute', left: 16, right: 16, zIndex: 100, elevation: 100, alignItems: 'center' },
  pop: { flexDirection: 'row', alignItems: 'center', gap: 12, alignSelf: 'stretch', backgroundColor: COLOR.white, borderRadius: 20, padding: 12, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 12 },
  popIcon: { width: 40, height: 40, borderRadius: 10 },
  popHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  popApp: { fontSize: 13, fontWeight: '800', color: COLOR.ink },
  close: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: COLOR.fill },
  closeText: { fontSize: 13, fontWeight: '700', color: COLOR.sub },
  tag: { backgroundColor: COLOR.lime, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  tagText: { fontSize: 12, fontWeight: '800', color: COLOR.ink },
  caption: { fontSize: 12, lineHeight: 17, color: COLOR.text, fontWeight: '500' },
  row: { flexDirection: 'row', gap: 6 }, // 5개가 화면 폭을 나눠 가져요: 버튼 사이 간격은 6으로 같고, 남는 폭은 글자 수에 상관없이 고르게 나눠요
  scene: { flexGrow: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, height: 32, borderRadius: 16, paddingHorizontal: 4, backgroundColor: COLOR.white, borderWidth: 1, borderColor: COLOR.line },
  sceneOn: { backgroundColor: COLOR.ink, borderColor: COLOR.ink },
  sceneNo: { fontSize: 12, fontWeight: '800', color: COLOR.sub },
  sceneText: { fontSize: 12, fontWeight: '700', color: COLOR.ink },
});
