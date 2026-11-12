// 로그인 상태 — 토큰(Access·Refresh)은 기기 보안 저장소(expo-secure-store), 웹 미리보기는 일반 저장소
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as api from '../api/auth';
import { unregisterDevice } from '../api/me';
import { getKV, setKV } from '../lib/kv';

const SESSION_KEY = 'auth.session'; // { accessToken, refreshToken }
const USER_KEY = 'auth-user';

const store = {
  get: async () => {
    const v = Platform.OS === 'web' ? getKV(SESSION_KEY, null) : await SecureStore.getItemAsync(SESSION_KEY);
    return typeof v === 'string' ? JSON.parse(v) : v;
  },
  set: (s) => {
    if (Platform.OS === 'web') return Promise.resolve(setKV(SESSION_KEY, s));
    return s ? SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(s)) : SecureStore.deleteItemAsync(SESSION_KEY);
  },
};

const AuthContext = createContext(null);

// 서버에서 받아 둔 내 데이터는 로그아웃·탈퇴하면 지워요 (다음 사람에게 보이지 않게)
const clearServerCache = () => ['srv-activities', 'srv-notifications'].forEach((k) => setKV(k, null));

export function AuthProvider({ children }) {
  const [status, setStatus] = useState('loading'); // loading | signedOut | signedIn
  const [user, setUser] = useState(null);

  // api 쪽에서 토큰이 바뀌면(재발급·만료) 저장소에 반영, 사라지면 로그아웃 상태로
  const onSession = useCallback((s) => {
    store.set(s).catch(() => {});
    if (!s) {
      setKV(USER_KEY, null);
      setUser(null);
      setStatus('signedOut');
    }
  }, []);

  useEffect(() => {
    (async () => {
      let s = null;
      try {
        s = await store.get();
      } catch {
        // 저장소를 못 읽으면 로그아웃 상태로 시작
      }
      const u = getKV(USER_KEY, null);
      api.bindSession(s && u ? s : null, onSession);
      if (s && u) {
        setUser(u);
        setStatus('signedIn');
      } else {
        setStatus('signedOut');
      }
    })();
  }, [onSession]);

  const accept = useCallback(({ user: u }) => {
    setKV(USER_KEY, u);
    setUser(u);
    setStatus('signedIn');
    return u;
  }, []);

  const value = useMemo(
    () => ({
      status,
      user,
      needsNickname: status === 'signedIn' && !user?.nickname,
      loginWithEmail: async (email, password) => accept(await api.login(email.trim(), password)),
      signupWithEmail: async (email, password, nickname) => accept(await api.signup(email.trim(), password, nickname?.trim())),
      loginWithSocial: async (provider, providerToken) => accept(await api.oauthLogin(provider, providerToken)),
      setNickname: async (nickname) => {
        const m = await api.updateMe({ nickname });
        const u = { ...user, nickname: m?.memberName ?? nickname, profileImageUrl: m?.profileImageUrl ?? user?.profileImageUrl ?? null };
        setKV(USER_KEY, u);
        setUser(u);
        return u;
      },
      // 내 정보 다시 받기 (GET /users/me) — 닉네임·이메일을 최신으로
      refreshMe: async () => {
        const m = await api.getMe();
        const cur = getKV(USER_KEY, null) ?? {}; // 오래된 화면에서 불러도 최신 값 위에 덮어쓰기
        const u = { ...cur, nickname: m.memberName ?? cur.nickname ?? null, email: m.email ?? cur.email ?? null, profileImageUrl: m.profileImageUrl ?? null, summary: m };
        setKV(USER_KEY, u);
        setUser(u);
        return u;
      },
      // 프로필 사진은 아직 서버에 올리는 API가 없어서 이 기기에만 저장해요
      setLocalPhoto: (uri) => {
        const u = { ...(getKV(USER_KEY, null) ?? {}), localPhoto: uri };
        setKV(USER_KEY, u);
        setUser(u);
      },
      withdraw: async () => {
        await api.withdraw(); // 탈퇴 후 토큰이 지워져 로그인 화면으로
        clearServerCache();
      },
      logout: async () => {
        await unregisterDevice(); // NOTI-06 이 기기 푸시 해제 (등록된 적 있을 때만)
        clearServerCache();
        return api.logout(); // 토큰이 지워지면 onSession 에서 로그아웃 상태로 바뀌어요
      },
    }),
    [status, user, accept],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
