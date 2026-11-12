// 닉네임 설정 — 소셜 로그인으로 처음 들어온 회원 (시안: "반가워요! 닉네임을 정해 주세요", '이리로 시작하기')
// ← 뒤로 가기는 로그아웃 후 로그인 선택 화면으로 돌아가요
import { useState } from 'react';
import { useAuth } from '../context/Auth';
import { isNicknameAvailable } from '../api/auth';
import { TITLE_NICKNAME } from '../constants/authPaths';
import { AuthScreen, BottomActions, Field, FormError, PrimaryButton, rules } from '../components/authUi';

export default function Nickname() {
  const { setNickname, logout } = useAuth();
  const [nickname, setNick] = useState('');
  const [touched, setTouched] = useState(false);
  const [taken, setTaken] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const err = taken || (touched ? rules.nickname(nickname) : '');

  const submit = async () => {
    setTouched(true);
    setFormError('');
    const v = nickname.trim();
    if (rules.nickname(v)) return;
    setLoading(true);
    try {
      if (!(await isNicknameAvailable(v))) {
        setTaken('이미 사용 중인 닉네임이에요.');
        return;
      }
      await setNickname(v); // 저장되면 지도 화면으로 자동 이동
    } catch (e) {
      setFormError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreen
      titleArt={TITLE_NICKNAME}
      onBack={logout}
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
