// 앱 전체 글자: react-native 의 Text · TextInput 대신 이것을 써요.
//   fontWeight 에 맞는 Pretendard 파일을 붙이고, 같은 굵기를 한 번 더 두껍게 그리지 않게 fontWeight 는 지워요.
//   글자 안의 글자(<Text> 안 <Text>)는 굵기를 따로 정하지 않으면 바깥 글자를 그대로 따라가요.
import { createContext, useContext } from 'react';
import { StyleSheet, Text as RNText, TextInput as RNTextInput } from 'react-native';
import { fontFor, fontsReady } from '../lib/fonts';

const InText = createContext(false);

function fontStyle(style, nested) {
  if (!fontsReady()) return null;
  const f = StyleSheet.flatten(style) ?? {};
  if (f.fontFamily) return null; // 직접 정한 글꼴은 그대로
  if (nested && f.fontWeight == null) return null; // 바깥 글자를 따라감
  return { fontFamily: fontFor(f.fontWeight), fontWeight: 'normal' };
}

export function Text({ style, ...props }) {
  const nested = useContext(InText);
  const extra = fontStyle(style, nested);
  const el = <RNText {...props} style={extra ? [style, extra] : style} />;
  return nested ? el : <InText.Provider value>{el}</InText.Provider>;
}

export function TextInput({ style, ...props }) {
  const extra = fontStyle(style, false);
  return <RNTextInput {...props} style={extra ? [style, extra] : style} />;
}
