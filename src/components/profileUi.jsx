// 프로필 사진: 직접 고른 사진(이 기기에만 저장) → 서버 사진 → 기본 마스코트
import { Image, View } from 'react-native';
import { useAuth } from '../context/Auth';
import { R } from './recUi';

export const MASCOT = require('../../assets/profile/mascot.png');

export function Avatar({ size = 88, uri }) {
  const { user } = useAuth();
  const src = uri ?? user?.localPhoto ?? user?.profileImageUrl;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: R.white, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
      {src ? (
        <Image source={{ uri: src }} style={{ width: size, height: size }} />
      ) : (
        <Image source={MASCOT} style={{ width: size * 0.82, height: size * 0.82 * (467 / 383) }} resizeMode="contain" accessibilityLabel="기본 프로필 마스코트" />
      )}
    </View>
  );
}

export const providerLabel = (p) => ({ email: '이메일 로그인', kakao: '카카오 로그인', naver: '네이버 로그인', apple: 'Apple 로그인', google: 'Google 로그인' })[p] ?? '로그인';
