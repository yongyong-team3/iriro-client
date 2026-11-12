// 이메일 가입 1단계(이메일·비밀번호·동의)에서 2단계(닉네임)로 넘기는 값.
// 비밀번호가 들어 있어서 주소(라우트 파라미터)나 저장소에 두지 않고 메모리에만 잠깐 둬요.
let pending = null;
export const setPendingSignup = (v) => {
  pending = v;
};
export const getPendingSignup = () => pending;
export const clearPendingSignup = () => {
  pending = null;
};
