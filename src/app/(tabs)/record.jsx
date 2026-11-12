// ▶ 활동 측정 (최종 시안 2026-11-11 기록 흐름)
//   코스 화면 '이 코스로 기록 시작' → 3·2·1 카운트다운 → 기록 중 / 일시정지
//   위: ‹(코스 화면으로, 기록은 계속) · 기록 카드(기록중 칩 · 타이머 · 거리 · 평균 페이스)
//   아래: [❚❚ 일시정지 / ▶ 다시 시작] [■ 종료] 알약 버튼 → '기록을 종료할까요?' → 결과 화면
//   측정 상태는 lib/recorder.js 에 있어서 코스 화면에서도 같이 보여요.
//   활동 고르기(어떤 활동을 기록할까요?)는 지도 홈 시트로 옮겼어요.
import { useCallback } from 'react';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Text } from '../../components/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import Svg, { Path, Rect } from 'react-native-svg';
import { useAppState } from '../../context/AppState';
import { pathKm, toLatLng } from '../../lib/geo';
import { useHideTabBar } from '../../lib/tabbar';
import { openPickSheet } from '../../lib/pickSheet';
import * as rec from '../../lib/recorder';
import { COLOR } from '../../constants/colors';
import { mont } from '../../lib/fonts';
import { ConfirmModal, Ic, StartPuck, TrackMap, bearing, startBearing } from '../../components/recUi';
import RecordCard from '../../components/RecordCard';

const STATUS_TOP = 59; // 시안 상태바 높이
// 지도에서 코스가 위 카드·아래 버튼에 가리지 않게
const PAD = { top: 300, right: 50, bottom: 160, left: 50 };

export default function RecordScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const r = rec.useRecorder();
  const { route } = useAppState();
  const winH = useWindowDimensions().height;
  const top = Math.max(insets.top - STATUS_TOP, 0); // 시안은 상태바 59 기준: 상태바가 얇은 폰(안드로이드)에서도 시안 위치 그대로
  const active = r.phase !== 'idle';
  useHideTabBar(active);

  // 측정 중이 아닐 때 이 탭이 앞에 오면: 지도 홈의 활동 고르기 시트로 보내요
  useFocusEffect(
    useCallback(() => {
      if (rec.getRecorder().phase !== 'idle') return;
      openPickSheet();
      router.navigate('/');
    }, []),
  );
  // 카운트다운 중 눌러서 취소 → 지도 홈으로
  const cancelCount = () => {
    rec.cancel();
    router.navigate('/');
  };

  const planned = r.info?.planned ?? null;
  // 시연 가상 위치와 진행 방향 (기록 전에는 코스 출발점·출발 방향)
  const simAt = r.track.length ? r.track[r.track.length - 1] : planned?.[0];
  const simDir = r.track.length > 1 ? bearing(r.track[Math.max(0, r.track.length - 3)], r.track[r.track.length - 1]) : startBearing(planned);
  const km = pathKm(r.track);
  const recording = r.phase === 'running' || r.phase === 'paused';
  const back = () => {
    // 기록은 계속돼요. 코스 화면에서 '기록으로 돌아가기'로 돌아와요
    const id = r.info?.courseId ?? route?.courseId;
    if (id) router.push({ pathname: '/course/[id]', params: { id } });
    else if (r.phase === 'countdown') cancelCount();
  };
  const finish = () => {
    rec.finish();
    router.push('/activity/result');
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLOR.map }}>
      <TrackMap
        path={recording ? r.track : null}
        planned={planned}
        fit={r.sim || !recording ? planned : undefined}
        follow={recording && !r.sim}
        padding={PAD}
        routeStyle="design"
        myLocation={r.sim ? 'dot' : 'travel'}
      >
        {/* 시연(가상 이동)일 때만: 지금 가상 위치에 작은 위치 아이콘(진행 방향). 실제 GPS 기록은 내 위치 아이콘(나침반)이 따라가요 */}
        {r.sim && simAt && <StartPuck coordinate={toLatLng(simAt)} rotation={simDir} />}
      </TrackMap>

      {active && (
        <>
          <Pressable onPress={back} hitSlop={12} style={[s.back, { top: 50 + top }]} accessibilityRole="button" accessibilityLabel="코스 화면 보기 (기록은 계속돼요)">
            <Ic name="back" size={24} color={COLOR.ink} />
          </Pressable>
          <RecordCard
            activity={r.activity}
            elapsed={r.elapsed}
            km={km}
            chip={r.phase === 'paused' ? { label: '일시정지', fg: COLOR.sub, bg: COLOR.fill } : { label: '기록중' }}
            style={[s.card, { top: 86 + top }]}
          />
          {r.error ? <Text style={[s.error, { top: 266 + top }]}>{r.error}</Text> : null}

          {/* 아래 알약 버튼 (시안: 163×48 · 102×48, 바닥에서 54 위) */}
          <View style={[s.controls, { bottom: Math.max(insets.bottom, 34) + 20 }]}>
            {r.phase === 'paused' ? (
              <Pressable onPress={rec.resume} style={({ pressed }) => [s.pill, s.pillMain, s.pillOn, pressed && { opacity: 0.88 }]} accessibilityRole="button" accessibilityLabel="다시 시작">
                <Svg width={14} height={16} viewBox="0 0 14 16">
                  <Path d="M1.5 1.6v12.8c0 .9 1 1.4 1.7.9l9.6-6.4c.7-.4.7-1.4 0-1.8L3.2.7c-.7-.5-1.7 0-1.7.9z" fill={COLOR.white} />
                </Svg>
                <Text style={[s.pillText, { color: COLOR.white }]}>다시 시작</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={rec.pause}
                disabled={r.phase !== 'running'}
                style={({ pressed }) => [s.pill, s.pillMain, pressed && { opacity: 0.88 }]}
                accessibilityRole="button"
                accessibilityLabel="일시정지"
              >
                <Svg width={14} height={17} viewBox="0 0 14 17">
                  <Rect x={0} y={0} width={4.5} height={17} rx={1.4} fill={COLOR.brand} />
                  <Rect x={9.5} y={0} width={4.5} height={17} rx={1.4} fill={COLOR.brand} />
                </Svg>
                <Text style={[s.pillText, { color: COLOR.brand }]}>일시정지</Text>
              </Pressable>
            )}
            <Pressable onPress={rec.askStop} style={({ pressed }) => [s.pill, s.pillStop, pressed && { opacity: 0.88 }]} accessibilityRole="button" accessibilityLabel="기록 종료">
              <View style={s.stopSq} />
              <Text style={[s.pillText, { color: COLOR.danger }]}>종료</Text>
            </Pressable>
          </View>
        </>
      )}

      {/* 3·2·1 카운트다운: 화면 50% 어둡게 + 큰 숫자 (시안) */}
      {/*   안드로이드에서 지도 위 덮개가 일부만 그려지는 문제가 있어, 지도와 상태바까지 덮는 별도 창(Modal)으로 띄워요 */}
      <Modal visible={r.phase === 'countdown'} transparent statusBarTranslucent navigationBarTranslucent animationType="none" onRequestClose={cancelCount}>
        <Pressable style={s.countWrap} onPress={cancelCount} accessibilityRole="button" accessibilityLabel={`${r.count}초 뒤 기록 시작, 눌러서 취소`}>
          <Text style={[s.count, mont(700), { top: winH * (405 / 852) - 80 }]}>{r.count}</Text>
        </Pressable>
      </Modal>

      <ConfirmModal
        visible={r.askStop}
        title="기록을 종료할까요?"
        message="측정 결과를 확인하고 저장할 수 있어요"
        cancel="계속 기록"
        confirm="종료하고 결과 보기"
        stacked
        onCancel={rec.resume}
        onConfirm={finish}
      />
    </View>
  );
}

const shadow = { shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 4 };
const s = StyleSheet.create({
  back: { position: 'absolute', left: 22, width: 30, height: 30, justifyContent: 'center' },
  card: { position: 'absolute', left: 20, right: 20 },
  error: { position: 'absolute', left: 20, right: 20, backgroundColor: COLOR.dangerBg, color: COLOR.danger, fontSize: 12, padding: 10, borderRadius: 10, overflow: 'hidden' },
  controls: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 23 },
  pill: { height: 48, borderRadius: 24, backgroundColor: COLOR.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 13, ...shadow },
  pillMain: { width: 163 },
  pillOn: { backgroundColor: COLOR.brand },
  pillStop: { width: 102, gap: 10 },
  pillText: { fontSize: 15, fontWeight: '600' },
  stopSq: { width: 14, height: 14, borderRadius: 2.5, backgroundColor: COLOR.danger },
  countWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  // 숫자 칸 높이 160을 화면 높이 47.5%(시안 852 중 405)에 가운데 맞춰 고정 — 글꼴 여백 때문에 위로 밀리지 않게 includeFontPadding 끔
  count: { position: 'absolute', left: 0, right: 0, height: 160, fontSize: 130, lineHeight: 160, textAlign: 'center', textAlignVertical: 'center', includeFontPadding: false, color: COLOR.white },
});
