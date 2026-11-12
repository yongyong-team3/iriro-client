// 프로필 수정 (시안 2026-11-09)
//   마스코트(✎) · 프로필 사진 변경 → 아래 시트(앨범에서 선택 / 기본 이미지로 변경 / 취소)
//   닉네임(n / 12, 2~12자) / 연결된 계정 / 저장하기 → PATCH /users/me { memberName }
//   ⚠ 프로필 사진 업로드 API는 아직 없어서 고른 사진은 이 기기에만 저장해요.
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '../components/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/Auth';
import { COLOR } from '../constants/colors';
import { isNicknameAvailable } from '../api/auth';
import { USE_MOCK } from '../api/client';
import { uploadProfilePhoto } from '../api/me';
import { rules } from '../components/authUi';
import { Avatar, providerLabel } from '../components/profileUi';
import { BottomSheet, Button, Card, Ic, R, SubHeader } from '../components/recUi';

const MAX = 12;

export default function ProfileEdit() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, setNickname, setLocalPhoto, refreshMe } = useAuth();
  const [name, setName] = useState(user?.nickname ?? '');
  const [photo, setPhoto] = useState(user?.localPhoto ?? null); // undefined 아님 = 바꾼 값
  const [sheet, setSheet] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const trimmed = name.trim();
  const nameChanged = trimmed !== (user?.nickname ?? '');
  const photoChanged = photo !== (user?.localPhoto ?? null);
  const invalid = rules.nickname(trimmed);

  const pickFromAlbum = async () => {
    setSheet(false);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('사진 접근 권한이 필요해요', '앨범에서 사진을 고르려면 사진 접근을 허용해 주세요.');
      return;
    }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (!r.canceled && r.assets?.[0]?.uri) setPhoto(r.assets[0].uri);
  };

  const save = async () => {
    if (invalid) return setErr(invalid);
    setBusy(true);
    setErr('');
    try {
      if (nameChanged) {
        if (!(await isNicknameAvailable(trimmed))) {
          setErr('이미 사용 중인 닉네임이에요.');
          return;
        }
        await setNickname(trimmed);
      }
      if (photoChanged) {
        if (USE_MOCK) setLocalPhoto(photo);
        else if (photo) {
          await uploadProfilePhoto(photo); // USER-03 POST /users/me/photo
          setLocalPhoto(null);
          await refreshMe().catch(() => {});
        } else {
          setErr('기본 이미지로 되돌리는 기능은 서버 준비 중이에요.');
          return;
        }
      }
      router.back();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: R.white }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SubHeader title="프로필 수정" subtitle="나를 나타내는 정보를 바꿔 보세요" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => setSheet(true)} style={s.avatarWrap} accessibilityRole="button" accessibilityLabel="프로필 사진 변경">
          <View>
            <Avatar size={92} uri={photo} />
            <View style={s.editBadge}>
              <Ic name="pencil" size={15} color={R.white} />
            </View>
          </View>
          <Text style={s.photoText}>프로필 사진 변경</Text>
        </Pressable>

        <Text style={s.label}>닉네임</Text>
        <View style={[s.input, err && { borderColor: R.red }]}>
          <TextInput
            value={name}
            onChangeText={(v) => {
              setName(v.replace(/\s/g, ''));
              setErr('');
            }}
            maxLength={MAX}
            placeholder="닉네임"
            placeholderTextColor={COLOR.hint}
            style={s.inputText}
            returnKeyType="done"
            onSubmitEditing={save}
            accessibilityLabel="닉네임"
          />
          <Text style={s.counter}>
            {trimmed.length} / {MAX}
          </Text>
        </View>
        <Text style={[s.help, err && { color: R.red }]}>{err || '2~12자로 입력해 주세요. (한글·영문·숫자)'}</Text>

        <Text style={[s.label, { marginTop: 36 }]}>연결된 계정</Text>
        <Card tone="gray" style={{ paddingVertical: 16 }}>
          <Text style={s.acct}>{providerLabel(user?.provider)}</Text>
          {user?.email ? <Text style={s.email}>{user.email}</Text> : null}
        </Card>
      </ScrollView>
      <View style={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 20 }}>
        <Button title={busy ? '저장 중…' : '저장하기'} onPress={save} disabled={busy || (!nameChanged && !photoChanged)} />
      </View>

      <BottomSheet visible={sheet} title="프로필 사진 변경" onClose={() => setSheet(false)}>
        <SheetRow title="앨범에서 선택" onPress={pickFromAlbum} />
        <SheetRow
          title="기본 이미지로 변경"
          onPress={() => {
            setPhoto(null);
            setSheet(false);
          }}
        />
        <Pressable onPress={() => setSheet(false)} style={{ alignItems: 'center', paddingVertical: 18 }} accessibilityRole="button">
          <Text style={{ fontSize: 13.5, color: R.sub }}>취소</Text>
        </Pressable>
      </BottomSheet>
    </KeyboardAvoidingView>
  );
}

function SheetRow({ title, onPress }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.sheetRow, pressed && { opacity: 0.8 }]} accessibilityRole="button">
      <Text style={s.sheetText}>{title}</Text>
      <Ic name="chevron" size={16} color={R.sub} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  avatarWrap: { alignItems: 'center', marginTop: 26 },
  editBadge: { position: 'absolute', right: -4, bottom: 0, width: 32, height: 32, borderRadius: 16, backgroundColor: R.brand, borderWidth: 2, borderColor: R.white, alignItems: 'center', justifyContent: 'center' },
  photoText: { fontSize: 12.5, color: R.brand, fontWeight: '600', marginTop: 12 },
  label: { fontSize: 14, fontWeight: '800', color: R.ink, marginTop: 40, marginBottom: 12 },
  input: { flexDirection: 'row', alignItems: 'center', height: 58, borderRadius: 14, borderWidth: 1, borderColor: R.line, paddingHorizontal: 16 },
  inputText: { flex: 1, fontSize: 15, color: R.ink, height: '100%', outlineStyle: 'none' },
  counter: { fontSize: 12, color: R.sub },
  help: { fontSize: 12, color: R.sub, marginTop: 10 },
  acct: { fontSize: 13, fontWeight: '600', color: R.ink },
  email: { fontSize: 12, color: R.sub, marginTop: 6 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: R.fill, borderRadius: 14, paddingHorizontal: 18, height: 56, marginBottom: 10 },
  sheetText: { fontSize: 14.5, fontWeight: '600', color: R.ink },
});
