// 회원 탈퇴 (시안 2026-11-09) — 안내 카드 / 확인 체크 / [취소하고 돌아가기] [회원 탈퇴] → '정말 탈퇴하시겠어요?' → DELETE /users/me
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../components/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/Auth';
import { setKV } from '../lib/kv';
import { Button, Card, ConfirmModal, Ic, R, SectionLabel, SubHeader } from '../components/recUi';

export default function Withdraw() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { withdraw } = useAuth();
  const [agree, setAgree] = useState(false);
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const confirm = async () => {
    setBusy(true);
    setErr('');
    try {
      await withdraw();
      // 이 기기에 남은 개인 기록도 지워요
      ['activity-records', 'favorites', 'notifications', 'notif-read'].forEach((k) => setKV(k, []));
      ['activity-draft', 'welcome-at'].forEach((k) => setKV(k, null));
      // 토큰이 지워지면 로그인 화면으로 자동 이동
    } catch (e) {
      setErr(e.message);
      setBusy(false);
      setAsk(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: R.white }}>
      <SubHeader title="회원 탈퇴" subtitle="탈퇴 전 아래 내용을 확인해 주세요" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30 }}>
        <Card tone="red" style={{ marginTop: 22 }}>
          <Text style={s.warnTitle}>계정 이용이 종료됩니다</Text>
          <Text style={s.warnText}>탈퇴 후에는 이 계정으로 서비스를{'\n'}계속 이용할 수 없어요.</Text>
          <View style={s.hr} />
          <Text style={s.warnSmall}>계정·소셜 연결·활동(GPS) 기록이 삭제되고, 다시 가입하면 새 계정으로 시작해요.</Text>
        </Card>

        <SectionLabel>확인 사항</SectionLabel>
        <Card style={{ paddingVertical: 26 }} onPress={() => setAgree(!agree)} accessibilityLabel="탈퇴 시 계정 이용이 종료됨을 확인했어요">
          <View style={{ flexDirection: 'row', alignItems: 'center' }} accessibilityRole="checkbox" accessibilityState={{ checked: agree }}>
            <View style={[s.box, agree && { backgroundColor: R.red, borderColor: R.red }]}>{agree && <Ic name="check" size={14} color={R.white} />}</View>
            <Text style={s.agree}>탈퇴 시 계정 이용이 종료됨을 확인했어요.</Text>
          </View>
        </Card>
        {err ? <Text style={s.err}>{err}</Text> : null}
      </ScrollView>
      <View style={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 20, gap: 12 }}>
        <Button title="취소하고 돌아가기" kind="gray" onPress={() => router.back()} />
        <Button title="회원 탈퇴" kind={agree ? 'danger' : 'dangerSoft'} disabled={!agree} onPress={() => setAsk(true)} style={!agree && { opacity: 1 }} />
      </View>

      <ConfirmModal
        visible={ask}
        title="정말 탈퇴하시겠어요?"
        message={'탈퇴 후에는 이 계정으로\n서비스를 이용할 수 없어요.'}
        confirm="탈퇴하기"
        danger
        busy={busy}
        onCancel={() => setAsk(false)}
        onConfirm={confirm}
      />
    </View>
  );
}

const s = StyleSheet.create({
  warnTitle: { fontSize: 17, fontWeight: '800', color: R.red },
  warnText: { fontSize: 12.5, color: R.ink, marginTop: 16, lineHeight: 22 },
  hr: { height: 1, backgroundColor: '#F3D6CF', marginVertical: 14 },
  warnSmall: { fontSize: 12, color: R.red, lineHeight: 17 },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: '#CBD3D8', alignItems: 'center', justifyContent: 'center' },
  agree: { fontSize: 12.5, fontWeight: '600', color: R.ink, marginLeft: 12, flex: 1 },
  err: { fontSize: 12, color: R.red, marginTop: 14 },
});
