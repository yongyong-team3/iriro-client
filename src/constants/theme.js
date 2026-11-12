// 디자인 시스템: Stitch "Calm Wireframe Clarity" 보드 기준 (2026-11-05)
// Primary #0F172A · Secondary #475569 · Surface #E2E8F0 · Accent #0284C7
// 버튼·칩은 알약 모양(radius 9999), 카드는 둥근 모서리(16~24)
import { COLOR } from './colors';

// 예전 화면(구간 시트·수위 그래프 등)이 쓰는 이름. 값은 colors.js 로 통일했어요.
export const C = {
  // 상태 선 색 (지도·점). 배지용 연한 색은 constants/status.js 참고
  ok: COLOR.ok, // emerald-500
  warn: COLOR.warn, // amber-500
  danger: COLOR.danger, // rose-600
  unknown: COLOR.unknown, // slate-400
  history: '#6366F1', // indigo-500 (과거 침수 이력)
  citizen: '#7C3AED', // violet-600 (시민 제보)

  ink: COLOR.ink, // Primary
  ink2: COLOR.text, // Secondary
  muted: COLOR.sub, // slate-500
  line: COLOR.line, // Surface (테두리·구분선)
  surface: '#FFFFFF',
  surface2: COLOR.fill, // 화면 배경 (slate-50)
  fill: COLOR.fill, // 카드 안 회색 면 (slate-100)
  accent: COLOR.brand, // Accent
  accentSoft: COLOR.brandSoft, // sky-100

  // 회원가입·로그인 시안 (Figma 2026-11-08): 진입 화면 배경 #3993D4
  brand: COLOR.brand,
  brandSoft: COLOR.brandSoft, // 뒤로가기 원 배경
  authInk: COLOR.ink, // 제목·레이블
  authLine: COLOR.line, // 입력칸 테두리
  authHint: COLOR.hint, // 입력 안내(placeholder)
  authSub: COLOR.text, // 로그인 선택 부제
  authMeta: COLOR.sub, // 구분선·하단 링크
  kakao: '#F8CE46', // 시안 색 (2026-11-11 사용자 지시로 시안대로 · 흰 아이콘·글자)
  naver: '#78D98A', // 시안 색 (2026-11-11 사용자 지시로 시안대로 · 흰 아이콘·글자)
  apple: '#000000',
  danger2: COLOR.danger, // 입력 오류 문구
};

// 앱 이름이 확정되면 여기만 바꾸세요 (가도돼용 / 이리로)
export const APP_NAME = '이리로';

export const shadow = {
  shadowColor: COLOR.ink,
  shadowOpacity: 0.08,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 4 },
  elevation: 4,
};

export const radius = 20; // 카드
export const pill = 9999; // 버튼·칩·배지
