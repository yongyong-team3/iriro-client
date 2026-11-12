// 마이페이지 (최종 시안 2026-11-11 · 수정본: 프로필 카드 단순화 · 배지 타일 · 진행 막대)
//   '마이페이지' / 프로필 카드(초록 띠 · 사진 · ○○ 님 · 오늘도 나만의 속도로 걸어가요 · 우리 동네 산책 친구 · 지역)
//   나의 배지(n / 전체) / 알림 설정(이리로 알림 · 기기 알림 권한) / 계정 관리(로그아웃 · 회원 탈퇴) / 바닥글
//   배지는 서버(BADGE-01)에 있는 것만 보여줘요. 시안의 배지 6개 중 서버에 없는 배지는 만들지 않았어요.
//   프로필 사진 '기본 이미지로 변경'은 보류 중이라 건드리지 않았어요(사진 배지는 프로필 수정 화면으로 가요).
import { useCallback, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../components/AppText';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/Auth';
import { useAppState } from '../../context/AppState';
import { useRecords } from '../../lib/records';
import { ART_OFF, ART_ON, useBadgeTiles } from '../../lib/badgeCatalog';
import { refreshNotifications, useNotifications } from '../../lib/notifications';
import { Avatar } from '../../components/profileUi';
import { ConfirmModal, Toggle } from '../../components/recUi';
import { Lettering } from '../../components/RecordCard';

const STATUS_TOP = 59;
const D = (n) =>
  ({
    banner: require('../../../assets/design/my_banner.png'),
    photo: require('../../../assets/design/ic_photo.png'),
    pin: require('../../../assets/design/ic_pin_small.png'),
    trophy: require('../../../assets/design/ic_trophy.png'),
    bell: require('../../../assets/design/ic_bell.png'),
    phone: require('../../../assets/design/ic_phone.png'),
    info: require('../../../assets/design/ic_info.png'),
    sliders: require('../../../assets/design/ic_sliders.png'),
    logout: require('../../../assets/design/ic_logout.png'),
    user: require('../../../assets/design/ic_user.png'),
    shield: require('../../../assets/design/ic_shield_small.png'),
    sparkle: require('../../../assets/design/ic_sparkle.png'),
  })[n];
export default function MyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, refreshMe, logout } = useAuth();
  const { rivers } = useAppState();
  const { records } = useRecords();
  const { settings, setSetting } = useNotifications();
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  const top = Math.max(insets.top - STATUS_TOP, 0); // 시안은 상태바 59 기준: 상태바가 얇은 폰(안드로이드)에서도 시안 위치 그대로
  const raw = rivers?.[0]?.area ?? '';
  const region = raw.startsWith('용인시') ? raw.split(' ').slice(0, 2).join(' ') : '용인시 처인구'; // 월촌교가 있는 곳
  const keys = Object.keys(settings ?? {});
  const notiOn = keys.some((k) => settings[k]);
  const setAll = (v) => keys.forEach((k) => setSetting(k, v));
  const { tiles, earned, pct } = useBadgeTiles(records);

  // 탭에 들어올 때마다 내 정보 새로 받기 (실패해도 저장된 정보로 보여줘요)
  useFocusEffect(
    useCallback(() => {
      refreshMe().catch(() => {});
      refreshNotifications();
    }, []),
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView contentContainerStyle={{ paddingTop: 76 + top, paddingBottom: 130 }}>
        <View style={{ marginLeft: 28 }} accessibilityRole="header" accessibilityLabel="마이페이지">
          <Lettering name="myTitle" color="#3993D4" />
        </View>

        {/* 프로필 카드 (수정본: 이름 · 지역 / 활동중 — ⋮ 는 주소 바꾸기로 헷갈려서 뺐어요. 프로필 수정은 사진 옆 버튼) */}
        <View style={[s.card, { marginTop: 26, padding: 9, paddingBottom: 15 }]}>
          <Image source={D('banner')} style={s.banner} />
          <View style={s.avatarRing}>
            <Avatar size={72} />
          </View>
          <Pressable onPress={() => router.push('/profile')} style={s.photoBadge} hitSlop={8} accessibilityRole="button" accessibilityLabel="프로필 수정">
            <Image source={D('photo')} style={{ width: 14, height: 14 }} />
          </Pressable>
          <View style={s.nameRow}>
            <Text style={s.name} numberOfLines={1}>
              {user?.nickname ?? '이리로'}
            </Text>
            <Text style={s.nim}> 님</Text>
          </View>
          <View style={s.regionRow}>
            <Image source={D('pin')} style={{ width: 11, height: 13, marginRight: 5 }} />
            <Text style={s.region}>{region}</Text>
          </View>
          <View style={s.profileHr} />
          <View style={[s.friendChip, { marginLeft: 19, marginTop: 16 }]}>
            <View style={s.friendDot} />
            <Text style={s.friendText}>활동중</Text>
          </View>
        </View>

        {/* 나의 배지 (수정본: 연두 카드 · 81×81 타일 · 진행 막대) — 서버 배지만 보여줘요 */}
        <View style={s.badgeCard}>
          <Pressable onPress={() => router.push('/badges')} style={[s.head, { marginTop: 26 }]} accessibilityRole="button" accessibilityLabel={`나의 배지 ${earned}개 획득, 전체 ${tiles.length}개`}>
            <Image source={D('trophy')} style={{ width: 18, height: 17 }} />
            <Text style={s.headTitle}>나의 배지</Text>
            <View style={{ flex: 1 }} />
            <Text style={s.count}>
              {earned}
              <Text style={s.countAll}> / {tiles.length}</Text>
            </Text>
          </Pressable>
          <Text style={[s.headSub, { marginTop: 11 }]}>이리로와 함께한 순간들이 배지가 되었어요!</Text>
          <View style={s.tiles}>
            {tiles.map((b) => (
              <View key={b.key} style={[s.tile, s.tileOn]} accessibilityLabel={b.earned ? `${b.name} 획득` : '아직 받지 않은 배지'}>
                <Image source={b.earned ? ART_ON[b.key] : ART_OFF[b.key]} style={{ width: 60, height: 58, marginTop: -1, opacity: b.earned ? 1 : 0.41 }} resizeMode="contain" />
                <View style={s.tileLabel}>
                  {b.earned ? (
                    b.lettering ? (
                      <Lettering name={b.lettering} height={7.4} color="#525252" />
                    ) : (
                      <Text style={s.tileName}>{b.name}</Text>
                    )
                  ) : (
                    <Lettering name="bQ" height={7.3} color="#525252" />
                  )}
                </View>
              </View>
            ))}
          </View>
          <View style={s.progRow}>
            <Text style={s.progLabel}>차곡차곡, 나의 발자취</Text>
            <View style={{ flex: 1 }} />
            <Text style={s.progPct}>
              {pct}
              <Text style={{ color: '#657983', fontWeight: '400' }}> %</Text>
            </Text>
          </View>
          <View style={s.progTrack}>
            <View style={[s.progFill, { width: `${pct}%` }]} />
          </View>
          <View style={s.nextRow}>
            <Image source={D('sparkle')} style={{ width: 13, height: 13, marginRight: 8 }} />
            <Text style={s.nextText}>다음 배지도 천천히, 함께 채워가요.</Text>
          </View>
        </View>

        {/* 알림 설정 */}
        <View style={[s.card, { marginTop: 16 }]}>
          <View style={s.head}>
            <Image source={D('bell')} style={{ width: 18, height: 19 }} />
            <Text style={s.headTitle}>알림 설정</Text>
            <View style={{ flex: 1 }} />
            <Text style={s.eng}>NOTIFICATIONS</Text>
          </View>
          <View style={[s.row, { marginTop: 18 }]}>
            <View style={{ flex: 1 }}>
              <Text style={s.rowTitle}>이리로 알림</Text>
              <Text style={s.rowSub}>필요한 소식을 놓치지 않도록</Text>
            </View>
            <Toggle value={notiOn} onChange={setAll} label="이리로 알림" />
          </View>
          <View style={s.hr} />
          <Pressable onPress={() => Linking.openSettings().catch(() => {})} style={s.row} accessibilityRole="button" accessibilityLabel="기기 알림 권한, 기기 설정 열기">
            <Image source={D('phone')} style={{ width: 15, height: 20, marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={s.rowTitle}>기기 알림 권한</Text>
              <Text style={s.rowSub}>휴대폰의 알림 권한을 확인해요</Text>
            </View>
            <Text style={s.permState}>설정 열기</Text>
            <Text style={s.chev}>›</Text>
          </Pressable>
          <View style={s.infoBox}>
            <Image source={D('info')} style={{ width: 16, height: 15 }} />
            <Text style={s.infoText}>기기 알림 권한을 허용해야 알림을 받아볼 수 있어요</Text>
          </View>
        </View>

        {/* 계정 관리 */}
        <View style={[s.card, { marginTop: 18, paddingBottom: 10 }]}>
          <View style={s.head}>
            <Image source={D('sliders')} style={{ width: 16, height: 16 }} />
            <Text style={s.headTitle}>계정 관리</Text>
            <View style={{ flex: 1 }} />
            <Text style={s.eng}>ACCOUNT</Text>
          </View>
          <Pressable onPress={() => setAsk(true)} style={[s.row, s.menuRow, { marginTop: 14 }]} accessibilityRole="button">
            <Image source={D('logout')} style={{ width: 19, height: 18, marginRight: 11 }} />
            <Text style={[s.menuText, { flex: 1 }]}>로그아웃</Text>
            <Text style={s.chev}>›</Text>
          </Pressable>
          <View style={s.hr} />
          <Pressable onPress={() => router.push('/withdraw')} style={[s.row, s.menuRow]} accessibilityRole="button">
            <Image source={D('user')} style={{ width: 17, height: 18, marginRight: 13 }} />
            <Text style={[s.menuText, { flex: 1, color: '#9B6662' }]}>회원 탈퇴</Text>
            <Text style={s.chev}>›</Text>
          </Pressable>
        </View>

        <View style={s.footRow}>
          <Image source={D('shield')} style={{ width: 14, height: 17, marginRight: 7 }} />
          <Text style={s.footText}>나의 정보는 안전하게 보호되고 있어요.</Text>
        </View>
        <Text style={s.copy}>© 이리로 · Made for your everyday</Text>
      </ScrollView>

      <ConfirmModal
        visible={ask}
        title="로그아웃할까요?"
        message="다시 이용하려면 로그인이 필요해요."
        confirm="로그아웃"
        busy={busy}
        onCancel={() => setAsk(false)}
        onConfirm={async () => {
          setBusy(true);
          await logout(); // 로그인 화면으로 자동 이동
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  // 시안: 카드 362 폭 · 테두리 #E6ECEE · 모서리 22
  card: { marginHorizontal: 16, borderRadius: 22, borderWidth: 1, borderColor: '#E6ECEE', backgroundColor: '#fff' },
  banner: { width: '100%', height: 142, borderRadius: 16 },
  avatarRing: { position: 'absolute', left: 30, top: 107, width: 80, height: 80, borderRadius: 40, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  photoBadge: {
    position: 'absolute',
    left: 85,
    top: 159,
    width: 27,
    height: 27,
    borderRadius: 13.5,
    backgroundColor: '#F3F6F7',
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 41, marginLeft: 28 },
  regionRow: { flexDirection: 'row', alignItems: 'center', marginTop: 9, marginLeft: 29, marginRight: 21 },
  name: { fontSize: 25, fontWeight: '800', color: '#182630', maxWidth: 230, letterSpacing: -0.5 },
  nim: { fontSize: 15, fontWeight: '600', color: '#182630', marginBottom: 3 },
  profileHr: { height: 1.5, backgroundColor: '#F0F3F4', marginHorizontal: 19, marginTop: 9 },
  friendChip: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, height: 23, borderRadius: 7, paddingHorizontal: 9, backgroundColor: '#F0F7F2' },
  friendDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#80AA8D' },
  friendText: { fontSize: 11, color: '#6B8C7B' },
  region: { fontSize: 11, color: '#939DA2' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 22, marginTop: 22 },
  headTitle: { fontSize: 15, fontWeight: '700', color: '#182630' },
  eng: { fontSize: 8, letterSpacing: 0.8, color: '#AAB4B9' },
  count: { fontSize: 15, fontWeight: '700', color: '#3993D4' },
  countAll: { fontWeight: '400', color: '#ACB4B8' },
  headSub: { fontSize: 12, color: '#657983', marginHorizontal: 22, marginTop: 14 },
  // 시안: 연두(#EDFEC6) 33% 바탕 · 테두리 · 모서리 20
  badgeCard: { marginHorizontal: 16, marginTop: 15, borderRadius: 20, borderWidth: 1, borderColor: '#E6ECEE', backgroundColor: 'rgba(237,254,198,0.33)', paddingBottom: 22 },
  // 시안: 81×81 타일 4칸 · 간격 6.5 · 줄 간격 9 (화면이 좁으면 칸 폭이 줄어요)
  tiles: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 9, paddingHorizontal: 8, marginTop: 19 },
  tile: { width: '23.6%', aspectRatio: 1, maxWidth: 81, borderRadius: 9, backgroundColor: '#fff', alignItems: 'center', paddingTop: 5 },
  tileOn: { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  // 시안 배지 이름은 아주 작은 글자(약 9px) — 최소 12 규칙의 예외
  tileLabel: { height: 12, justifyContent: 'center', marginTop: 2 },
  tileName: { fontSize: 9, fontWeight: '600', color: '#525252' },
  progRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 23, marginTop: 20 },
  progLabel: { fontSize: 12, color: '#657983' },
  progPct: { fontSize: 12, fontWeight: '600', color: '#6D8C7A' },
  progTrack: { height: 6, borderRadius: 3, backgroundColor: '#F0F4F2', marginHorizontal: 23, marginTop: 10, overflow: 'hidden' },
  progFill: { height: 6, borderRadius: 3, backgroundColor: '#9FC4AB' },
  nextRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 24, marginTop: 66 },
  nextText: { fontSize: 12, color: '#657983' },
  row: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 22, minHeight: 56 },
  rowTitle: { fontSize: 15, fontWeight: '600', color: '#182630' },
  rowSub: { fontSize: 11, color: '#657983', marginTop: 8 },
  permState: { fontSize: 11, color: '#75A086', marginRight: 10 },
  chev: { fontSize: 20, color: '#AAB4BA', marginTop: -3 },
  hr: { height: 1.5, backgroundColor: '#EDF2F4', marginHorizontal: 22, marginVertical: 12 },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginHorizontal: 21,
    marginTop: 10,
    marginBottom: 23,
    height: 46,
    borderRadius: 10,
    backgroundColor: '#F6F9FB',
    paddingHorizontal: 13,
  },
  infoText: { fontSize: 12, color: '#657983', flex: 1 },
  menuRow: { minHeight: 46 },
  menuText: { fontSize: 15, color: '#657983' },
  footRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  footText: { fontSize: 11, color: '#A1ADB2' },
  copy: { fontSize: 10, color: '#A6AFB4', textAlign: 'center', marginTop: 22 },
});
