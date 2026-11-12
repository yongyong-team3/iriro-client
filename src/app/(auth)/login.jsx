// 로그인 선택 (시안 393×852)
// 제목 28 · 부제 13 #525252 · 구분선 + '로그인/회원가입' 11 #868686
// 버튼 337×49 radius 100: 카카오 #F8CE46 · 네이버 #78D98A · 애플 #000 · 메일 #3993D4
// 하단 '아이디 로그인 | 로그인 문의' 11 #868686 (아이디 = 이메일 로그인으로 연결)
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../components/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/Auth';
import { USE_MOCK } from '../../api/client';
import { C } from '../../constants/theme';
import { LOGIN_FOOTER, LOGIN_TITLE } from '../../constants/authPaths';
import Svg, { Path } from 'react-native-svg';
import { VectorArt } from '../../components/authUi';

const PROVIDERS = [
  { id: 'kakao', label: '카카오로 계속하기', bg: C.kakao, fg: '#FFFFFF', icon: require('../../../assets/auth/kakao.png') }, // 시안: 흰 말풍선 아이콘
  { id: 'naver', label: '네이버로 계속하기', bg: C.naver, fg: '#FFFFFF', icon: require('../../../assets/auth/naver.png') },
  { id: 'apple', label: '애플로 계속하기', bg: C.apple, fg: '#FFFFFF', icon: require('../../../assets/auth/apple.png') },
];

// 하단 글씨 벡터에서 from~to 구간만 잘라 그려요
function FooterPart({ from, to }) {
  const f = LOGIN_FOOTER;
  return (
    <Svg width={to - from} height={f.h} viewBox={`${from} ${f.y} ${to - from} ${f.h}`}>
      <Path d={f.d} fill={f.fill} />
    </Svg>
  );
}

export default function LoginChoice() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { loginWithSocial } = useAuth();
  const [busy, setBusy] = useState(null);

  const social = async (id) => {
    if (!USE_MOCK) {
      // 실제 소셜 로그인은 각 개발자센터 앱 키 + 백엔드 OAuth 연동 후 연결 (README 참고)
      Alert.alert('준비 중', '소셜 로그인은 백엔드 연동 후 사용할 수 있어요. 메일로 계속해 주세요.');
      return;
    }
    setBusy(id);
    try {
      await loginWithSocial(id); // 신규 회원이면 닉네임 설정 화면으로 자동 이동
    } catch (e) {
      Alert.alert('로그인 실패', e.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={[s.screen, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 34) + 14 }]}>
      {/* 시안: 제목 top 117 (상태바 59 아래 58) · 부제 top 194 */}
      <View style={{ marginTop: 117 - 59 }}>
        <VectorArt art={LOGIN_TITLE} />
        <Text style={s.sub}>가장 편한 방법으로 시작해 보세요</Text>
      </View>

      <View style={s.divider}>
        <View style={s.line} />
        <Text style={s.dividerText}>로그인/회원가입</Text>
        <View style={s.line} />
      </View>

      <View style={{ gap: 9, marginTop: 27 }}>
        {PROVIDERS.filter((p) => p.id !== 'apple' || Platform.OS === 'ios' || USE_MOCK).map((p) => (
          <Pressable
            key={p.id}
            onPress={() => social(p.id)}
            disabled={!!busy}
            accessibilityRole="button"
            style={({ pressed }) => [s.btn, { backgroundColor: p.bg }, pressed && { opacity: 0.85 }]}
          >
            {busy === p.id ? (
              <ActivityIndicator color={p.fg} />
            ) : (
              <View style={s.btnInner}>
                <Image source={p.icon} style={[s.icon, p.tint && { tintColor: p.tint }]} />
                <Text style={[s.btnText, { color: p.fg }]}>{p.label}</Text>
              </View>
            )}
          </Pressable>
        ))}
        <Pressable
          onPress={() => router.push('/signup')}
          disabled={!!busy}
          accessibilityRole="button"
          style={({ pressed }) => [s.btn, { backgroundColor: C.brand }, pressed && { opacity: 0.85 }]}
        >
          <View style={s.btnInner}>
            <View style={s.icon}>
              <Image source={require('../../../assets/auth/mail.png')} style={{ width: 20, height: 20 }} />
            </View>
            <Text style={[s.btnText, { color: '#FFFFFF' }]}>메일로 계속하기</Text>
          </View>
        </Pressable>
      </View>

      <View style={{ flex: 1 }} />

      {/* 시안: "아이디 로그인 | 로그인 문의" — 글씨 윤곽선 그대로, 세로선 기준으로 두 군데 눌러져요 */}
      <View style={s.footer}>
        <Pressable onPress={() => router.push('/email-login')} hitSlop={12} accessibilityRole="link" accessibilityLabel="아이디 로그인">
          <FooterPart from={LOGIN_FOOTER.x} to={LOGIN_FOOTER.divider - 4} />
        </Pressable>
        <View style={s.footerBar} />
        <Pressable
          onPress={() => Alert.alert('로그인 문의', '문의처가 정해지면 연결할게요.')}
          hitSlop={12}
          accessibilityRole="link"
          accessibilityLabel="로그인 문의"
        >
          <FooterPart from={LOGIN_FOOTER.divider + 4} to={LOGIN_FOOTER.x + LOGIN_FOOTER.w} />
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 28 },
  title: { marginLeft: 2 },
  sub: { fontSize: 13, lineHeight: 16, color: C.authSub, marginTop: 14 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 284 - 210 },
  line: { flex: 1, height: 1, backgroundColor: '#868686' }, // 시안 구분선·글자 #868686
  dividerText: { fontSize: 11, color: '#868686' },
  // 버튼 337×49 — 아이콘 36×31은 버튼 왼쪽에서 91, 글자는 129 (시안처럼 세 버튼 글자 시작선이 같아요)
  btn: { height: 49, borderRadius: 100, justifyContent: 'center' },
  btnInner: { flexDirection: 'row', alignItems: 'center', paddingLeft: 90, gap: 2 },
  icon: { width: 36, height: 31, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 16, fontWeight: '700' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 },
  footerBar: { width: 1, height: 8, backgroundColor: 'rgba(0,0,0,0.37)' },
});
