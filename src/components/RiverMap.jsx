// F-04 구간 상태 지도 (react-native-maps)
import { Fragment, forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Polyline, Polygon, Marker } from 'react-native-maps';
import { STATUS } from '../constants/status';
import { toLatLng, toLatLngs } from '../lib/geo';
import { getFloodHistory } from '../lib/floodHistory';
import { WOLCHON_STATION } from '../constants/stations';
import { MyLocationDot } from './MyLocationDot';

const DASH = { unknown: [4, 12], closed: [14, 10] };

const RiverMap = forwardRef(function RiverMap({ river, selectedSegmentId, highlightSegments = [], reports = [], trackPath, focus, onSelectSegment, style, bottomPadding = 120 }, ref) {
  const map = useRef(null);

  const fit = (coords) => {
    if (!coords?.length || !map.current) return;
    if (coords.length === 1) {
      map.current.animateCamera({ center: toLatLng(coords[0]), zoom: 16 }, { duration: 500 });
      return;
    }
    map.current.fitToCoordinates(toLatLngs(coords), {
      edgePadding: { top: 220, right: 40, bottom: bottomPadding, left: 40 },
      animated: true,
    });
  };
  useImperativeHandle(ref, () => ({ fit }));

  // focus(좌표 배열)가 바뀌면 그 범위로 이동, 없으면 하천 전체
  const focusKey = JSON.stringify(focus ?? null);
  useEffect(() => {
    if (!river) return;
    const t = setTimeout(() => fit(focus?.length ? focus : river.segments.flatMap((s) => s.path)), 150);
    return () => clearTimeout(t);
  }, [focusKey, river ? river.id : null]);

  return (
    <MapView
      ref={map}
      style={style ?? StyleSheet.absoluteFill}
      initialRegion={{ latitude: 37.278, longitude: 127.222, latitudeDelta: 0.13, longitudeDelta: 0.13 }}
      showsUserLocation={false} // 시안 크기의 내 위치 표시(MyLocationDot)를 따로 그려요
      showsMyLocationButton={false}
      toolbarEnabled={false}
      onMapReady={() => river && fit(focus?.length ? focus : river.segments.flatMap((s) => s.path))}
    >
      {river?.segments.map((seg) => {
        const st = STATUS[seg.status];
        const coords = toLatLngs(seg.path);
        const selected = seg.id === selectedSegmentId;
        const hl = highlightSegments.includes(seg.id);
        return (
          <Fragment key={seg.id}>
            {seg.floodHistory && <Polyline coordinates={coords} strokeColor="rgba(99,102,241,0.18)" strokeWidth={24} lineCap="round" zIndex={1} />}
            {(selected || hl) && <Polyline coordinates={coords} strokeColor={hl ? 'rgba(2,132,199,0.35)' : 'rgba(15,23,42,0.28)'} strokeWidth={16} lineCap="round" zIndex={2} />}
            <Polyline
              coordinates={coords}
              strokeColor={st.color}
              strokeWidth={selected ? 9 : 7}
              lineCap="round"
              lineDashPattern={DASH[seg.status]}
              tappable
              onPress={() => onSelectSegment?.(seg.id)}
              zIndex={3}
            />
          </Fragment>
        );
      })}

      {/* 선택한 구간 주변의 과거 침수 구역 (행정안전부 침수흔적도) */}
      {selectedSegmentId &&
        getFloodHistory(selectedSegmentId).polygons.map((p, i) => (
          <Polygon key={`flood-${selectedSegmentId}-${i}`} coordinates={toLatLngs(p.coords)} strokeColor="rgba(99,102,241,0.7)" strokeWidth={1} fillColor="rgba(99,102,241,0.22)" zIndex={0} />
        ))}

      <Marker
        coordinate={toLatLng(WOLCHON_STATION.position)}
        pinColor="azure"
        title={WOLCHON_STATION.name}
        description={`한강홍수통제소 ${WOLCHON_STATION.code} · 관심 ${WOLCHON_STATION.levels.interest}m · 주의 ${WOLCHON_STATION.levels.caution}m`}
      />

      {reports.map((r) => (
        <Marker
          key={r.id}
          coordinate={toLatLng(r.position)}
          pinColor={r.status === 'verified' ? 'violet' : 'purple'}
          title={`시민 제보 · ${r.status === 'verified' ? '확인됨' : '미확인'}`}
          description={r.description || undefined}
          onPress={() => onSelectSegment?.(r.segmentId)}
        />
      ))}

      {trackPath?.length > 1 && <Polyline coordinates={toLatLngs(trackPath)} strokeColor="#0284C7" strokeWidth={5} zIndex={4} />}
      <MyLocationDot />
    </MapView>
  );
});

export default RiverMap;
