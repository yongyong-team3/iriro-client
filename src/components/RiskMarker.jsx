// 지도 위 '이용 위험' 표시 (최종 시안 2026-11-11 침수 위험 장면)
//   빨간 경고 삼각형(흰 테두리 · 붉게 번지는 빛) + 위에 흰 말풍선 '이용 위험이 있어요!'
//   지도 마커는 그림으로 한 번 찍혀 들어가서, 그림자 대신 SVG 로 빛·그림자를 그려요.
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';
import Svg, { Defs, Path, RadialGradient, Stop, Circle } from 'react-native-svg';
import { Text } from './AppText';
import { COLOR } from '../constants/colors';
import { toLatLng } from '../lib/geo';

// 시안 좌표 그대로 (삼각형 가운데 = 625, 351.5)
const TRI = 'M622.4 335.8C622.663 335.343 623.042 334.964 623.498 334.7C623.955 334.436 624.473 334.297 625 334.297C625.527 334.297 626.045 334.436 626.502 334.7C626.958 334.964 627.337 335.343 627.6 335.8L644.1 364.3C644.363 364.756 644.502 365.274 644.502 365.801C644.502 366.327 644.363 366.845 644.099 367.301C643.836 367.757 643.457 368.136 643.001 368.399C642.544 368.662 642.027 368.801 641.5 368.8H608.5C607.973 368.801 607.456 368.662 606.999 368.399C606.543 368.136 606.164 367.757 605.9 367.301C605.637 366.845 605.498 366.327 605.498 365.801C605.498 365.274 605.637 364.756 605.9 364.3L622.4 335.8Z';
const BUBBLE = 'M94 0C98.42 0 102 3.582 102 8V20C102 24.418 98.42 28 94 28H71.78C65.78 33.512 58.34 37.316 53.83 39C57.15 35.44 59.08 31.616 60.1 28H8C3.58 28 0 24.418 0 20V8C0 3.582 3.58 0 8 0H94Z';

const GLOW = 80; // 빛 지름
const W = 120; // 마커 전체 폭
const H = 104; // 마커 전체 높이
const CX = 41; // 삼각형 가운데 x (말풍선 왼쪽 + 37, 시안)
const CY = 64; // 삼각형 가운데 y

export function RiskMarkerView({ bubble = true }) {
  return (
    <View style={{ width: W, height: H }} pointerEvents="none">
      <Svg width={GLOW} height={GLOW} style={{ position: 'absolute', left: CX - GLOW / 2, top: CY - GLOW / 2 }}>
        <Defs>
          <RadialGradient id="riskGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#FF0000" stopOpacity="0.32" />
            <Stop offset="0.55" stopColor="#FF0000" stopOpacity="0.12" />
            <Stop offset="1" stopColor="#FF0000" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={GLOW / 2} cy={GLOW / 2} r={GLOW / 2} fill="url(#riskGlow)" />
      </Svg>
      <Svg width={44} height={39} viewBox="603 332 44 39" style={{ position: 'absolute', left: CX - 22, top: CY - 19.5 }}>
        <Path d={TRI} fill={COLOR.danger} stroke={COLOR.white} strokeWidth={2.5} />
        <Path d="M625 346V356M625 361V361.5" stroke={COLOR.white} strokeWidth={3.2} strokeLinecap="round" />
      </Svg>
      {bubble && (
        <View style={s.bubble}>
          <Svg width={106} height={44} viewBox="-2 -1 106 44" style={StyleSheet.absoluteFill}>
            <Path d={BUBBLE} fill="#000" opacity={0.1} transform="translate(0 1.5)" />
            <Path d={BUBBLE} fill={COLOR.white} />
          </Svg>
          <Text style={s.bubbleText}>이용 위험이 있어요!</Text>
        </View>
      )}
    </View>
  );
}

/** 지도에 놓는 마커. 처음 0.6초는 다시 그려서(글꼴·SVG 반영) 그 뒤로는 고정해요. */
export default function RiskMarker({ point, bubble = true, onPress }) {
  const [track, setTrack] = useState(true);
  useEffect(() => {
    setTrack(true);
    const t = setTimeout(() => setTrack(false), 600);
    return () => clearTimeout(t);
  }, [bubble]);
  if (!point) return null;
  return (
    <Marker coordinate={toLatLng(point)} anchor={{ x: CX / W, y: CY / H }} tracksViewChanges={track} onPress={onPress} zIndex={10}>
      <RiskMarkerView bubble={bubble} />
    </Marker>
  );
}

const s = StyleSheet.create({
  // 시안: 102×28 말풍선, 왼쪽이 삼각형 가운데보다 37 왼쪽, 위 끝이 삼각형 가운데보다 55.5 위
  bubble: { position: 'absolute', left: CX - 37 - 2, top: CY - 55.5 - 1, width: 106, height: 44, alignItems: 'center', paddingTop: 1 + 7 },
  bubbleText: { fontSize: 12, fontWeight: '500', color: COLOR.alert, lineHeight: 14 },
});
