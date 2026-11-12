// 로그인 전 화면 묶음: 로그인 선택 → 이메일 로그인 / 회원가입
import { Stack } from 'expo-router';

// SDK 58: initialRouteName 대신 anchor
export const unstable_settings = { anchor: 'login' };

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FFFFFF' } }} />;
}
