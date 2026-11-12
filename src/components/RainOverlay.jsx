// 비 오는 화면 (최종 시안 2026-11-11): 지도 위를 어둡게 덮고 흰 빗줄기가 3초 동안 떨어져요.
//   playKey 가 바뀔 때마다 한 번 재생 → 끝나면 onEnd(). 화면을 막지 않아요(터치는 아래로 통과).
//   빗줄기 18개의 위치·길이·굵기는 시안 그대로이고, 위치를 화면 폭에 맞춰 늘려요.
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { FillSvg } from './FillSvg';

// [x, 위 끝 y, 길이, 굵기] (시안 393×852 기준)
const DROPS = [
  [57, 85, 91, 2],
  [337.5, 353, 91, 2],
  [362.5, 674, 91, 2],
  [31.5, 2, 91, 2],
  [380.5, 116, 91, 2],
  [255.5, 377, 91, 2],
  [281.5, 244, 91, 2],
  [141.5, 513, 91, 2],
  [72.5, 353, 91, 2],
  [222.5, 215, 138, 2.5],
  [330, 390, 138, 2.5],
  [179.5, 362, 138, 2.5],
  [238.5, 535, 138, 2.5],
  [72.5, 550, 138, 2.5],
  [98.5, 214, 138, 2.5],
  [337.5, 38, 138, 2.5],
  [295.5, 468, 82, 2.5],
  [153.5, 189, 82, 2.5],
];
const FADE_MS = 400;

export default function RainOverlay({ playKey, duration = 3000, onEnd }) {
  const { width, height } = useWindowDimensions();
  const [on, setOn] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const fast = useRef(new Animated.Value(0)).current; // 빗줄기 둘로 나눠 속도를 다르게
  const slow = useRef(new Animated.Value(0)).current;
  const endRef = useRef(onEnd);
  endRef.current = onEnd;

  useEffect(() => {
    if (playKey == null) return;
    setOn(true);
    opacity.setValue(0);
    fast.setValue(0);
    slow.setValue(0);
    const loop = (v, ms) => Animated.loop(Animated.timing(v, { toValue: 1, duration: ms, easing: Easing.linear, useNativeDriver: true }));
    const a = loop(fast, 650);
    const b = loop(slow, 900);
    a.start();
    b.start();
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(Math.max(0, duration - 250 - FADE_MS)),
      Animated.timing(opacity, { toValue: 0, duration: FADE_MS, useNativeDriver: true }),
    ]).start(({ finished }) => {
      a.stop();
      b.stop();
      if (!finished) return; // 중간에 다시 재생되면 새 재생이 이어서 끝을 알려요
      setOn(false);
      endRef.current?.();
    });
    return () => {
      a.stop();
      b.stop();
    };
  }, [playKey]);

  if (!on) return null;
  const kx = width / 393;
  const ky = height / 852;
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity }]} pointerEvents="none" accessibilityLabel="비가 내리고 있어요">
      {/* 시안: 검정 → 투명 세로 그라데이션, 70% */}
      <FillSvg>
        <Defs>
          <LinearGradient id="rainDim" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#000" stopOpacity="0.7" />
            <Stop offset="1" stopColor="#000" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#rainDim)" />
      </FillSvg>
      {DROPS.map(([x, y, len, w], i) => {
        const L = len * ky;
        const span = height + L; // 화면 위에서 아래까지 한 바퀴
        const p = i % 2 ? slow : fast;
        // 시안 위치에서 출발해 아래로 떨어지고, 바닥을 지나면 위에서 다시 시작
        const translateY = Animated.add(Animated.modulo(Animated.add(Animated.multiply(p, span), y * ky + L), span), -L);
        return (
          <Animated.View key={i} style={{ position: 'absolute', left: x * kx - w / 2, top: 0, width: w, height: L, transform: [{ translateY }] }}>
            <Svg width={w} height={L}>
              <Defs>
                <LinearGradient id={`drop${i}`} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#fff" stopOpacity="0.26" />
                  <Stop offset="1" stopColor="#fff" stopOpacity="0.51" />
                </LinearGradient>
              </Defs>
              <Rect x="0" y="0" width={w} height={L} rx={w / 2} fill={`url(#drop${i})`} />
            </Svg>
          </Animated.View>
        );
      })}
    </Animated.View>
  );
}
