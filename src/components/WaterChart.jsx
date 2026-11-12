// F-02/F-03 수위 실측 + AI 추정 + 강수량 그래프 (react-native-svg로 직접 그림)
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import Svg, { Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { parseLocal } from '../lib/time';
import { C } from '../constants/theme';

const H = 170;
const PAD = { l: 30, r: 8, t: 10, b: 20 };

export default function WaterChart({ data, now }) {
  const [w, setW] = useState(0);

  if (data === undefined) return <View style={[s.skeleton]} />;
  if (data === null) return <Text style={s.empty}>연결된 수위 관측 데이터가 없어 추이를 표시하지 않아요.</Text>;

  const all = [...data.observed, ...data.predicted.slice(1)];
  const t0 = parseLocal(all[0].t).getTime();
  const t1 = parseLocal(all[all.length - 1].t).getTime();
  const th = data.thresholds;
  const maxLv = Math.ceil(Math.max(th ? th.caution + 0.6 : 0, ...all.map((p) => p.level)));
  const innerW = Math.max(1, w - PAD.l - PAD.r);
  const innerH = H - PAD.t - PAD.b;
  const x = (t) => PAD.l + ((parseLocal(t).getTime() - t0) / (t1 - t0 || 1)) * innerW;
  const y = (lv) => PAD.t + innerH - (lv / maxLv) * innerH;
  const line = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.level).toFixed(1)}`).join(' ');
  const barW = Math.max(2, innerW / all.length - 1.5);

  const ticks = all.filter((p) => parseLocal(p.t).getHours() % 6 === 0);
  const yTicks = [0, Math.round(maxLv / 2), maxLv];

  return (
    <View>
      <View style={s.legend}>
        <Legend color={C.ink} label="실측" />
        <Legend color={C.accent} label="AI 추정" dashed />
        <Legend color="#7DD3FC" label="강수" thick />
        {th && <Legend color={C.warn} label="참고 수위" dashed />}
      </View>
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height: H }}>
        {w > 0 && (
          <Svg width={w} height={H}>
            {yTicks.map((v) => (
              <Line key={v} x1={PAD.l} x2={w - PAD.r} y1={y(v)} y2={y(v)} stroke="#F1F5F9" />
            ))}
            {yTicks.map((v) => (
              <SvgText key={`l${v}`} x={PAD.l - 6} y={y(v) + 4} fontSize={12} fill={C.muted} textAnchor="end">
                {v}m
              </SvgText>
            ))}
            {/* 강수: 위에서 아래로 내려오는 막대 (최대 80mm/h) */}
            {data.rain.map((p) =>
              p.mm ? <Rect key={p.t} x={x(p.t) - barW / 2} y={PAD.t} width={barW} height={(p.mm / 80) * innerH} fill="#7DD3FC" /> : null,
            )}
            {th && <Line x1={PAD.l} x2={w - PAD.r} y1={y(th.interest)} y2={y(th.interest)} stroke={C.warn} strokeDasharray="4 4" />}
            {th && <Line x1={PAD.l} x2={w - PAD.r} y1={y(th.caution)} y2={y(th.caution)} stroke={C.danger} strokeOpacity={0.6} strokeDasharray="4 4" />}
            <Line x1={x(now)} x2={x(now)} y1={PAD.t} y2={PAD.t + innerH} stroke={C.ink} strokeOpacity={0.35} />
            <SvgText x={x(now) - 3} y={PAD.t + 9} fontSize={12} fill={C.ink2} textAnchor="end">
              기준 시각
            </SvgText>
            <Path d={line(data.observed)} stroke={C.ink} strokeWidth={2.2} fill="none" />
            <Path d={line(data.predicted)} stroke={C.accent} strokeWidth={2.2} strokeDasharray="6 4" fill="none" />
            {ticks.map((p) => {
              const d = parseLocal(p.t);
              return (
                <SvgText key={`x${p.t}`} x={x(p.t)} y={H - 4} fontSize={12} fill={C.muted} textAnchor="middle">
                  {d.getHours() === 0 ? `${d.getMonth() + 1}/${d.getDate()}` : `${d.getHours()}시`}
                </SvgText>
              );
            })}
          </Svg>
        )}
      </View>
    </View>
  );
}

function Legend({ color, label, dashed, thick }) {
  return (
    <View style={s.lgItem}>
      <View style={{ width: thick ? 8 : 16, height: 0, borderTopWidth: thick ? 6 : 2.5, borderColor: color, borderStyle: dashed ? 'dashed' : 'solid' }} />
      <Text style={s.lgText}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  skeleton: { height: H + 20, borderRadius: 12, backgroundColor: '#F1F5F9' },
  empty: { fontSize: 13, color: C.muted, paddingVertical: 6 },
  legend: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', marginBottom: 4 },
  lgItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  lgText: { fontSize: 12, color: C.muted },
});
