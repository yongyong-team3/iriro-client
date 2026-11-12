// '내 위치' 버튼: 지도를 내 위치로 옮겨요
//   1) 최근 위치로 바로 옮기고 2) 새 위치를 받으면(최대 8초) 한 번 더 맞춰요.
//   예전에는 새 위치를 기다리느라 안드로이드에서 한참 아무 반응이 없거나, 실패하면 조용히 멈췄어요.
import { Alert } from 'react-native';
import * as Location from 'expo-location';

const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

export async function locateMe(map, zoom = 16) {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('위치 권한이 필요해요', '내 위치로 이동하려면 위치 권한을 허용해 주세요.');
      return;
    }
    const move = (c) => map?.current?.animateCamera({ center: { latitude: c.latitude, longitude: c.longitude }, zoom }, { duration: 400 });
    const last = await Location.getLastKnownPositionAsync().catch(() => null);
    if (last) move(last.coords);
    try {
      const now = await withTimeout(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }), 8000);
      move(now.coords);
    } catch {
      if (!last) Alert.alert('위치를 찾지 못했어요', '휴대폰 위치(GPS)가 켜져 있는지 확인해 주세요.');
    }
  } catch {
    Alert.alert('위치를 찾지 못했어요', '잠시 후 다시 시도해 주세요.');
  }
}
