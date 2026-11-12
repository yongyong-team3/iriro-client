import { C } from './theme';
import { COLOR } from './colors';

// F-04 구간 상태 4단계
// color = 지도 선·점 색, badge = 알약 배지(연한 배경 + 진한 글자 + 테두리)
export const STATUS = {
  good: { label: '양호', color: C.ok, desc: '이용 여건 양호', badge: { fg: COLOR.ok, bg: COLOR.okBg, bd: COLOR.okBg } },
  caution: { label: '주의', color: C.warn, desc: '수위가 참고 수위보다 높아요', badge: { fg: COLOR.warn, bg: COLOR.warnBg, bd: COLOR.warnBg } },
  closed: { label: '통제', color: C.danger, desc: '공식 출입 통제 중', badge: { fg: COLOR.danger, bg: COLOR.dangerBg, bd: COLOR.dangerBg } },
  unknown: { label: '정보 부족', color: C.unknown, desc: '판단할 데이터가 부족해요', badge: { fg: COLOR.unknown, bg: COLOR.unknownBg, bd: COLOR.line } },
};

// F-05 정보 출처 칩 색 (글자, 배경, 테두리)
export const SOURCE = {
  official: { label: '공식 통제', fg: COLOR.danger, bg: COLOR.dangerBg, bd: COLOR.dangerBg },
  estimate: { label: 'AI 추정', fg: COLOR.brandDeep, bg: COLOR.brandSoft, bd: COLOR.brandSoft },
  observed: { label: '관측', fg: COLOR.text, bg: COLOR.fill, bd: COLOR.line },
  citizen: { label: '시민 관찰', fg: COLOR.text, bg: COLOR.fill, bd: COLOR.line },
  none: { label: '데이터 없음', fg: C.muted, bg: C.fill, bd: C.line },
};

export const TIMELINE_SOURCE = {
  official: { ...SOURCE.official, label: '공식' },
  citizen: SOURCE.citizen,
  rain: { ...SOURCE.observed, label: '강수' },
  level: { ...SOURCE.observed, label: '수위 관측' },
};

export const TREND = { rising: '상승 중 ↑', falling: '하강 중 ↓', steady: '변화 적음 →' };

export const UNCERTAINTY = { low: '불확실성 낮음', medium: '불확실성 보통', high: '불확실성 높음' };

// F-08 이용 유형
export const ACTIVITIES = {
  walk: { label: '산책', icon: '🚶' },
  run: { label: '러닝', icon: '🏃' },
  bike: { label: '자전거', icon: '🚴' },
};
