// 경로 출발지·도착지 표시 (통일): 흰 동그라미 + 진한 남색 테두리 — 코스 · 우회 · 기록 지도 공통
//   안드로이드에서 그림이 빈 흰 원으로 보이지 않게 처음 잠깐만 다시 그려요.
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Marker } from 'react-native-maps';
import { toLatLng } from '../lib/geo';

export const ENDPOINT = { size: 14, ring: 3, color: '#2B3A44' };

export function EndpointMarker({ point, zIndex = 3, title }) {
  const [track, setTrack] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setTrack(false), 800);
    return () => clearTimeout(t);
  }, []);
  if (!point) return null;
  return (
    <Marker coordinate={toLatLng(point)} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={track} zIndex={zIndex} title={title}>
      <View
        style={{
          width: ENDPOINT.size,
          height: ENDPOINT.size,
          borderRadius: ENDPOINT.size / 2,
          backgroundColor: '#FFFFFF',
          borderWidth: ENDPOINT.ring,
          borderColor: ENDPOINT.color,
        }}
      />
    </Marker>
  );
}

/** 경로 양 끝 두 개 */
export function RouteEnds({ path, zIndex }) {
  if (!(path?.length > 1)) return null;
  return (
    <>
      <EndpointMarker point={path[0]} zIndex={zIndex} />
      <EndpointMarker point={path[path.length - 1]} zIndex={zIndex} />
    </>
  );
}
