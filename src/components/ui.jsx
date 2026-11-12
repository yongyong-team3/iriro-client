// 여러 화면에서 쓰는 작은 UI 조각
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import { C } from '../constants/theme';
import { ACTIVITIES } from '../constants/status';

export function Dot({ color, size = 9 }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />;
}

export function SourceChip({ src }) {
  if (!src) return null;
  return (
    <View style={[s.chip, { backgroundColor: src.bg, borderColor: src.bd }]}>
      <Text style={[s.chipText, { color: src.fg }]}>{src.label}</Text>
    </View>
  );
}

// 상태 배지 (양호/주의/통제/정보 부족) — 디자인 시스템 '5. Status Badges'
export function StatusBadge({ status, large }) {
  const b = status.badge;
  return (
    <View style={[s.badge, large && s.badgeLg, { backgroundColor: b.bg, borderColor: b.bd }]}>
      <Text style={[s.badgeText, large && { fontSize: 13 }, { color: b.fg }]}>{status.label}</Text>
    </View>
  );
}

export function Tag({ text, fg, bg }) {
  return (
    <View style={[s.tag, { backgroundColor: bg }]}>
      <Text style={[s.tagText, { color: fg }]}>{text}</Text>
    </View>
  );
}

export function Button({ title, onPress, disabled, color = C.ink, style, textStyle, small }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        small ? s.btnSmall : s.btn,
        { backgroundColor: disabled ? '#CBD5E1' : color, opacity: pressed ? 0.85 : 1 },
        style,
      ]}
    >
      <Text style={[small ? s.btnSmallText : s.btnText, textStyle]}>{title}</Text>
    </Pressable>
  );
}

export function ActivityTabs({ value, onChange, disabled, floating }) {
  return (
    <View style={[s.seg, floating && s.segFloating]}>
      {Object.entries(ACTIVITIES).map(([k, v]) => {
        const on = k === value;
        return (
          <Pressable
            key={k}
            onPress={() => onChange(k)}
            disabled={disabled}
            style={[s.segBtn, on && (floating ? s.segOnDark : s.segOnLight), disabled && !on && { opacity: 0.4 }]}
          >
            <Text style={[s.segText, on && { color: floating ? '#fff' : C.ink }]}>
              {v.icon} {v.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SectionTitle({ children, sub }) {
  return (
    <Text style={s.section}>
      {children}
      {sub ? <Text style={s.sectionSub}>  {sub}</Text> : null}
    </Text>
  );
}

export const Empty = ({ children }) => <Text style={s.empty}>{children}</Text>;

const s = StyleSheet.create({
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3, alignSelf: 'flex-start' },
  chipText: { fontSize: 12, fontWeight: '700' },
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' },
  badgeLg: { paddingHorizontal: 12, paddingVertical: 5 },
  badgeText: { fontSize: 12, fontWeight: '800' },
  tag: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontSize: 12, fontWeight: '600' },
  btn: { borderRadius: 999, paddingVertical: 15, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 15.5, fontWeight: '800' },
  btnSmall: { borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 },
  btnSmallText: { color: '#fff', fontSize: 12.5, fontWeight: '700' },
  seg: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0', padding: 4, borderRadius: 999, gap: 4 },
  segFloating: { backgroundColor: 'rgba(255,255,255,0.96)' },
  segBtn: { flex: 1, paddingVertical: 9, borderRadius: 999, alignItems: 'center' },
  segOnDark: { backgroundColor: C.ink },
  segOnLight: { backgroundColor: '#fff' },
  segText: { fontSize: 14, fontWeight: '700', color: C.muted },
  section: { fontSize: 14, fontWeight: '800', color: C.ink, marginTop: 20, marginBottom: 8 },
  sectionSub: { fontSize: 12, fontWeight: '500', color: C.muted },
  empty: { fontSize: 13, color: C.muted, paddingVertical: 6 },
});
