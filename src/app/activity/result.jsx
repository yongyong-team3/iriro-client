// 활동 결과 (최종 시안 2026-11-11 기록 흐름) — 측정 종료 후 확인·저장
//   파란 화면: ‹ · '오늘도 해냈어요!' · 공유 / 카드(날짜 · Today's Run ✎ · 1.2km · 지나온 길 · Time · Avg. pace · Place · Calories burned)
//   [기록 저장하기] → '기록이 완료 되었습니다!' 창 → [홈으로 가기]
//   칼로리는 몸무게를 몰라 70kg 기준 추정값이에요(lib/recorder.js kcalFor). 즐겨찾기 추가 토글은 시안에 없어 뺐어요.
import { useState } from 'react';
import { Alert, Modal, Pressable, Share, StyleSheet, View } from 'react-native';
import { Text } from '../../components/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { getKV, setKV } from '../../lib/kv';
import { USE_MOCK } from '../../api/client';
import { ACT, clock, km2, shortClock, useRecords } from '../../lib/records';
import { pushNotification } from '../../lib/notifications';
import { kcalFor } from '../../lib/recorder';
import { COLOR } from '../../constants/colors';
import { Lettering } from '../../components/RecordCard';
import { ResultCard } from '../../components/ResultCard';
import { Ic } from '../../components/recUi';

const STATUS_TOP = 59;
const EN = { walk: 'Walk', run: 'Run', bike: 'Ride' };
export default function ActivityResult() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const top = Math.max(insets.top - STATUS_TOP, 0); // 시안은 상태바 59 기준: 상태바가 얇은 폰(안드로이드)에서도 시안 위치 그대로
  const [draft, setDraft] = useState(() => getKV('activity-draft', null));
  const { add } = useRecords();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);

  if (!draft) {
    return (
      <View style={[s.screen, { paddingTop: insets.top + 20, alignItems: 'center' }]}>
        <Text style={{ color: COLOR.white, marginTop: 60 }}>저장할 측정 결과가 없어요.</Text>
        <Pressable onPress={() => router.dismissTo('/')} style={[s.save, { position: 'relative', marginTop: 30 }]} accessibilityRole="button">
          <Text style={s.saveText}>홈으로 가기</Text>
        </Pressable>
      </View>
    );
  }

  const a = ACT[draft.activity] ?? ACT.walk;
  const title = draft.title ?? `Today’s ${EN[draft.activity] ?? 'Run'}`;
  const setTitle = (v) => setDraft((d) => ({ ...d, title: v }));
  const place = draft.place ?? '용인시 처인구';
  const kcal = kcalFor(draft.activity, draft.distanceKm);

  const save = async () => {
    setBusy(true);
    setErr('');
    try {
      await add({ ...draft }, { saveAsFavorite: false });
    } catch (e) {
      setErr(`저장하지 못했어요. ${e.message}`);
      setBusy(false);
      return;
    }
    const today = new Date(draft.date).toDateString() === new Date().toDateString();
    // 목업: 이 기기 알림함에 추가 (서버 모드는 서버가 알림을 만들어요)
    if (USE_MOCK)
      pushNotification({
        type: 'activity',
        title: `${today ? '오늘의 ' : ''}${a.label}${a.label === '자전거' ? '가' : '이'} 기록됐어요`,
        body: `${km2(draft.distanceKm)} km · ${shortClock(draft.durationSec)}`,
      });
    setKV('activity-draft', null);
    setBusy(false);
    setDone(true);
  };
  const leave = () => {
    if (done) return router.dismissTo('/');
    Alert.alert('저장하지 않고 나갈까요?', '이번 기록은 사라져요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '나가기',
        style: 'destructive',
        onPress: () => {
          setKV('activity-draft', null);
          router.dismissTo('/');
        },
      },
    ]);
  };
  const share = () => Share.share({ message: `이리로에서 오늘 ${a.label} ${km2(draft.distanceKm)}km · ${clock(draft.durationSec)} 기록했어요! (${place})` }).catch(() => {});

  return (
    <View style={s.screen}>
      {/* 머리: ‹ · 오늘도 해냈어요! · 공유 */}
      <Pressable onPress={leave} hitSlop={12} style={[s.back, { top: 74 + top }]} accessibilityRole="button" accessibilityLabel="뒤로 가기">
        <Ic name="back" size={24} color={COLOR.white} />
      </Pressable>
      <View style={[s.titleWrap, { top: 74 + top }]} accessibilityRole="header" accessibilityLabel="오늘도 해냈어요!">
        <Lettering name="doneTitle" />
      </View>
      <Pressable onPress={share} hitSlop={12} style={[s.share, { top: 78 + top }]} accessibilityRole="button" accessibilityLabel="공유하기">
        <Lettering name="share" />
      </Pressable>

      {/* 카드 */}
      <ResultCard
        style={{ top: 136 + top }}
        date={draft.date}
        title={title}
        onTitle={setTitle}
        activity={draft.activity}
        distanceKm={draft.distanceKm}
        durationSec={draft.durationSec}
        path={draft.path}
        place={place}
        kcal={kcal}
      />

      {err ? <Text style={[s.err, { bottom: Math.max(insets.bottom, 34) + 96 }]}>{err}</Text> : null}
      <Pressable onPress={save} disabled={busy || done} style={({ pressed }) => [s.save, { top: 748 + top }, pressed && { opacity: 0.88 }]} accessibilityRole="button">
        <Text style={s.saveText}>{busy ? '저장 중…' : '기록 저장하기'}</Text>
      </Pressable>

      {/* 저장 완료 (시안: 51% 어둡게 + 흰 창) */}
      <Modal visible={done} transparent animationType="fade" statusBarTranslucent onRequestClose={() => router.dismissTo('/')}>
        <View style={s.dim}>
          <View style={[s.doneCard, { marginTop: 250 + top }]} accessibilityViewIsModal>
            <Text style={s.doneTitle}>기록이 완료 되었습니다!</Text>
            <Text style={s.doneSub}>기록 탭에서 확인할 수 있어요</Text>
            <Pressable onPress={() => router.dismissTo('/')} style={({ pressed }) => [s.homeBtn, pressed && { opacity: 0.88 }]} accessibilityRole="button">
              <Text style={s.homeText}>홈으로 가기</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLOR.brand },
  back: { position: 'absolute', left: 24, width: 30, height: 28, justifyContent: 'center' },
  titleWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  share: { position: 'absolute', right: 41 },
  err: { position: 'absolute', left: 28, right: 28, color: COLOR.white, fontSize: 12, textAlign: 'center' },
  save: { position: 'absolute', alignSelf: 'center', width: 187, height: 48, borderRadius: 24, backgroundColor: COLOR.lime, alignItems: 'center', justifyContent: 'center' },
  saveText: { fontSize: 15, fontWeight: '600', color: COLOR.muted },
  dim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.51)', paddingHorizontal: 24 },
  doneCard: { backgroundColor: COLOR.white, borderRadius: 24, paddingTop: 31, paddingHorizontal: 24, paddingBottom: 22 },
  doneTitle: { fontSize: 20, fontWeight: '700', color: COLOR.ink, marginLeft: 17 },
  doneSub: { fontSize: 12, color: COLOR.sub, marginTop: 8, marginLeft: 17 },
  homeBtn: { height: 54, borderRadius: 15, backgroundColor: COLOR.brand, alignItems: 'center', justifyContent: 'center', marginTop: 32 },
  homeText: { fontSize: 15, fontWeight: '700', color: COLOR.white },
});
