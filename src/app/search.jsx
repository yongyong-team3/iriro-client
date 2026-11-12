// 하천길 검색 (홈 2차 시안)
//   회색 둥근 입력칸(‹ 뒤로 · 지우기 ⓧ) / '주변 하천 · 구간을 찾아보세요' | ★ 저장
//   결과: 하천길(→ 구간 상태)과 코스(→ 코스 화면). ★ 저장을 켜면 즐겨찾기한 코스만.
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '../components/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAppState } from '../context/AppState';
import { searchTrails } from '../api/trails';
import { G2, H, Icon } from '../components/homeUi';

const norm = (t) => (t ?? '').replace(/\s|→/g, '');

export default function Search() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { now, courses, favorites, loadTrail } = useAppState();
  const [q, setQ] = useState('');
  const [saved, setSaved] = useState(false);
  // 화면이 열리면 바로 입력칸에 커서 + 키보드 (안드로이드는 autoFocus 가 가끔 안 먹어서 한 번 더)
  const input = useRef(null);
  useEffect(() => {
    const t = setTimeout(() => input.current?.focus(), 350);
    return () => clearTimeout(t);
  }, []);
  const [trails, setTrails] = useState(null); // null = 검색 중
  const [err, setErr] = useState(null);

  // 입력이 멈추고 0.25초 뒤 검색 (GET /trails/search)
  useEffect(() => {
    if (saved) return;
    let alive = true;
    const t = setTimeout(() => {
      searchTrails(q, { time: now })
        .then((r) => alive && (setTrails(r), setErr(null)))
        .catch((e) => alive && setErr(e.message));
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q, now, saved]);

  const query = norm(q);
  const courseHits = (courses ?? []).filter(
    (c) => (!saved || favorites.includes(c.id)) && (!query || norm(`${c.name}${c.trailName}${c.direction}`).includes(query)),
  );
  const trailHits = saved ? [] : (trails ?? []);
  const nothing = !saved && trails !== null && trailHits.length === 0 && courseHits.length === 0;

  return (
    <View style={{ flex: 1, backgroundColor: H.white, paddingTop: Math.max(insets.top, 59) + 14 }}>
      <View style={s.input}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button" accessibilityLabel="뒤로 가기" style={s.back}>
          <Icon name="backSearch" />
        </Pressable>
        <TextInput
          ref={input}
          value={q}
          onChangeText={setQ}
          placeholder="하천·다리·코스 이름"
          placeholderTextColor="#9AA1A8"
          style={s.inputText}
          autoFocus
          returnKeyType="search"
          onSubmitEditing={() => trailHits[0] && router.push(`/river/${trailHits[0].id}`)}
          selectionColor={H.brand}
        />
        {q ? (
          <Pressable onPress={() => setQ('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="지우기">
            <Icon name="clear" />
          </Pressable>
        ) : null}
      </View>

      <View style={s.helpRow}>
        <Text style={s.help}>주변 하천 · 구간을 찾아보세요</Text>
        <View style={s.divider} />
        <Pressable
          onPress={() => setSaved((v) => !v)}
          style={s.saveBtn}
          hitSlop={8}
          accessibilityRole="switch"
          accessibilityState={{ checked: saved }}
          accessibilityLabel="저장한 코스만 보기"
        >
          <Icon name="starSmall" color={saved ? undefined : H.hint} />
          <Text style={[s.save, saved && { color: H.brand, fontWeight: '700' }]}>저장</Text>
        </Pressable>
      </View>
      <View style={s.bar} />

      <ScrollView contentContainerStyle={{ paddingHorizontal: 21.5, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {err && <Text style={s.empty}>검색하지 못했어요. {err}</Text>}
        {!saved && trails === null && !err && <Text style={s.empty}>찾는 중…</Text>}
        {nothing && <Text style={s.empty}>'{q}'에 맞는 하천·구간이 없어요.</Text>}
        {saved && courseHits.length === 0 && <Text style={s.empty}>저장한 코스가 없어요. 코스 화면에서 ☆를 눌러 저장해 보세요.</Text>}

        {trailHits.map((t) => (
          <Row
            key={`t-${t.id}`}
            title={t.name}
            onPress={() => {
              loadTrail(t.id, t);
              router.push(`/river/${t.id}`);
            }}
          />
        ))}
        {courseHits.map((c) => (
          <Row key={`c-${c.id}`} title={c.name} sub={`${c.trailName ?? ''} · ${c.direction}`} onPress={() => router.push(`/course/${c.id}`)} />
        ))}
      </ScrollView>
    </View>
  );
}

function Row({ title, sub, onPress }) {
  return (
    <Pressable style={({ pressed }) => [s.row, pressed && { opacity: 0.7 }]} onPress={onPress} accessibilityRole="button">
      <Icon name="pinCircle" />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={s.rowTitle}>{title}</Text>
        {sub ? <Text style={s.rowSub}>{sub}</Text> : null}
      </View>
      <Icon name="chevronRight" size={10.5} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  // 시안: #EFEFEF 352×46 모서리 23, 왼쪽 18
  input: { marginHorizontal: 18, height: 46, borderRadius: 23, backgroundColor: H.fill, flexDirection: 'row', alignItems: 'center', paddingLeft: 17, paddingRight: 15 },
  back: { width: 20, alignItems: 'flex-start' },
  inputText: { flex: 1, fontSize: 15, color: '#000', marginLeft: 4, height: '100%', outlineStyle: 'none' },
  helpRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, marginLeft: 32.5, marginRight: 22 },
  help: { flex: 1, fontSize: 12, color: H.sub },
  divider: { width: 1, height: 13, backgroundColor: H.line, marginRight: 10 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  save: { fontSize: 12, color: G2.text },
  bar: { height: 3, backgroundColor: H.fill, marginTop: 12 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 20, paddingLeft: 4.5, paddingRight: 18, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: H.line },
  rowTitle: { fontSize: 15, fontWeight: '600', color: H.ink },
  rowSub: { fontSize: 12, color: H.sub, marginTop: 4 },
  empty: { color: H.sub, fontSize: 13, paddingVertical: 18, textAlign: 'center' },
});
