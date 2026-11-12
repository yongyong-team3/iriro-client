// 앱 뼈대: 진입 화면 → (로그인 전) 로그인·회원가입 / (닉네임 없음) 닉네임 설정 / (로그인 후) 하단 탭
import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { FONT_FILES, setFontsReady } from '../lib/fonts';
import { initKV } from '../lib/kv';
import { AppStateProvider } from '../context/AppState';
import { AuthProvider, useAuth } from '../context/Auth';
import Splash from '../components/Splash';
import { DemoPopup } from '../components/DemoBanner';

const SPLASH_MIN_MS = 1200;

function RootStack() {
  const { status, needsNickname } = useAuth();
  const [minDone, setMinDone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMinDone(true), SPLASH_MIN_MS);
    return () => clearTimeout(t);
  }, []);

  // 앱을 처음 열 때 주소가 '/'(지도)라도 로그인 전이면 로그인 화면으로 보내기
  const segments = useSegments();
  const router = useRouter();
  const ready = status !== 'loading' && minDone;
  useEffect(() => {
    if (!ready) return;
    const group = segments[0];
    if (status !== 'signedIn') {
      if (group !== '(auth)') router.replace('/login');
    } else if (needsNickname) {
      if (group !== 'nickname') router.replace('/nickname');
    } else if (group === '(auth)' || group === 'nickname') {
      router.replace('/');
    }
  }, [ready, status, needsNickname, segments, router]);

  if (!ready) {
    return (
      <>
        <StatusBar style="light" />
        <Splash />
      </>
    );
  }

  const signedIn = status === 'signedIn';
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={signedIn && !needsNickname}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="search" />
          <Stack.Screen name="river/[id]" />
          <Stack.Screen name="course/[id]" />
          <Stack.Screen name="detour/[id]" />
          <Stack.Screen name="activity/result" />
          <Stack.Screen name="activity/saved" options={{ gestureEnabled: false }} />
          <Stack.Screen name="records/index" />
          <Stack.Screen name="records/[id]" />
          <Stack.Screen name="badges" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="notification-settings" />
          <Stack.Screen name="account" />
          <Stack.Screen name="withdraw" />
        </Stack.Protected>
        <Stack.Protected guard={signedIn && needsNickname}>
          <Stack.Screen name="nickname" />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
      {signedIn && !needsNickname ? <DemoPopup /> : null}
    </>
  );
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  // Pretendard 글꼴: 다 불러오거나 실패할 때까지 진입 화면을 보여줘요 (실패하면 기본 글꼴)
  const [fontsLoaded, fontError] = useFonts(FONT_FILES);
  const fontsDone = fontsLoaded || !!fontError;
  setFontsReady(fontsLoaded && !fontError);

  // 기기 저장소(즐겨찾기·기록·제보·로그인 정보)를 먼저 불러온 뒤 화면 표시
  useEffect(() => {
    initKV().finally(() => setReady(true));
  }, []);

  return (
    <SafeAreaProvider>
      {ready && fontsDone ? (
        <AuthProvider>
          <AppStateProvider>
            <RootStack />
          </AppStateProvider>
        </AuthProvider>
      ) : (
        <Splash />
      )}
    </SafeAreaProvider>
  );
}
