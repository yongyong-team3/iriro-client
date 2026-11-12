// 회원가입·로그인 API — 백엔드 명세(AUTH, 설계 초안 2026-11-08) 기준
//
//   POST /api/v1/auth/login         소셜   { provider: KAKAO|NAVER|GOOGLE, providerToken }
//                                   → { accessToken, refreshToken, tokenType, ...ExpiresInSeconds, isNewMember, member }
//   POST /api/v1/auth/email/login   이메일 { email, password } → 위와 같음 (isNewMember 없음)
//   POST /api/v1/auth/signup        { email, password, memberName } → { memberId, email, memberName }  ※ 토큰 없음 → 바로 이메일 로그인
//   POST /api/v1/auth/reissue       { refreshToken } → 새 accessToken·refreshToken
//   POST /api/v1/auth/logout        { refreshToken } → { loggedOut }
//   member = { memberId, memberName, profileImageUrl|null }
//
// 회원(USER) 명세 2026-11-09:
//   GET    /api/v1/users/me                     내 정보 { memberId, memberName, email, profileImageUrl, totalActivityCount,
//                                                totalDistanceMeters, earnedBadgeCount, unreadNotificationCount }
//   PATCH  /api/v1/users/me { memberName }       닉네임 변경 (한글·영문·숫자 2~12자, 공백 X) 400 INVALID_MEMBER_NAME / 409 DUPLICATE_MEMBER_NAME
//   DELETE /api/v1/users/me                     회원 탈퇴 → 204 (계정·소셜 연결·토큰·기기·GPS 기록 삭제)
//   GET    /api/v1/users/nickname-availability?memberName=  (인증 불필요) → { memberName, available }
//
// 응답 형식이 두 가지(공통 규칙 code/message/data, 예시 success/data/message)라 둘 다 읽어요.
// 성공·실패는 HTTP 상태 코드로 판단하고, 값은 항상 json.data, 오류 문구는 json.message 에서 가져와요.

import { USE_MOCK } from './client';
import { getKV, setKV } from '../lib/kv';

// .env 의 EXPO_PUBLIC_API_BASE 는 'https://백엔드주소/api' 형태 (client.js 와 같은 값)
const V1 = `${process.env.EXPO_PUBLIC_API_BASE ?? ''}/v1`;

export class ApiError extends Error {
  constructor(message, { status, code, errors } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.errors = errors;
  }
}

// ── 토큰 보관 (Auth 컨텍스트가 저장소와 연결) ──────────────────
let session = null; // { accessToken, refreshToken }
let onSessionChange = () => {};
export function bindSession(initial, listener) {
  session = initial;
  onSessionChange = listener;
}
function setSession(next) {
  session = next;
  onSessionChange(next);
}

async function raw(path, { method = 'GET', body, auth = false, token, headers: extra } = {}) {
  const bearer = token ?? (auth ? session?.accessToken : null);
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  let res;
  try {
    res = await fetch(`${V1}${path}`, {
      method,
      headers: {
        // 사진 올리기(FormData)는 Content-Type 을 비워 둬야 fetch 가 multipart 경계값을 붙여요
        ...(isForm ? {} : { 'Content-Type': 'application/json' }),
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
        ...(extra ?? {}), // 예: Idempotency-Key (ACT-01)
      },
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
    });
  } catch {
    throw new ApiError('서버에 연결할 수 없어요. 네트워크를 확인해 주세요.');
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    throw new ApiError(json.message || MESSAGES[res.status] || `요청에 실패했어요 (${res.status})`, {
      status: res.status,
      code: json.code,
      errors: json.errors,
    });
  }
  return json.data;
}

const MESSAGES = {
  400: '요청 정보를 확인해 주세요.',
  401: '인증 정보가 유효하지 않아요.',
  403: '이용할 수 없는 계정이에요.',
  409: '요청을 처리할 수 없어요.',
  503: '소셜 로그인 서비스를 지금 사용할 수 없어요.',
};

// Access Token(30분)이 만료되면 한 번만 재발급하고 다시 시도
let reissuing = null;
async function reissue() {
  if (!session?.refreshToken) throw new ApiError('다시 로그인해 주세요.', { status: 401 });
  reissuing ??= raw('/auth/reissue', { method: 'POST', body: { refreshToken: session.refreshToken } })
    .then((d) => setSession({ accessToken: d.accessToken, refreshToken: d.refreshToken }))
    .catch((e) => {
      setSession(null); // 재발급 실패 → 로그아웃 처리
      throw e;
    })
    .finally(() => {
      reissuing = null;
    });
  return reissuing;
}

/** 로그인이 필요한 API 호출 (다른 API 파일에서도 이걸 쓰면 돼요) */
export async function authed(path, opts = {}) {
  try {
    return await raw(path, { ...opts, auth: true });
  } catch (e) {
    if (e.status !== 401) throw e;
    await reissue();
    return raw(path, { ...opts, auth: true });
  }
}

// 백엔드 응답 → 앱 안에서 쓰는 모양
const toUser = (member, provider, { isNewMember } = {}) => ({
  id: member.memberId,
  // 소셜 신규 회원은 memberName 이 제공자 이름(실명일 수 있음)이라 닉네임 설정 화면을 거쳐요
  nickname: isNewMember ? null : member.memberName,
  profileImageUrl: member.profileImageUrl ?? null,
  email: member.email ?? null,
  provider,
});
const accept = (d, provider) => {
  setSession({ accessToken: d.accessToken, refreshToken: d.refreshToken });
  return { user: toUser(d.member, provider, d) };
};

// ── 목업 (EXPO_PUBLIC_USE_MOCK 기본 true, 기기 안 가짜 계정) ─────────
const MOCK_USERS = 'mock-users';
const wait = (ms = 400) => new Promise((r) => setTimeout(r, ms));
const mockTokens = (id) => ({ accessToken: `mock.${id}.${Date.now()}`, refreshToken: `mock-r.${id}` });
const strip = ({ password, ...rest }) => rest;

const mock = {
  async emailLogin({ email, password }) {
    await wait();
    const u = (getKV(MOCK_USERS, []) || []).find((x) => x.email === email.toLowerCase());
    if (!u || u.password !== password) throw new ApiError('이메일 또는 비밀번호가 맞지 않아요.', { status: 401 });
    return { ...mockTokens(u.id), member: { memberId: u.id, memberName: u.nickname, profileImageUrl: null } };
  },
  async signup({ email, password, memberName }) {
    await wait();
    const users = getKV(MOCK_USERS, []) || [];
    if (users.some((x) => x.email === email.toLowerCase())) {
      throw new ApiError('이미 가입된 이메일이에요.', { status: 409, code: 'DUPLICATE_EMAIL' });
    }
    if (!(await mock.nameAvailable(memberName))) {
      throw new ApiError('이미 사용 중인 닉네임이에요.', { status: 409, code: 'DUPLICATE_MEMBER_NAME' });
    }
    const u = { id: Date.now(), email: email.toLowerCase(), password, nickname: memberName, provider: 'email' };
    setKV(MOCK_USERS, [...users, u]);
    return { memberId: u.id, email: u.email, memberName };
  },
  async social(provider) {
    await wait(600);
    const users = getKV(MOCK_USERS, []) || [];
    let u = users.find((x) => x.provider === provider);
    const isNewMember = !u?.nickname;
    if (!u) {
      u = { id: Date.now(), email: null, nickname: null, provider };
      setKV(MOCK_USERS, [...users, u]);
    }
    return { ...mockTokens(u.id), isNewMember, member: { memberId: u.id, memberName: u.nickname ?? '김소은', profileImageUrl: null } };
  },
  async nameAvailable(name) {
    await wait(250);
    const users = getKV(MOCK_USERS, []) || [];
    return !['관리자', 'admin', '용인시'].includes(name.toLowerCase()) && !users.some((x) => x.nickname?.toLowerCase() === name.toLowerCase());
  },
  async me() {
    await wait(200);
    const id = Number(session?.accessToken?.split('.')[1]);
    const u = (getKV(MOCK_USERS, []) || []).find((x) => x.id === id);
    if (!u) throw new ApiError('인증 정보를 확인해 주세요.', { status: 401, code: 'UNAUTHORIZED' });
    return { memberId: u.id, memberName: u.nickname, email: u.email ?? null, profileImageUrl: null, totalActivityCount: 0, totalDistanceMeters: 0, earnedBadgeCount: 0, unreadNotificationCount: 0 };
  },
  async withdraw() {
    await wait();
    const id = Number(session?.accessToken?.split('.')[1]);
    setKV(MOCK_USERS, (getKV(MOCK_USERS, []) || []).filter((x) => x.id !== id));
  },
  async updateMe(patch) {
    await wait();
    const id = Number(session?.accessToken?.split('.')[1]);
    const others = (getKV(MOCK_USERS, []) || []).filter((x) => x.id !== id);
    if (others.some((x) => x.nickname?.toLowerCase() === patch.memberName.toLowerCase())) {
      throw new ApiError('이미 사용 중인 닉네임입니다.', { status: 409, code: 'DUPLICATE_MEMBER_NAME' });
    }
    const users = (getKV(MOCK_USERS, []) || []).map((x) => (x.id === id ? { ...x, nickname: patch.memberName } : x));
    setKV(MOCK_USERS, users);
    const u = users.find((x) => x.id === id);
    return { memberId: u.id, memberName: u.nickname, profileImageUrl: null };
  },
};

// ── 화면에서 쓰는 함수 ─────────────────────────────────
export async function login(email, password) {
  const d = USE_MOCK ? await mock.emailLogin({ email, password }) : await raw('/auth/email/login', { method: 'POST', body: { email, password } });
  const r = accept(d, 'email');
  r.user.email = email;
  return r;
}

/** 가입 응답엔 토큰이 없어서 성공하면 바로 이메일 로그인까지 이어서 해요 */
export async function signup(email, password, nickname) {
  const body = { email, password, memberName: nickname };
  if (USE_MOCK) await mock.signup(body);
  else await raw('/auth/signup', { method: 'POST', body });
  return login(email, password);
}

/**
 * 소셜 로그인. providerToken = 카카오/네이버 SDK 로그인으로 받은 Access Token.
 * provider 는 앱 안에서 'kakao' | 'naver' | 'apple', 서버로는 대문자로 보내요.
 */
export async function oauthLogin(provider, providerToken) {
  const d = USE_MOCK
    ? await mock.social(provider)
    : await raw('/auth/login', { method: 'POST', body: { provider: provider.toUpperCase(), providerToken } });
  return accept(d, provider);
}

export async function isNicknameAvailable(nickname) {
  if (USE_MOCK) return mock.nameAvailable(nickname);
  return (await raw(`/users/nickname-availability?memberName=${encodeURIComponent(nickname)}`)).available;
}

export async function updateMe(patch) {
  const body = { memberName: patch.nickname };
  const m = USE_MOCK ? await mock.updateMe(body) : await authed('/users/me', { method: 'PATCH', body });
  return m;
}

/** 내 정보 (USER-01). 이메일은 소셜 제공자가 안 주면 null */
export async function getMe() {
  return USE_MOCK ? mock.me() : authed('/users/me');
}

/** 회원 탈퇴 (USER-04, 204) → 기기의 토큰도 지워서 로그인 화면으로 */
export async function withdraw() {
  if (USE_MOCK) await mock.withdraw();
  else await authed('/users/me', { method: 'DELETE' });
  setSession(null);
}

export async function logout() {
  const prev = session;
  setSession(null);
  if (USE_MOCK || !prev?.refreshToken) return;
  // 서버 처리가 실패해도 기기에서는 로그아웃 (토큰은 이미 지웠어요)
  await raw('/auth/logout', { method: 'POST', body: { refreshToken: prev.refreshToken }, token: prev.accessToken }).catch(() => {});
}
