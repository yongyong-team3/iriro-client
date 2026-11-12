// 구간 상태 (홈 시안 4번째 화면): AI 분석 결과 + 추가 정보(공식 통제 · 수위 관측값)
// 공식 통제 중이면 시안대로 '공식 통제 정보'가 맨 위로 오고, AI 결과는 추가 정보 카드로 내려가요.
import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../components/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAppState } from '../../context/AppState';
import { COLOR } from '../../constants/colors';
import { prettyTime } from '../../lib/time';
import { BigButton, H, Icon, RIVER_STATUS, ScreenHeader, situationOf, statusOf } from '../../components/homeUi';

const UNCERTAINTY = { low: '불확실성 낮음', medium: '불확실성 보통', high: '불확실성 높음' };
// 예상 시각과 같은 날이면 시각만, 날짜가 바뀌면 날짜까지
const hm = (s, ref) => prettyTime(s, { withDate: String(s).slice(0, 10) !== String(ref).slice(0, 10) });

function RecoveryCard({ rc, official }) {
  return (
    <View style={s.rc} accessibilityLabel="AI 회복 예측">
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={s.rcLabel}>AI 회복 예측</Text>
        {rc.uncertainty && <Text style={s.rcChip}>{UNCERTAINTY[rc.uncertainty] ?? rc.uncertainty}</Text>}
      </View>
      {rc.available && rc.reached ? (
        <Text style={s.rcValue}>수위가 참고 수위 아래로 내려왔어요</Text>
      ) : rc.available && rc.atLeast ? (
        // 서버(MAP-04): 1.5m 미만이 2시간 유지될 때까지의 '최소' 예상 시간
        <>
          <Text style={s.rcValue}>
            최소 {rc.minutes >= 60 ? `${Math.floor(rc.minutes / 60)}시간${rc.minutes % 60 ? ` ${rc.minutes % 60}분` : ''}` : `${rc.minutes}분`} 뒤 회복 예상
          </Text>
          {rc.estimate && <Text style={s.rcRange}>{prettyTime(rc.estimate)} 이후</Text>}
          {rc.basis ? <Text style={s.rcNote}>{rc.basis}</Text> : null}
        </>
      ) : rc.available ? (
        <>
          <Text style={s.rcValue}>{prettyTime(rc.estimate)}쯤 이용 가능 예상</Text>
          {rc.earliest && rc.latest && (
            <Text style={s.rcRange}>
              예상 범위 {hm(rc.earliest, rc.estimate)} ~ {hm(rc.latest, rc.estimate)}
            </Text>
          )}
          {rc.basis ? <Text style={s.rcNote}>근거 · {rc.basis}</Text> : null}
        </>
      ) : (
        <Text style={s.rcRange}>{rc.reason ?? '지금은 회복 시점을 추정할 수 없어요'}</Text>
      )}
      {official && <Text style={s.rcNote}>공식 통제 해제는 별도로 확인해 주세요. 예측 시각이 지나도 통제가 풀려야 이용할 수 있어요.</Text>}
    </View>
  );
}

const TREND = { rising: '오르는 중', falling: '내려가는 중', steady: '변화 적음' };

export default function RiverStatus() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { rivers, loadTrail, reload } = useAppState();
  const river = rivers?.find((r) => r.id === id);
  const st = statusOf(river);
  const wl = river?.waterLevel;
  const off = river?.official;
  const situation = situationOf(river);
  const risk = situation === 'available' && wl?.predicted != null && wl.interest != null && wl.predicted >= wl.interest;
  const red = RIVER_STATUS.flooded;

  // 들어올 때마다 최신 상태(수위·AI 예측·공식 통제)를 다시 받아요 (목업은 그대로)
  useEffect(() => {
    if (id) loadTrail(id);
  }, [id]);

  return (
    <View style={{ flex: 1, backgroundColor: H.white }}>
      <ScreenHeader title="구간 상태" subtitle={river?.name ?? ' '} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 17, paddingBottom: 24 }}>
        {off ? (
          // 공식 통제 중: 통제 카드가 맨 위
          <View style={[s.ai, { backgroundColor: red.bg, height: 157 }]}>
            <Text style={[s.aiLabel, { color: red.fg }]}>공식 통제 정보</Text>
            <View style={s.offRow}>
              <Icon name="warnSmall" size={17} />
              <Text style={[s.aiValue, { color: red.fg, marginTop: 0 }]}>통제 중</Text>
            </View>
            <Text style={s.offNote}>
              {off.example
                ? '예시 · 확인 시각은 실제 연동 시 표시'
                : [off.reason, off.source, off.since && `${prettyTime(off.since)}부터`].filter(Boolean).join(' · ')}
            </Text>
          </View>
        ) : (
          <View style={[s.ai, { backgroundColor: st.bg }]}>
            <Text style={[s.aiLabel, { color: st.fg }]}>AI 분석 결과</Text>
            <View style={s.offRow}>
              {st.warn && <Icon name="warnSmall" size={17} />}
              <Text style={[s.aiValue, { color: st.fg, marginTop: 0 }]}>{river ? st.label : '불러오는 중'}</Text>
            </View>
          </View>
        )}

        {/* AI 1시간 예측이 기준(1.5m)을 넘으면 지금 이용 가능이어도 미리 경고 */}
        {risk && (
          <View style={s.risk} accessibilityRole="alert">
            <Text style={s.riskTitle}>AI 예측 · 1시간 뒤 이용 위험 예상</Text>
            <Text style={s.riskText}>
              수위가 빠르게 오르고 있어요. {prettyTime(wl.forecastTargetAt, { withDate: false })}에 {wl.predicted.toFixed(2)}m로 기준({wl.interest}m)을 넘을 것으로 예측돼요. 하천길에 오래 머물지 마세요.
            </Text>
          </View>
        )}

        {/* F-03 회복 시점 추정: 지금 이용할 수 없을 때 '언제쯤 다시 이용할 수 있는지' */}
        {river && situation !== 'available' && river.recovery && <RecoveryCard rc={river.recovery} official={!!off} />}

        <Text style={s.h2}>추가 정보</Text>
        {off ? (
          <View style={[s.card, { backgroundColor: st.bg }]}>
            <Text style={s.cardTitle}>AI 분석 결과</Text>
            <Text style={[s.cardValue, { color: st.fg, fontSize: 15, fontWeight: '600' }]}>
              {st.label}
            </Text>
            <Text style={s.cardNote}>{river?.updatedAt ? `${prettyTime(river.updatedAt, { withDate: false })} 분석 · 10분마다 갱신` : '10분마다 갱신'}</Text>
          </View>
        ) : (
          <InfoCard
            title="공식 통제 정보"
            value={river?.officialKnown ? '통제 없음' : '정보 미확인'}
            note={river?.officialKnown && river?.updatedAt ? `${prettyTime(river.updatedAt)} 확인` : '출처·확인 시각이 연결되면 표시됩니다'}
          />
        )}
        <InfoCard
          title="수위 관측값"
          value={wl ? `${wl.value.toFixed(2)} ${wl.unit}${river.trend ? ` · ${TREND[river.trend]}` : ''}` : '정보 미확인'}
          note={
            wl
              ? [wl.station, `${prettyTime(wl.observedAt)} 관측`, wl.interest != null && `기준 수위 ${wl.interest} m`].filter(Boolean).join(' · ')
              : '관측 지점·단위·시각이 연결되면 표시됩니다'
          }
        />
        {wl?.predicted != null && (
          <InfoCard
            title="AI 수위 예측"
            value={`${wl.predicted.toFixed(2)} ${wl.unit} (${wl.predicted >= wl.value ? '+' : ''}${(wl.predicted - wl.value).toFixed(2)})`}
            note={`${prettyTime(wl.forecastTargetAt)} 예상 · 관측 시각과 별도로 계산한 값이에요`}
          />
        )}
        {river?.staleAt && <Text style={s.disclaimer}>마지막 실측 {prettyTime(river.staleAt)} · 30분 넘게 새 관측이 없어 확인 불가로 표시해요.</Text>}
        <Text style={s.disclaimer}>{river?.notice ?? 'AI 분석 결과와 공식 통제 정보는 별개입니다.'}</Text>
      </ScrollView>
      <View style={{ paddingHorizontal: 17, paddingBottom: Math.max(insets.bottom, 34) + 19 }}>
        {situation === 'closed' ? (
          <BigButton title="공식 통제 중 · 코스 이용 불가" disabled muted />
        ) : situation === 'flooded' ? (
          <BigButton title="우회 코스 확인" onPress={() => router.push(`/detour/${river.id}`)} />
        ) : situation === 'unknown' ? (
          <BigButton
            title="다시 확인"
            onPress={() => {
              reload();
              loadTrail(id);
            }}
          />
        ) : (
          <BigButton title="하천 코스 보기" onPress={() => river && router.push(`/course/${river.id}`)} disabled={!river} />
        )}
      </View>
    </View>
  );
}

function InfoCard({ title, value, note, alert }) {
  return (
    <View style={s.card}>
      <Text style={s.cardTitle}>{title}</Text>
      <Text style={[s.cardValue, alert && { color: H.danger, fontWeight: '600' }]}>{value}</Text>
      <Text style={s.cardNote}>{note}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  risk: { marginTop: 14, borderRadius: 14, backgroundColor: COLOR.warnBg, padding: 16 },
  riskTitle: { fontSize: 14, fontWeight: '800', color: COLOR.warn },
  riskText: { fontSize: 12.5, color: H.text, marginTop: 8, lineHeight: 19 },
  rc: { marginTop: 14, borderRadius: 14, borderWidth: 1, borderColor: H.brandLine, backgroundColor: H.white, padding: 16 },
  rcLabel: { fontSize: 13, fontWeight: '700', color: H.brand },
  rcChip: { fontSize: 12, color: H.brand, backgroundColor: H.white, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden' },
  rcValue: { fontSize: 17, fontWeight: '800', color: H.ink, marginTop: 10 },
  rcRange: { fontSize: 13, color: H.text, marginTop: 6 },
  rcNote: { fontSize: 12, color: H.sub, marginTop: 8, lineHeight: 17 },
  ai: { marginTop: 25, height: 117, borderRadius: 20, paddingLeft: 20, paddingTop: 20 },
  aiLabel: { fontSize: 12, fontWeight: '600' },
  aiValue: { fontSize: 26, fontWeight: '800', marginTop: 20, letterSpacing: -0.3 },
  offRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 18 },
  offNote: { fontSize: 12, color: H.sub, marginTop: 26 },
  h2: { fontSize: 17, fontWeight: '700', color: H.ink, marginTop: 27, marginBottom: 15, marginLeft: 2 },
  card: { borderWidth: 1, borderColor: H.line, borderRadius: 17.5, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 18, marginBottom: 14, minHeight: 118 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: H.ink },
  cardValue: { fontSize: 14, color: H.sub, marginTop: 15 },
  cardNote: { fontSize: 12, color: H.sub, marginTop: 13 },
  disclaimer: { fontSize: 12, color: H.sub, marginTop: 12, marginLeft: 2 },
});
