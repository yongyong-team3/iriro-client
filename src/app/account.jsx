// 계정 관리 (시안 2026-11-09)
//   이름 · 로그인 방식 · 이메일 / 계정 설정: 프로필 수정 · 로그아웃(확인창) / 계정 종료: 회원 탈퇴
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../components/AppText';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/Auth';
import { providerLabel } from '../components/profileUi';
import { Card, ConfirmModal, MenuRow, R, SectionLabel, SubHeader } from '../components/recUi';

export default function Account() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  const initial = (user?.nickname ?? '이').slice(0, 1);

  return (
    <View style={{ flex: 1, backgroundColor: R.white }}>
      <SubHeader title="계정 관리" subtitle="로그인 정보와 계정을 관리해요" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
        <Card tone="gray" style={{ marginTop: 22, paddingBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={s.initial}>
              <Text style={s.initialText}>{initial}</Text>
            </View>
            <View style={{ marginLeft: 14 }}>
              <Text style={s.name}>{user?.nickname ?? '이리로 사용자'}</Text>
              <Text style={s.provider}>{providerLabel(user?.provider)}</Text>
            </View>
          </View>
          <View style={s.hr} />
          <View style={s.between}>
            <Text style={s.small}>이메일</Text>
            <Text style={s.email}>{user?.email ?? '제공되지 않음'}</Text>
          </View>
        </Card>

        <SectionLabel>계정 설정</SectionLabel>
        <View style={{ gap: 12 }}>
          <MenuRow title="프로필 수정" sub="사진과 닉네임을 변경해요" onPress={() => router.push('/profile')} />
          <MenuRow title="로그아웃" sub="현재 기기에서 계정을 나가요" onPress={() => setAsk(true)} />
        </View>

        <SectionLabel>계정 종료</SectionLabel>
        <MenuRow title="회원 탈퇴" sub="계정 사용을 종료해요" danger onPress={() => router.push('/withdraw')} />
        <Text style={s.foot}>탈퇴하면 계정·소셜 연결·활동(GPS) 기록이 삭제돼요</Text>
      </ScrollView>

      <ConfirmModal
        visible={ask}
        title="로그아웃할까요?"
        message="다시 이용하려면 로그인이 필요해요."
        confirm="로그아웃"
        busy={busy}
        onCancel={() => setAsk(false)}
        onConfirm={async () => {
          setBusy(true);
          await logout(); // 로그인 화면으로 자동 이동
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  initial: { width: 54, height: 54, borderRadius: 27, backgroundColor: R.soft, alignItems: 'center', justifyContent: 'center' },
  initialText: { fontSize: 22, fontWeight: '800', color: R.deep },
  name: { fontSize: 16, fontWeight: '800', color: R.ink },
  provider: { fontSize: 12, color: R.sub, marginTop: 6 },
  hr: { height: 1, backgroundColor: R.line, marginVertical: 16 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  small: { fontSize: 12, color: R.sub },
  email: { fontSize: 12, color: R.ink },
  foot: { fontSize: 12, color: R.sub, textAlign: 'center', marginTop: 28 },
});
