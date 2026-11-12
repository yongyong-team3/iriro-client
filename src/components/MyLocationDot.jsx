// 내 위치 표시
//   평소(mode="dot"): 파란 점 + 흰 테두리 3 + 옅은 그림자, 전체 지름 20 (최종 시안)
//   활동 측정 중(mode="travel"): 같은 크기 위치 아이콘에 '이동 방향' 삼각형 — 폰을 돌려도 돌지 않고, 실제로 움직이는 방향을 가리켜요
//   지도 기본 내 위치 점(정확도 원까지 커져요) 대신 써요. 위치 권한이 있을 때만 보여요(여기서 권한을 묻지 않아요).
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Marker } from 'react-native-maps';
import Svg, { Circle, G, Path } from 'react-native-svg';
import * as Location from 'expo-location';

const PUCK_D = 18; // 바깥 흰 원 지름
const K = PUCK_D / 43.2; // 시안 출발 아이콘(바깥 원 43.2) 대비 비율
export const PUCK_W = 46 * K;
export const PUCK_H = 78 * K;
export const PUCK_ANCHOR = { x: 0.5, y: 54 / 78 }; // 원 가운데가 실제 위치

/** 위치 아이콘 그림. heading 이 없으면 삼각형 없이 점만 */
export function PuckArt({ withArrow = true }) {
  return (
    <Svg width={PUCK_W} height={PUCK_H} viewBox="0 0 46 78">
      <G transform="translate(-118.26 -626.82)">
        {withArrow && (
          <G rotation={-7.2} origin="141.26, 680.82">
            <Path
              d="M142.996 632.842C145.69 628.799 151.872 629.705 153.294 634.35L159.344 654.119C160.198 656.909 158.844 659.654 156.549 660.887C153.51 658.218 149.49 656.304 144.918 655.635C140.345 654.966 135.944 655.648 132.267 657.334C130.422 655.495 129.915 652.475 131.533 650.047L142.996 632.842Z"
              fill="#3993D4"
              stroke="#FFFFFF"
              strokeWidth={4}
              strokeLinejoin="round"
            />
          </G>
        )}
        <Circle cx={141.26} cy={683} r={22.6} fill="#000" opacity={0.12} />
        <Circle cx={141.26} cy={680.82} r={21.6} fill="#FFFFFF" />
        <Circle cx={141.26} cy={680.82} r={15.1} fill="#3993D4" />
      </G>
    </Svg>
  );
}

/** 지도 위 위치 아이콘 (rotation: 북쪽 0°, 시계 방향) */
export function PuckMarker({ coordinate, rotation, zIndex = 5 }) {
  const [track, setTrack] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setTrack(false), 800); // 안드로이드에서 처음 그릴 때 빈칸 방지
    return () => clearTimeout(t);
  }, []);
  const hasArrow = rotation != null;
  return (
    <Marker coordinate={coordinate} rotation={hasArrow ? rotation : 0} flat anchor={PUCK_ANCHOR} tracksViewChanges={track} zIndex={zIndex}>
      <PuckArt withArrow={hasArrow} />
    </Marker>
  );
}

/** 평소 내 위치 점 (시안: 파란 원 r 8.5 + 흰 테두리 3) */
function DotMarker({ coordinate }) {
  const [track, setTrack] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setTrack(false), 800);
    return () => clearTimeout(t);
  }, []);
  return (
    <Marker coordinate={coordinate} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={track} zIndex={5}>
      <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
        <View
          style={{
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: '#FFFFFF',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOpacity: 0.18,
            shadowRadius: 3,
            shadowOffset: { width: 0, height: 1 },
            elevation: 3,
          }}
        >
          <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: '#3993D4' }} />
        </View>
      </View>
    </Marker>
  );
}

const toRad = (d) => (d * Math.PI) / 180;
function moveDir(a, b) {
  const k = Math.cos(toRad((a.latitude + b.latitude) / 2));
  const dy = b.latitude - a.latitude;
  const dx = (b.longitude - a.longitude) * k;
  const meters = Math.hypot(dx, dy) * 111320;
  return { deg: (Math.atan2(dx, dy) * 180) / Math.PI, meters };
}

export function MyLocationDot({ mode = 'dot' }) {
  const [pos, setPos] = useState(null);
  const [dir, setDir] = useState(null); // 이동 방향 (측정 중에만)
  const prev = useRef(null);

  useEffect(() => {
    let sub = null;
    let alive = true;
    let timer = null;
    const onPos = (c) => {
      if (!alive) return;
      setPos(c);
      // 이동 방향: GPS 가 주는 진행 방향(움직일 때만) → 없으면 지난 위치에서 4m 넘게 움직인 방향
      if (c.heading != null && c.heading >= 0 && (c.speed ?? 0) > 0.6) {
        setDir(Math.round(c.heading));
        prev.current = c;
      } else if (prev.current) {
        const m = moveDir(prev.current, c);
        if (m.meters > 4) {
          setDir(Math.round(m.deg));
          prev.current = c;
        }
      } else prev.current = c;
    };
    const start = async () => {
      try {
        const { granted } = await Location.getForegroundPermissionsAsync();
        if (!alive) return;
        if (!granted) {
          // 나중에 '내 위치' 버튼 등으로 허락하면 그때부터 보여요
          timer = setTimeout(start, 4000);
          return;
        }
        const last = await Location.getLastKnownPositionAsync().catch(() => null);
        if (alive && last) onPos(last.coords);
        sub = await Location.watchPositionAsync({ accuracy: mode === 'travel' ? Location.Accuracy.High : Location.Accuracy.Balanced, timeInterval: 2000, distanceInterval: 2 }, (p) => onPos(p.coords));
        if (!alive) sub?.remove();
      } catch {
        // 위치를 못 받으면 표시하지 않아요
      }
    };
    start();
    return () => {
      alive = false;
      clearTimeout(timer);
      sub?.remove();
    };
  }, [mode]);

  if (!pos) return null;
  const coordinate = { latitude: pos.latitude, longitude: pos.longitude };
  if (mode === 'travel') return <PuckMarker coordinate={coordinate} rotation={dir} />;
  return <DotMarker coordinate={coordinate} />;
}
