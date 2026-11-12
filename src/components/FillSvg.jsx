// 부모를 꽉 채우는 배경 그림 — 실제 크기를 재서 숫자로 그려요.
//   안드로이드에서 Svg 의 width="100%" 가 부모 안쪽 여백(padding)을 뺀 폭으로 계산돼 배경이 짧게 그려지는 문제를 막아요.
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg from 'react-native-svg';

export function FillSvg({ children, style }) {
  const [size, setSize] = useState(null);
  return (
    <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none" onLayout={(e) => setSize(e.nativeEvent.layout)}>
      {size ? (
        <Svg width={size.width} height={size.height}>
          {children}
        </Svg>
      ) : null}
    </View>
  );
}
