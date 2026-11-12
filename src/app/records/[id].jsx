// 개별 활동 기록 상세 (최종 시안 2026-11-11)
//   연한 연두 바탕 / ‹ / 이번 달 기록(연두 카드) / 결과 카드(측정 결과 화면과 같은 파란 카드)
//   기록 이름 바꾸기(✎)는 저장할 곳(API)이 없어 상세에서는 숨겼어요.
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../components/AppText';
import { USE_MOCK } from '../../api/client';
import { getActivity } from '../../api/me';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAppState } from '../../context/AppState';
import { useMonthStats, useRecords } from '../../lib/records';
import { kcalFor } from '../../lib/recorder';
import { Ic } from '../../components/recUi';
import { MonthCard, RC } from '../../components/recDesign';
import { EN, ResultCard } from '../../components/ResultCard';

const STATUS_TOP = 59;
const BG = '#FAFFEE';

export default function RecordDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const top = Math.max(insets.top - STATUS_TOP, 0); // 시안은 상태바 59 기준: 상태바가 얇은 폰(안드로이드)에서도 시안 위치 그대로
  const { records } = useRecords();
  const { courses } = useAppState();
  const [full, setFull] = useState(null); // ACT-03 상세 (목록에 경로가 없을 때)
  const r = full ?? records.find((x) => x.id === id);
  const d = r ? new Date(r.date) : new Date();
  const st = useMonthStats(records, d.getFullYear(), d.getMonth());
  useEffect(() => {
    if (USE_MOCK || !id) return;
    getActivity(id)
      .then(setFull)
      .catch(() => {});
  }, [id]);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/records'));
  const backBtn = (
    <Pressable onPress={back} hitSlop={12} style={[s.back, { top: 80 + top }]} accessibilityRole="button" accessibilityLabel="뒤로 가기">
      <Ic name="back" size={24} color="#000" />
    </Pressable>
  );

  if (!r) {
    return (
      <View style={{ flex: 1, backgroundColor: BG }}>
        {backBtn}
        <Text style={{ textAlign: 'center', color: RC.sub, marginTop: 160 + top }}>기록을 찾을 수 없어요.</Text>
      </View>
    );
  }

  // 예시 기록처럼 경로가 없으면 코스 경로를 보여줘요
  const path = r.path?.length > 1 ? r.path : courses?.find((c) => c.id === r.courseId)?.path;

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <ScrollView contentContainerStyle={{ height: 830 + top + insets.bottom }}>
        <MonthCard y={d.getFullYear()} m={d.getMonth()} st={st} style={[s.month, { top: 114 + top }]} />
        <ResultCard
          solid
          style={{ top: 222 + top, height: 576 }}
          date={r.date}
          title={r.title ?? `Today’s ${EN[r.activity] ?? 'Run'}`}
          activity={r.activity}
          distanceKm={r.distanceKm}
          durationSec={r.durationSec}
          path={path}
          place={r.place ?? '용인시 처인구'}
          kcal={kcalFor(r.activity, r.distanceKm)}
        />
        {backBtn}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  back: { position: 'absolute', left: 18, width: 32, height: 28, justifyContent: 'center' },
  month: { position: 'absolute', left: 24, right: 28 },
});
