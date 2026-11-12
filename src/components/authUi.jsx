// 회원가입·로그인 화면 공통 부품 (시안 393×852 기준, 흰 배경)
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput } from './AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { C } from '../constants/theme';
import { BACK_ARROW } from '../constants/authPaths';

/** Figma에서 뽑은 벡터(글씨 윤곽선 등)를 원래 크기 그대로 그려요 */
export function VectorArt({ art, scale = 1, color }) {
  return (
    <Svg width={art.w * scale} height={art.h * scale} viewBox={`${art.x} ${art.y} ${art.w} ${art.h}`}>
      <Path d={art.d} fill={color || art.fill} />
    </Svg>
  );
}

// 시안 좌표(393×852, 상태바 59 포함)를 그대로 따라요:
//   ← 화살표 top 85 · left 35 / 제목 top 154 / 첫 입력 라벨 top contentTop(기본 229)
const STATUS = 59;
const TITLE_TOP = 154;

export function AuthScreen({ titleArt, back = true, onBack, contentTop = 229, gap = 19, children, footer }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const canBack = back && (onBack || router.canGoBack());
  const titleBottom = TITLE_TOP + (titleArt ? titleArt.h : 0);
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#FFFFFF' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[s.wrap, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 34) + 65 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* 뒤로 가기: 화살표 23×12 (시안 top 85, left 35) — 누르는 영역은 44×44 */}
        <View style={{ height: TITLE_TOP - STATUS }}>
          {canBack ? (
            <Pressable
              onPress={onBack || (() => router.back())}
              style={[s.backBtn, { marginTop: 85 + BACK_ARROW.h / 2 - 22 - STATUS }]}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="뒤로 가기"
            >
              <VectorArt art={BACK_ARROW} />
            </Pressable>
          ) : null}
        </View>
        {titleArt ? (
          <View style={{ marginLeft: 1 }}>
            <VectorArt art={titleArt} />
          </View>
        ) : null}
        <View style={{ gap, marginTop: contentTop - titleBottom }}>{children}</View>
        <View style={{ flex: 1, minHeight: 24 }} />
        {footer}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function Field({ label, error, hint, secure, right, ...input }) {
  const [hidden, setHidden] = useState(!!secure);
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 9 }}>
      <Text style={s.label}>{label}</Text>
      <View style={[s.inputBox, focused && { borderColor: C.brand }, error && { borderColor: C.danger2 }]}>
        <TextInput
          style={s.input}
          placeholderTextColor={C.authHint}
          secureTextEntry={hidden}
          autoCapitalize="none"
          autoCorrect={false}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...input}
        />
        {secure ? (
          <Pressable onPress={() => setHidden((v) => !v)} hitSlop={8} accessibilityRole="button" accessibilityLabel={hidden ? '비밀번호 보기' : '비밀번호 숨기기'}>
            <Text style={s.eye}>{hidden ? '보기' : '숨기기'}</Text>
          </Pressable>
        ) : (
          right
        )}
      </View>
      {error ? <Text style={s.error}>{error}</Text> : hint ? <Text style={s.hint}>{hint}</Text> : null}
    </View>
  );
}

export function PrimaryButton({ title, onPress, disabled, loading, style }) {
  const off = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      style={({ pressed }) => [s.primary, off && s.primaryOff, pressed && !off && { opacity: 0.85 }, style]}
    >
      {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.primaryText}>{title}</Text>}
    </Pressable>
  );
}

export function FormError({ message }) {
  if (!message) return null;
  return (
    <View style={s.formError}>
      <Text style={s.formErrorText}>{message}</Text>
    </View>
  );
}

// ── 입력 규칙 ────────────────────────────────────────────
export const rules = {
  email: (v) => (!v.trim() ? '이메일을 입력해 주세요.' : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? '' : '이메일 형식이 맞지 않아요.'),
  password: (v) =>
    !v ? '비밀번호를 입력해 주세요.' : v.length < 8 || !/[A-Za-z]/.test(v) || !/\d/.test(v) ? '영문과 숫자를 섞어 8자 이상 입력해 주세요.' : '',
  confirm: (v, pw) => (!v ? '비밀번호를 한 번 더 입력해 주세요.' : v !== pw ? '비밀번호가 서로 달라요.' : ''),
  nickname: (v) => {
    const t = v.trim();
    if (!t) return '닉네임을 입력해 주세요.';
    if (t.length < 2 || t.length > 12) return '2~12자로 입력해 주세요.';
    if (!/^[가-힣A-Za-z0-9]+$/.test(t)) return '한글, 영문, 숫자만 쓸 수 있어요. (띄어쓰기 X)';
    return '';
  },
};

const s = StyleSheet.create({
  // 시안: 좌우 여백 24, 입력칸 345×56, 버튼 345×56 (radius 28)
  wrap: { flexGrow: 1, paddingHorizontal: 24 },
  backBtn: { width: 44, height: 44, marginLeft: 35 - 24 - (44 - BACK_ARROW.w) / 2, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 14, lineHeight: 17, fontWeight: '500', color: C.authInk },
  inputBox: { flexDirection: 'row', alignItems: 'center', height: 56, borderRadius: 14, borderWidth: 1, borderColor: C.authLine, paddingHorizontal: 16, backgroundColor: '#FFFFFF' },
  input: { flex: 1, fontSize: 16, color: C.authInk, height: '100%' },
  eye: { fontSize: 14, fontWeight: '500', color: C.brand, minWidth: 40, textAlign: 'right', marginRight: 12 },
  error: { fontSize: 12.5, color: C.danger2 },
  hint: { fontSize: 12.5, color: C.authHint },
  primary: { height: 56, borderRadius: 28, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center' },
  primaryOff: { backgroundColor: '#B9D7EE' },
  primaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  link: { textAlign: 'center', fontSize: 14, lineHeight: 17, fontWeight: '500', color: C.brand },
  formError: { backgroundColor: '#FEF2F2', borderRadius: 12, padding: 12 },
  formErrorText: { color: C.danger2, fontSize: 13.5 },
});

/** 화면 아래쪽 버튼 + 텍스트 링크 (시안: 버튼 top 668, 링크 top 738) */
export function BottomActions({ children, link, onLink }) {
  return (
    <View style={{ gap: 16 }}>
      {children}
      {/* 링크가 없는 화면도 버튼 높이를 맞추려고 자리는 남겨 둬요 */}
      {link ? (
        <Pressable onPress={onLink} hitSlop={8} accessibilityRole="link">
          <Text style={s.link}>{link}</Text>
        </Pressable>
      ) : (
        <View style={{ height: 17 }} />
      )}
    </View>
  );
}
