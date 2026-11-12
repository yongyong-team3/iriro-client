// Pretendard 글꼴 (최종 시안 2026-11-11, 시안 글자 모양으로 추정)
//   Expo Go 에서는 한 글꼴에 굵기를 묶을 수 없어서, 굵기마다 이름을 따로 붙여 불러와요.
//   글자 스타일의 fontWeight 를 보고 components/AppText.jsx 가 알맞은 파일을 골라요.
//   라이선스: SIL OFL 1.1 (assets/fonts/LICENSE-Pretendard.txt)
// 글꼴을 다 불러왔을 때만 써요. 실패하면 기본 글꼴로 그대로 보여요.
let ready = false;

export const FONT_FILES = {
  'Pretendard-Regular': require('../../assets/fonts/Pretendard-Regular.otf'),
  'Pretendard-Medium': require('../../assets/fonts/Pretendard-Medium.otf'),
  'Pretendard-SemiBold': require('../../assets/fonts/Pretendard-SemiBold.otf'),
  'Pretendard-Bold': require('../../assets/fonts/Pretendard-Bold.otf'),
  'Pretendard-ExtraBold': require('../../assets/fonts/Pretendard-ExtraBold.otf'),
  // 결과 화면 영문·숫자 (시안 글자 모양으로 추정, OFL 1.1)
  'Montserrat-Medium': require('../../assets/fonts/Montserrat-Medium.ttf'),
  'Montserrat-SemiBold': require('../../assets/fonts/Montserrat-SemiBold.ttf'),
  'Montserrat-Bold': require('../../assets/fonts/Montserrat-Bold.ttf'),
};

/** 결과 화면용 Montserrat: 글꼴을 못 불러왔으면 undefined (기본 글꼴) */
export const mont = (w = 600) => (ready ? { fontFamily: { 500: 'Montserrat-Medium', 600: 'Montserrat-SemiBold', 700: 'Montserrat-Bold' }[w], fontWeight: 'normal' } : { fontWeight: String(w) });

const BY_WEIGHT = {
  100: 'Pretendard-Regular',
  200: 'Pretendard-Regular',
  300: 'Pretendard-Regular',
  400: 'Pretendard-Regular',
  normal: 'Pretendard-Regular',
  500: 'Pretendard-Medium',
  600: 'Pretendard-SemiBold',
  700: 'Pretendard-Bold',
  bold: 'Pretendard-Bold',
  800: 'Pretendard-ExtraBold',
  900: 'Pretendard-ExtraBold',
};

export const setFontsReady = (v) => (ready = !!v);
export const fontsReady = () => ready;

/** fontWeight → 글꼴 이름 */
export const fontFor = (weight) => BY_WEIGHT[String(weight ?? 400)] ?? BY_WEIGHT[400];
