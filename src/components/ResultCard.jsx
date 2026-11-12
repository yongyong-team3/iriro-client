// 활동 결과 카드 (최종 시안 2026-11-11) — 측정 결과 화면과 활동 기록 상세가 같이 써요
//   날짜 · Today's Run ✎ · 1.2 km · 지나온 길(라임 선 + 출발 깃발 + 도착 점) · Time · Avg. pace · Place · Calories burned
//   onTitle 을 주면 ✎ 로 이름을 바꿀 수 있어요. solid: 바탕이 파랗지 않은 화면에서 카드 자체를 파랗게 칠해요(기록 상세).
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, TextInput } from './AppText';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { clock } from '../lib/records';
import { mont } from '../lib/fonts';
import { COLOR } from '../constants/colors';
import { LETTERING } from '../constants/lettering';
import { Lettering } from './RecordCard';
import { Ic } from './recUi';
import { FillSvg } from './FillSvg';

export const EN = { walk: 'Walk', run: 'Run', bike: 'Ride' };
const WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const dateEn = (iso) => {
  const d = new Date(iso);
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}. ${WEEK[d.getDay()]}.`;
};
// 4’ 46” / km (시안 표기)
const paceEn = (sec, km) => {
  if (!km || km < 0.05) return '--';
  const spk = sec / km;
  let m = Math.floor(spk / 60);
  let s = Math.round(spk % 60);
  if (s === 60) ((m += 1), (s = 0));
  return `${m}’ ${String(s).padStart(2, '0')}” / km`;
};

export function ResultCard({ style, date, title, onTitle, activity, distanceKm, durationSec, path, place, kcal, solid }) {
  const [editing, setEditing] = useState(false);
  const bike = activity === 'bike';
  return (
    <View style={[s.card, solid && s.solid, style]}>
      {/* 결과 화면: 파란 바탕 위 반투명 남색 카드 · 기록 상세(solid): 밝은 파랑 한 색 (시안) */}
      {!solid && (
        <FillSvg>
          <Defs>
            <LinearGradient id="resCard" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#084974" stopOpacity="0.34" />
              <Stop offset="1" stopColor="#055381" stopOpacity="0.11" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" rx="30" fill="#0F669B" fillOpacity="0.18" />
          <Rect x="0" y="0" width="100%" height="100%" rx="30" fill="url(#resCard)" />
        </FillSvg>
      )}
      <Text style={[s.date, mont(500)]}>{dateEn(date)}</Text>
      <View style={s.titleRow}>
        {editing && onTitle ? (
          <TextInput
            value={title}
            onChangeText={onTitle}
            onBlur={() => setEditing(false)}
            onSubmitEditing={() => setEditing(false)}
            autoFocus
            maxLength={24}
            style={[s.cardTitle, mont(600), { flex: 1, padding: 0 }]}
            selectionColor={COLOR.lime}
            accessibilityLabel="기록 이름"
          />
        ) : (
          <Text style={[s.cardTitle, mont(600), { flex: 1 }]} numberOfLines={1}>
            {title}
          </Text>
        )}
        {onTitle ? (
          <Pressable onPress={() => setEditing(true)} hitSlop={12} accessibilityRole="button" accessibilityLabel="기록 이름 바꾸기">
            <Ic name="pencil" size={19} color={COLOR.white} />
          </Pressable>
        ) : null}
      </View>
      <View style={s.hr} />

      <View style={s.bigRow}>
        <Text style={[s.big, mont(700)]} numberOfLines={1} adjustsFontSizeToFit>
          {(distanceKm ?? 0).toFixed(1)}
        </Text>
        <Lettering name="kmWave" style={{ marginLeft: 12, marginBottom: 20 }} />
      </View>

      <RouteLine path={path} />

      {/* 2×2 표 */}
      <View style={s.grid}>
        <View style={s.vline} />
        <View style={[s.hline, { top: 0 }]} />
        <View style={[s.hline, { top: 72 }]} />
        <Cell left label="Time" value={clock(durationSec)} />
        <Cell label={bike ? 'Avg. speed' : 'Avg. pace'} value={bike ? (durationSec ? `${((distanceKm / durationSec) * 3600).toFixed(1)} km/h` : '--') : paceEn(durationSec, distanceKm)} />
        <Cell left label="Place" value={place} lettering={place === '용인시 처인구' ? 'placeCheoin' : null} />
        <Cell label="Calories burned" value={`${kcal}kcal`} />
      </View>
    </View>
  );
}

function Cell({ label, value, left, lettering }) {
  return (
    <View style={[s.cell, left ? { paddingLeft: 22 } : { paddingLeft: 24 }]}>
      <Text style={[s.cellLabel, mont(600)]}>{label}</Text>
      {lettering ? (
        <Lettering name={lettering} height={20} style={{ marginTop: 6 }} />
      ) : (
        <Text style={[s.cellValue, mont(700)]} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
      )}
    </View>
  );
}

/** 지나온 길: 시안 위치(카드 안 36~296 × 234~362)에 맞춰 그린 라임 선 + 출발 깃발 + 도착 점 */
function RouteLine({ path }) {
  const W = 337;
  const box = { x: 36, y: 234, w: 260, h: 128 }; // 카드 안 좌표 (시안: 출발 깃발 36,234 · 도착 점 296,362)
  const pts = project(path ?? [], box);
  const d = pts.length > 1 ? pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ') : null;
  const [sx, sy] = pts[0] ?? [box.x, box.y];
  const [ex, ey] = pts[pts.length - 1] ?? [box.x + box.w, box.y + box.h];
  const flag = LETTERING.flag;
  return (
    <Svg width={W} height={380} style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
      {d && <Path d={d} stroke={COLOR.lime} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" fill="none" />}
      <Circle cx={ex} cy={ey} r={8.5} fill="#F7FFD8" />
      <Circle cx={ex} cy={ey} r={6.5} fill="#CAFF35" />
      <Circle cx={sx} cy={sy} r={10.5} fill="#F7FBFF" />
      <Svg x={sx - 4.5} y={sy - 6} width={flag.vb[2]} height={flag.vb[3]} viewBox={flag.vb.join(' ')}>
        <Path d={flag.d} fill="#2185BD" />
      </Svg>
    </Svg>
  );
}

// 위도·경도 → 그림 칸 좌표 (비율 유지, 가운데 정렬)
function project(path, box) {
  if (path.length < 2) return [];
  const lat0 = path.reduce((s, p) => s + p[0], 0) / path.length;
  const kx = Math.cos((lat0 * Math.PI) / 180);
  const xs = path.map((p) => p[1] * kx);
  const ys = path.map((p) => -p[0]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const k = Math.min(box.w / Math.max(maxX - minX, 1e-9), box.h / Math.max(maxY - minY, 1e-9));
  const ox = box.x + (box.w - (maxX - minX) * k) / 2;
  const oy = box.y + (box.h - (maxY - minY) * k) / 2;
  return path.map((_, i) => [ox + (xs[i] - minX) * k, oy + (ys[i] - minY) * k]);
}

const s = StyleSheet.create({
  // 시안: 카드 337×575, 모서리 30, 진한 파랑 반투명 + 옅은 흰 테두리
  card: { position: 'absolute', left: 28, right: 28, height: 575, borderRadius: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.13)', overflow: 'hidden' },
  date: { position: 'absolute', left: 22, top: 22, fontSize: 13, color: 'rgba(255,255,255,0.74)' },
  titleRow: { position: 'absolute', left: 22, right: 20, top: 46, flexDirection: 'row', alignItems: 'center' },
  cardTitle: { fontSize: 18, color: COLOR.white, lineHeight: 26 },
  hr: { position: 'absolute', left: 18, right: 14, top: 77, height: 1, backgroundColor: 'rgba(255,255,255,0.25)' },
  bigRow: { position: 'absolute', left: 22, top: 92, flexDirection: 'row', alignItems: 'flex-end' },
  big: { fontSize: 96, lineHeight: 104, color: COLOR.white, letterSpacing: -6 },
  grid: { position: 'absolute', left: 0, right: 0, top: 413, height: 162, flexDirection: 'row', flexWrap: 'wrap' },
  vline: { position: 'absolute', left: 154, top: 0, width: 1, height: 140, backgroundColor: 'rgba(255,255,255,0.25)' },
  hline: { position: 'absolute', left: 20, right: 12, height: 1, backgroundColor: 'rgba(255,255,255,0.25)' },
  cell: { width: '50%', height: 72, paddingTop: 14 },
  cellLabel: { fontSize: 11, color: COLOR.white },
  cellValue: { fontSize: 21, color: COLOR.white, marginTop: 6, marginRight: 8 },
  solid: { backgroundColor: COLOR.brand, borderColor: 'transparent', shadowColor: '#0F669B', shadowOpacity: 0.25, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
});
