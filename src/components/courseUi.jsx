// 코스 카드·시간 계산 (홈 2차 시안 '내 주변 코스')
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import { G2, H, IMG, Icon, RIVER_STATUS } from './homeUi';

const SPEED_KMH = { walk: 4, run: 9, bike: 15 }; // 시안: 1.3km 산책 약 20분
export const minutesFor = (km, activity) => Math.max(1, Math.round((km / (SPEED_KMH[activity] ?? 4)) * 60));
// 코스 사진: 코스마다 다른 하천 사진을 써요. 아직 사진이 없는 코스는 사진 자리 표시만 보여줘요.
// 새 사진은 assets/home/ 에 넣고 여기 한 줄 추가하면 돼요. (예: maesan: require('../../assets/home/course_maesan.jpg'))
export const COURSE_PHOTOS = {
  wolchon: IMG.riverPhoto,
};

export const courseKm = (c) => c?.distanceKm ?? c?.km ?? null;

/** 코스 상황: 공식 통제가 AI 결과보다 우선 */
export const courseSituation = (c) => (c?.official ? 'closed' : (c?.status ?? 'unknown'));

/** 코스 선 색: 이용 가능 파랑 · 회복 중 주황 · 그 밖(이용 위험 · 통제 · 확인 불가) 빨강 — 확인 불가는 예전처럼 둬요 */
export function lineColor(sit) {
  if (sit === 'available') return H.brand;
  if (sit === 'recovering') return RIVER_STATUS.recovering.fg;
  return RIVER_STATUS.flooded.fg;
}

export function CourseCard({ course, minutes, fav, onPress, onLongPress }) {
  const sit = courseSituation(course);
  const bad = { closed: '공식 통제 중', flooded: '이용 위험', unknown: '확인 불가', recovering: '회복 중' }[sit];
  const gray = sit === 'unknown';
  const tone = sit === 'recovering' ? RIVER_STATUS.recovering : RIVER_STATUS.flooded; // 회복 중은 주황, 위험·통제는 빨강
  const km = courseKm(course);
  return (
    <Pressable
      style={({ pressed }) => [s.card, pressed && { opacity: 0.9 }]}
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={`${course.name}, ${course.direction}, ${km}km 약 ${minutes}분${bad ? `, ${bad}` : ''}`}
    >
      {COURSE_PHOTOS[course.photo] ? (
        <Image source={COURSE_PHOTOS[course.photo]} style={s.photo} />
      ) : (
        <View style={[s.photo, s.noPhoto]} accessibilityLabel="코스 사진 준비 중">
          <Icon name="arrowRight" color="#9CC3E6" />
          <Text style={s.noPhotoText}>사진 준비 중</Text>
        </View>
      )}
      <View style={{ flex: 1, marginLeft: 9 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          {sit === 'flooded' ? (
            // 이용 위험: 파란 꼬리표 하나로 AI 판단을 알려요 (최종 시안 164×16, 한 줄)
            <View style={s.tag}>
              <Text style={s.tagText} numberOfLines={1}>
                AI 분석 결과 침수 가능성이 있다고 판단했어요
              </Text>
            </View>
          ) : (
            <View style={s.tag}>
              <Text style={s.tagText}>{course.tag}</Text>
            </View>
          )}
          {bad && sit !== 'flooded' && (
            <View style={[s.tag, { backgroundColor: gray ? H.fill : tone.bg }]}>
              <Text style={[s.tagText, { color: gray ? H.sub : tone.fg }]}>{bad}</Text>
            </View>
          )}
          {fav && <Text style={s.fav}>★</Text>}
        </View>
        <Text style={s.title} numberOfLines={1}>
          {course.name}
        </Text>
        <Text style={s.sub}>{course.direction}</Text>
        <View style={s.metaRow}>
          <Text style={s.meta}>{km}km</Text>
          <View style={s.metaBar} />
          <Text style={s.meta}>약{minutes}분</Text>
        </View>
      </View>
      <View style={s.arrow}>
        <Icon name="arrowRight" />
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  // 시안: 350×100, 테두리 #D9D9D9, 모서리 12.5 / 사진 88×85 모서리 9
  card: {
    minHeight: 100,
    paddingVertical: 8,
    borderRadius: 12.5,
    borderWidth: 1,
    borderColor: G2.line,
    backgroundColor: H.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 7,
    paddingRight: 19,
  },
  photo: { width: 88, height: 85, borderRadius: 9 },
  noPhoto: { backgroundColor: G2.soft, alignItems: 'center', justifyContent: 'center', gap: 6 },
  noPhotoText: { fontSize: 12, color: H.sub },
  // 꼬리표: 시안 그대로 높이 16 · 글자 8 (사용자 지시로 글자 최소 12 규칙의 예외, 2026-11-11)
  tag: { height: 16, borderRadius: 8, backgroundColor: G2.soft, paddingLeft: 12, paddingRight: 10, justifyContent: 'center' },
  tagText: { fontSize: 8, lineHeight: 10, fontWeight: '600', color: H.brand },
  fav: { fontSize: 12, color: H.brand },
  title: { fontSize: 20, fontWeight: '700', color: '#000', marginTop: 5 }, // 시안 약 20
  sub: { fontSize: 12, color: G2.text, marginTop: 3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 7 },
  meta: { fontSize: 10, fontWeight: '600', color: G2.ok }, // 시안 약 10 (최소 12 규칙 예외)
  metaBar: { width: 1, height: 8, backgroundColor: G2.ok },
  arrow: { width: 26, height: 26, borderRadius: 13, backgroundColor: G2.soft, alignItems: 'center', justifyContent: 'center' },
});
