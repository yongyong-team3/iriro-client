// 이메일 가입 2단계 — 닉네임 (최종 시안: "반가워요! 닉네임을 정해 주세요", '이리로 시작하기')
//   1단계에서 받은 이메일·비밀번호와 닉네임을 합쳐 여기서 가입 요청(POST /auth/signup)을 보내요.
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/Auth';
import { isNicknameAvailable } from '../../api/auth';
import { updateNotificationSettings } from '../../api/me';
import { USE_MOCK } from '../../api/client';
import { TITLE_NICKNAME } from '../../constants/authPaths';
import { AuthScreen, BottomActions, Field, FormError, PrimaryButton, rules } from '../../components/authUi';
import { clearPendingSignup, getPendingSignup } from '../../lib/pendingSignup';

export default function SignupNickname() {
  const router = useRouter();
  const { signupWithEmail } = useAuth();
  const [nickname, setNick] = useState('');
  const [touched, setTouched] = useState(false);
  const [taken, setTaken] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // 1단계 값이 없으면(새로고침 등) 1단계로 돌아가요
  useEffect(() => {
    if (!getPendingSignup()) router.replace('/signup');
  }, [router]);

  const err = taken || (touched ? rules.nickname(nickname) : '');

  const submit = async () => {
    setTouched(true);
    setFormError('');
    const v = nickname.trim();
    const p = getPendingSignup();
    if (rules.nickname(v) || !p) return;
    setLoading(true);
    try {
      if (!(await isNicknameAvailable(v))) {
        setTaken('이미 사용 중인 닉네임이에요.');
        return;
      }
      await signupWithEmail(p.email, p.password, v); // 성공하면 지도 화면으로 자동 이동
      clearPendingSignup();
      // [선택] 긴급 알림 수신에 동의했으면 회복 예측 알림을 켜 둬요 (실패해도 가입은 그대로)
      if (p.alertConsent && !USE_MOCK) updateNotificationSettings({ recovery: true }).catch(() => {});
    } catch (e) {
      const code = String(e.code || '');
      if ((e.status === 409 || e.status === 400) && (/NAME|NICK/i.test(code) || e.message.includes('닉네임'))) setTaken(e.message);
      else if (e.status === 409 && (/EMAIL/i.test(code) || e.message.includes('이메일'))) setFormError(`${e.message} 앞 화면에서 이메일을 바꿔 주세요.`);
      else setFormError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreen
      titleArt={TITLE_NICKNAME}
      contentTop={283}
      footer={
        <BottomActions>
          <PrimaryButton title="이리로 시작하기" onPress={submit} loading={loading} />
        </BottomActions>
      }
    >
      <Field
        label="닉네임"
        value={nickname}
        onChangeText={(v) => {
          setNick(v);
          setTaken('');
        }}
        onBlur={() => setTouched(true)}
        placeholder="사용할 이름을 입력해 주세요"
        maxLength={12}
        error={err}
        returnKeyType="done"
        onSubmitEditing={submit}
      />
      <FormError message={formError} />
    </AuthScreen>
  );
}
