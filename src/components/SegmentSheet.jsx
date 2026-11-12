// 구간 상세: F-03 회복 예상 · F-05 근거 타임라인 · F-10 즐겨찾기
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Text } from './AppText';
import { getSegment } from '../api/client';
import { STATUS, SOURCE, TIMELINE_SOURCE, TREND, UNCERTAINTY } from '../constants/status';
import { C, shadow } from '../constants/theme';
import { prettyTime, relativeTime } from '../lib/time';
import { eventMonth, getFloodHistory } from '../lib/floodHistory';
import { Button, Empty, SectionTitle, SourceChip, StatusBadge, Tag } from './ui';
import WaterChart from './WaterChart';

function Recovery({ seg, now }) {
  const r = seg.recovery;
  return (
    <View style={s.recovery}>
      <View style={s.row}>
        <SourceChip src={SOURCE.estimate} />
        <Text style={s.recTitle}>이용 여건 회복 예상</Text>
      </View>
      {!r.available && <Text style={s.recNone}>{r.reason}</Text>}
      {r.available && r.reached && <Text style={s.recMain}>참고 수위 아래로 내려와 있어요</Text>}
      {r.available && !r.reached && (
        <>
          <Text style={s.recMain}>{relativeTime(r.estimate, now)}쯤</Text>
          <Text style={s.recRange}>
            예상 범위 {relativeTime(r.earliest, now)} ~ {relativeTime(r.latest, now)} · {UNCERTAINTY[r.uncertainty]}
          </Text>
          <Text style={s.recBasis}>근거: {r.basis}</Text>
        </>
      )}
      {seg.status === 'closed' && <Text style={s.recWarn}>회복 추정은 공식 통제 해제를 뜻하지 않아요. 출입은 용인시 공지를 따르세요.</Text>}
    </View>
  );
}

// 과거 침수 이력 (행정안전부 침수흔적도)
// 평소엔 참고 정보, 수위 상승·주의·통제일 때는 주의 문구로 강조
function FloodHistory({ seg }) {
  const h = getFloodHistory(seg.id);
  if (!h.count) {
    return <Text style={s.fhNone}>침수흔적도(2008~2022)에 이 구간 근처 침수 기록은 없어요.</Text>;
  }
  const alert = seg.trend === 'rising' || seg.status === 'caution' || seg.status === 'closed';
  return (
    <View style={[s.fh, alert && s.fhAlert]}>
      <View style={[s.row, { justifyContent: 'space-between' }]}>
        <Text style={[s.fhTitle, alert && { color: '#B45309' }]}>과거 침수 이력 {h.count}회</Text>
        {h.max_depth_m != null && <Text style={s.fhDepth}>최대 깊이 {h.max_depth_m.toFixed(1)}m</Text>}
      </View>
      {alert && <Text style={s.fhWarn}>예전에 물에 잠긴 적이 있는 구간이에요. 수위가 오를 때 주의하세요.</Text>}
      {h.events.map((e) => (
        <View key={e.year} style={s.fhItem}>
          <View style={s.fhDot} />
          <View style={{ flex: 1 }}>
            <Text style={s.fhEvent}>
              {eventMonth(e.start)} · {e.event}
            </Text>
            <Text style={s.fhMeta}>
              주변 침수 구역 {e.areas}곳 · 깊이 최대 {e.max_depth_m.toFixed(1)}m
            </Text>
          </View>
        </View>
      ))}
      <Text style={s.fhSource}>출처: 행정안전부 침수흔적도 · 과거 기록이며 현재 상태와 다를 수 있어요</Text>
    </View>
  );
}

const DOT = { official: C.danger, citizen: C.citizen, level: C.ok, rain: '#38BDF8' };

function Timeline({ items }) {
  if (!items) return <View style={{ height: 80, borderRadius: 12, backgroundColor: '#F1F5F9' }} />;
  if (!items.length) return <Empty>기준 시각까지 기록된 변화가 없어요.</Empty>;
  return (
    <View style={s.tl}>
      <View style={s.tlLine} />
      {items.map((e, i) => (
        <View key={i} style={s.tlItem}>
          <View style={[s.tlDot, { backgroundColor: DOT[e.type] ?? '#94A3B8' }]} />
          <View style={[s.row, { gap: 6 }]}>
            <SourceChip src={TIMELINE_SOURCE[e.type]} />
            <Text style={s.tlTime}>{prettyTime(e.t)}</Text>
          </View>
          <Text style={s.tlTitle}>{e.title}</Text>
          {!!e.detail && <Text style={s.tlDetail}>{e.detail}</Text>}
          <Text style={s.tlSource}>출처: {e.source}</Text>
        </View>
      ))}
    </View>
  );
}

export default function SegmentSheet({ seg, river, now, isFavorite, onToggleFavorite, onReport, onClose }) {
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    let alive = true;
    setDetail(null);
    getSegment(seg.id, now)
      .then((d) => alive && setDetail(d))
      .catch(() => alive && setDetail({ forecast: null, timeline: [] }));
    return () => {
      alive = false;
    };
  }, [seg.id, now]);

  const st = STATUS[seg.status];
  const { height } = useWindowDimensions();

  return (
    <View style={[s.sheet, { maxHeight: height * 0.66 }]}>
      <View style={s.handle} />
      <ScrollView contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
        <View style={[s.row, { justifyContent: 'space-between', alignItems: 'flex-start' }]}>
          <View style={{ flex: 1 }}>
            <Text style={s.eyebrow}>
              {river.name} · {seg.lengthKm}km{seg.bikePath ? ' · 자전거도로' : ''}
            </Text>
            <Text style={s.title}>{seg.name}</Text>
          </View>
          <View style={[s.row, { gap: 6 }]}>
            <Pressable onPress={onToggleFavorite} style={[s.iconBtn, isFavorite && { backgroundColor: '#FFFBEB' }]} hitSlop={6}>
              <Text style={{ fontSize: 17, color: isFavorite ? C.warn : C.ink }}>{isFavorite ? '★' : '☆'}</Text>
            </Pressable>
            <Pressable onPress={onClose} style={s.iconBtn} hitSlop={6}>
              <Text style={{ fontSize: 15 }}>✕</Text>
            </Pressable>
          </View>
        </View>

        <View style={[s.row, { gap: 6, marginTop: 10, flexWrap: 'wrap' }]}>
          <StatusBadge status={st} large />
          <SourceChip src={SOURCE[seg.source]} />
          {seg.floodHistory && <Tag text="과거 침수 이력" fg={C.history} bg="#EEF2FF" />}
          {seg.reportCount > 0 && <Tag text={`제보 ${seg.reportCount}`} fg={C.citizen} bg="#F5F3FF" />}
        </View>
        <Text style={s.desc}>{st.desc}</Text>

        {seg.closure && (
          <View style={s.closure}>
            <Text style={s.closureTitle}>공식 출입 통제 중</Text>
            <Text style={s.closureText}>{seg.closure.reason}</Text>
            <Text style={s.closureSmall}>
              {prettyTime(seg.closure.since)}부터 · 출처 {seg.closure.source}
            </Text>
          </View>
        )}

        <View style={[s.row, { gap: 8, marginTop: 12 }]}>
          <View style={s.stat}>
            <Text style={s.statLabel}>현재 수위</Text>
            {seg.level !== null ? (
              <>
                <Text style={s.statValue}>
                  {seg.level.toFixed(2)}
                  <Text style={s.unit}> m</Text>
                </Text>
                <Text style={s.statSub}>{TREND[seg.trend]}</Text>
              </>
            ) : (
              <Text style={s.statNone}>데이터 없음</Text>
            )}
          </View>
          <View style={s.stat}>
            <Text style={s.statLabel}>참고 수위</Text>
            {seg.thresholds ? (
              <>
                <Text style={s.statValue}>
                  {seg.thresholds.interest}
                  <Text style={s.unit}> m</Text>
                </Text>
                <Text style={s.statSub} numberOfLines={1}>
                  {seg.station?.name}
                </Text>
              </>
            ) : (
              <Text style={s.statNone}>미확보</Text>
            )}
          </View>
        </View>

        <Recovery seg={seg} now={now} />

        <FloodHistory seg={seg} />

        <SectionTitle sub="최근 24시간 + 향후 24시간 추정">수위·강수 추이</SectionTitle>
        <WaterChart data={detail ? detail.forecast : undefined} now={now} />

        <SectionTitle>근거 타임라인</SectionTitle>
        <Timeline items={detail?.timeline} />

        <Button title="이 구간 현장 상황 제보하기" onPress={onReport} style={{ marginTop: 14 }} />
        <Text style={s.disclaimer}>
          기준 시각 {prettyTime(now)} · AI 추정은 참고용이며 출입 여부는 용인시 공식 통제 정보를 따르세요.
        </Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 16, paddingTop: 8,
    ...shadow,
  },
  handle: { width: 36, height: 4, borderRadius: 4, backgroundColor: '#CBD5E1', alignSelf: 'center', marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center' },
  eyebrow: { fontSize: 12, color: C.muted, fontWeight: '600' },
  title: { fontSize: 19, fontWeight: '800', color: C.ink, marginTop: 2 },
  iconBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.fill, alignItems: 'center', justifyContent: 'center' },
  desc: { fontSize: 13, color: C.ink2, marginTop: 6 },
  closure: { marginTop: 10, backgroundColor: '#FFF1F2', borderColor: '#FECDD3', borderWidth: 1, borderRadius: 12, padding: 12, gap: 2 },
  closureTitle: { fontSize: 13.5, fontWeight: '800', color: '#9F1239' },
  closureText: { fontSize: 13, color: '#9F1239' },
  closureSmall: { fontSize: 12, color: '#BE123C' },
  stat: { flex: 1, backgroundColor: C.fill, borderRadius: 18, padding: 12 },
  statLabel: { fontSize: 12, color: C.muted, fontWeight: '600' },
  statValue: { fontSize: 23, fontWeight: '800', color: C.ink, marginTop: 2 },
  unit: { fontSize: 13, color: C.muted, fontWeight: '600' },
  statSub: { fontSize: 12, color: C.muted, marginTop: 2 },
  statNone: { fontSize: 15, color: C.muted, marginTop: 8, fontWeight: '700' },
  recovery: { marginTop: 10, backgroundColor: C.accentSoft, borderRadius: 18, padding: 14 },
  recTitle: { fontSize: 12.5, fontWeight: '700', color: C.ink2, marginLeft: 6 },
  recMain: { fontSize: 20, fontWeight: '800', color: C.accent, marginTop: 6 },
  recRange: { fontSize: 12.5, color: C.ink2, marginTop: 2 },
  recBasis: { fontSize: 12, color: C.muted, marginTop: 4 },
  recNone: { fontSize: 13.5, color: C.ink2, marginTop: 6 },
  recWarn: { fontSize: 12, color: '#BE123C', marginTop: 8, fontWeight: '700' },
  fh: { marginTop: 10, backgroundColor: '#EEF2FF', borderRadius: 18, padding: 14, gap: 6 },
  fhAlert: { backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A' },
  fhTitle: { fontSize: 14, fontWeight: '800', color: '#4338CA' },
  fhDepth: { fontSize: 12, fontWeight: '700', color: C.ink2 },
  fhWarn: { fontSize: 12.5, color: '#B45309', fontWeight: '700' },
  fhItem: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  fhDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.history, marginTop: 5 },
  fhEvent: { fontSize: 13, fontWeight: '700', color: C.ink },
  fhMeta: { fontSize: 12, color: C.ink2, marginTop: 1 },
  fhSource: { fontSize: 12, color: C.muted, marginTop: 2 },
  fhNone: { fontSize: 12, color: C.muted, marginTop: 10 },
  tl: { paddingLeft: 16 },
  tlLine: { position: 'absolute', left: 4, top: 6, bottom: 6, width: 2, backgroundColor: C.line },
  tlItem: { paddingBottom: 12 },
  tlDot: { position: 'absolute', left: -16, top: 4, width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: '#fff' },
  tlTime: { fontSize: 12, color: C.muted },
  tlTitle: { fontSize: 13.5, fontWeight: '700', color: C.ink, marginTop: 3 },
  tlDetail: { fontSize: 12.5, color: C.ink2, marginTop: 1 },
  tlSource: { fontSize: 12, color: C.muted, marginTop: 2 },
  disclaimer: { fontSize: 12, color: C.muted, marginTop: 10, lineHeight: 17 },
});
