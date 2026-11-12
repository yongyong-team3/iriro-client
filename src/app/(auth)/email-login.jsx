// 이메일 로그인 (시안: 이메일·비밀번호 입력, 로그인 버튼, '회원가입' 이동)
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/Auth';
import { TITLE_EMAIL_LOGIN } from '../../constants/authPaths';
import { AuthScreen, BottomActions, Field, FormError, PrimaryButton, rules } from '../../components/authUi';

export default function EmailLogin() {
  const router = useRouter();
  const { loginWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const errEmail = touched ? rules.email(email) : '';
  const errPw = touched && !password ? '비밀번호를 입력해 주세요.' : '';

  const submit = async () => {
    setTouched(true);
    setFormError('');
    if (rules.email(email) || !password) return;
    setLoading(true);
    try {
      await loginWithEmail(email, password); // 성공하면 지도 화면으로 자동 이동
    } catch (e) {
      setFormError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreen
      titleArt={TITLE_EMAIL_LOGIN}
      gap={19}
      footer={
        <BottomActions link="계정이 없으신가요? 회원가입" onLink={() => router.replace('/signup')}>
          <PrimaryButton title="로그인" onPress={submit} loading={loading} />
        </BottomActions>
      }
    >
      <Field
        label="이메일"
        value={email}
        onChangeText={setEmail}
        placeholder="name@example.com"
        keyboardType="email-address"
        textContentType="emailAddress"
        autoComplete="email"
        error={errEmail}
        returnKeyType="next"
      />
      <Field
        label="비밀번호"
        value={password}
        onChangeText={setPassword}
        placeholder="비밀번호를 입력해 주세요"
        secure
        textContentType="password"
        autoComplete="password"
        error={errPw}
        returnKeyType="done"
        onSubmitEditing={submit}
      />
      <FormError message={formError} />
    </AuthScreen>
  );
}
