// 이메일 회원가입 1단계 (최종 시안: 이메일·비밀번호·비밀번호 확인 + 동의 2개, '회원가입' → 닉네임 화면)
//   [필수] 서비스 이용약관 및 위치정보 제공 · [선택] 하천 침수 경보 긴급 알림 수신
//   가입 요청은 2단계(signup-nickname)에서 닉네임과 함께 보내요.
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../components/AppText';
import { useRouter } from 'expo-router';
import { TITLE_SIGNUP } from '../../constants/authPaths';
import { AuthScreen, BottomActions, Field, FormError, PrimaryButton, rules } from '../../components/authUi';
import { COLOR } from '../../constants/colors';
import { setPendingSignup } from '../../lib/pendingSignup';

function Check({ checked, onChange, label }) {
  return (
    <Pressable style={s.checkRow} onPress={() => onChange(!checked)} hitSlop={6} accessibilityRole="checkbox" accessibilityState={{ checked }} accessibilityLabel={label}>
      <View style={[s.box, checked && s.boxOn]}>{checked ? <Text style={s.tick}>✓</Text> : null}</View>
      <Text style={s.checkText}>{label}</Text>
    </Pressable>
  );
}

export default function Signup() {
  const router = useRouter();
  const [f, setF] = useState({ email: '', password: '', confirm: '' });
  const [touched, setTouched] = useState({});
  const [terms, setTerms] = useState(false); // [필수]
  const [alertConsent, setAlertConsent] = useState(false); // [선택]
  const [formError, setFormError] = useState('');

  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }));
  const blur = (k) => () => setTouched((p) => ({ ...p, [k]: true }));

  const errors = {
    email: rules.email(f.email),
    password: rules.password(f.password),
    confirm: rules.confirm(f.confirm, f.password), // 비밀번호 확인은 앱에서 문자열 비교만 (서버로는 안 보내요)
  };
  const show = (k) => (touched[k] ? errors[k] : '');

  const submit = () => {
    setTouched({ email: true, password: true, confirm: true });
    setFormError('');
    if (Object.values(errors).some(Boolean)) return;
    if (!terms) {
      setFormError('[필수] 서비스 이용약관 및 위치정보 제공에 동의해 주세요.');
      return;
    }
    setPendingSignup({ email: f.email.trim(), password: f.password, alertConsent });
    router.push('/signup-nickname');
  };

  return (
    <AuthScreen
      titleArt={TITLE_SIGNUP}
      gap={13}
      footer={
        <BottomActions link="이미 계정이 있으신가요? 로그인" onLink={() => router.replace('/email-login')}>
          <PrimaryButton title="회원가입" onPress={submit} />
        </BottomActions>
      }
    >
      <Field
        label="이메일"
        value={f.email}
        onChangeText={set('email')}
        onBlur={blur('email')}
        placeholder="name@example.com"
        keyboardType="email-address"
        textContentType="emailAddress"
        autoComplete="email"
        error={show('email')}
      />
      <Field
        label="비밀번호"
        value={f.password}
        onChangeText={set('password')}
        onBlur={blur('password')}
        placeholder="비밀번호를 입력해 주세요"
        secure
        textContentType="newPassword"
        autoComplete="new-password"
        error={show('password')}
      />
      <Field
        label="비밀번호 확인"
        value={f.confirm}
        onChangeText={set('confirm')}
        onBlur={blur('confirm')}
        placeholder="비밀번호를 다시 입력해 주세요"
        secure
        textContentType="newPassword"
        error={show('confirm')}
        returnKeyType="done"
      />
      <View style={s.checks}>
        <Check
          checked={terms}
          onChange={(v) => {
            setTerms(v);
            if (v) setFormError('');
          }}
          label="[필수] 서비스 이용약관 및 위치정보 제공" />
        <Check checked={alertConsent} onChange={setAlertConsent} label="[선택] 하천 침수 경보 긴급 알림 수신" />
      </View>
      <FormError message={formError} />
    </AuthScreen>
  );
}

const s = StyleSheet.create({
  checks: { gap: 8, marginTop: 4, paddingLeft: 3 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  box: { width: 16, height: 16, borderRadius: 3, borderWidth: 1, borderColor: COLOR.hint, alignItems: 'center', justifyContent: 'center', backgroundColor: COLOR.white },
  boxOn: { backgroundColor: COLOR.brand, borderColor: COLOR.brand },
  tick: { color: COLOR.white, fontSize: 12, lineHeight: 14, fontWeight: '800' },
  checkText: { fontSize: 12, color: COLOR.ink },
});
