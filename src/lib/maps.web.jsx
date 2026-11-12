// 웹 미리보기 전용 react-native-maps 대체품 (metro.config.js 에서 웹일 때만 연결)
// 실제 지도는 휴대폰(Expo Go·앱)에서만 보여요.
import { forwardRef, useImperativeHandle } from 'react';
import { View } from 'react-native';
import { Text } from '../components/AppText';

const MapView = forwardRef(function MapView({ style, children }, ref) {
  useImperativeHandle(ref, () => ({
    fitToCoordinates() {},
    animateCamera() {},
    getCamera: async () => ({ zoom: 14 }),
  }));
  return (
    <View style={[style, { backgroundColor: '#E8EDEF', alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={{ color: '#9AA6AE', fontSize: 12 }}>지도는 휴대폰에서 보여요</Text>
      {children}
    </View>
  );
});
const Nothing = () => null;
export default MapView;
export const Polyline = Nothing;
export const Polygon = Nothing;
export const Marker = Nothing;
export const Circle = Nothing;
export const PROVIDER_GOOGLE = 'google';
