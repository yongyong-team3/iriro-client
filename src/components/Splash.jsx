// 진입 화면 (시안: 393×852, 배경 #3993D4) — Figma 원본 SVG 그대로
//   위: 문구 "당신이 걷는 용인, 더 안전하게"(#EAFCB6) + '이리로' 로고·물결(#CCFF40), 시안 top 336.3
//   아래: 왼쪽 큰 물결 두 줄, 화면 왼쪽 밖으로 나감 (시안 아래 여백 약 88)
import { useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import Svg, { Path } from 'react-native-svg';
import { C } from '../constants/theme';
import * as P from '../constants/splashPaths';

const LIME = '#CCFF40';
const CREAM = '#EAFCB6';

// 앱을 켜면 먼저 기기 기본 스플래시(app.json: 파란 배경 + 로고)가 뜨고,
// 이 화면이 그려지는 순간 부드럽게 넘겨받아요 (배경색이 같아서 끊김 없이 이어져요)
SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ duration: 300, fade: true });

export default function Splash() {
  const { width, height } = useWindowDimensions();
  const k = Math.min(width / 393, 1.25); // 시안 폭 393 기준 비율
  useEffect(() => {
    SplashScreen.hide();
  }, []);

  return (
    <View style={s.screen}>
      {/* 문구 + 로고 (원본 좌표 x 0~312, y 0~108) */}
      <View style={{ position: 'absolute', left: 0, top: height * (336.31 / 852) }}>
        <Svg width={312 * k} height={108 * k} viewBox="0 0 312 108">
          <Path d={P.TAGLINE} fill={CREAM} />
          <Path d={P.GLYPH_I} fill={LIME} />
          <Path d={P.GLYPH_RI} fill={LIME} />
          <Path d={P.GLYPH_RO} fill={LIME} />
          <Path d={P.ARROW_1} fill={LIME} />
          <Path d={P.ARROW_2} fill={LIME} />
          <Path d={P.WAVE_SMALL_1} fill={LIME} />
          <Path d={P.WAVE_SMALL_2} fill={LIME} />
        </Svg>
      </View>

      {/* 아래 큰 물결 (원본 좌표 x -32~203, y 340~430) */}
      <View style={{ position: 'absolute', left: -32 * k, bottom: 85.69 * k }}>
        <Svg width={235 * k} height={90 * k} viewBox="-32 340 235 90">
          <Path d={P.BOTTOM_WAVE_1} fill={LIME} />
          <Path d={P.BOTTOM_WAVE_2} fill={LIME} />
        </Svg>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { ...StyleSheet.absoluteFillObject, backgroundColor: C.brand, overflow: 'hidden' },
});
