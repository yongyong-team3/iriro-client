// 배지 8칸 (최종 시안 순서 그대로) — 마이페이지 '나의 배지'와 배지 화면이 같이 써요
import { useBadges } from './records';

// 나의 배지 8칸 (시안 순서 그대로). 그림은 시안 배지 그림 묶음에서 잘라 낸 컬러(on) / 회색(off)
//   획득 여부: 서버(또는 목업) 배지 코드를 아래 code 로 연결해요.
//   code 가 없는 5칸은 받을 조건이 아직 없어서 항상 잠김(???) — 백엔드가 배지를 추가하면 code 만 적으면 돼요.
export const ART_ON = {
  dragon: require('../../assets/badges/art/dragon_on.png'),
  runner: require('../../assets/badges/art/runner_on.png'),
  nature: require('../../assets/badges/art/nature_on.png'),
  finisher: require('../../assets/badges/art/finisher_on.png'),
  city: require('../../assets/badges/art/city_on.png'),
  safe: require('../../assets/badges/art/safe_on.png'),
  jjing: require('../../assets/badges/art/jjing_on.png'),
  steady: require('../../assets/badges/art/steady_on.png'),
};
export const ART_OFF = {
  dragon: require('../../assets/badges/art/dragon_off.png'),
  runner: require('../../assets/badges/art/runner_off.png'),
  nature: require('../../assets/badges/art/nature_off.png'),
  finisher: require('../../assets/badges/art/finisher_off.png'),
  city: require('../../assets/badges/art/city_off.png'),
  safe: require('../../assets/badges/art/safe_off.png'),
  jjing: require('../../assets/badges/art/jjing_off.png'),
  steady: require('../../assets/badges/art/steady_off.png'),
};
export const CATALOG = [
  { key: 'dragon', name: '용인 드래곤' },
  { key: 'runner', name: '러닝 마스터', code: 'TEN_KM', lettering: 'bRunner' }, // 누적 10km
  { key: 'nature', name: '자연 관찰가', code: 'FIVE_ACTIVITIES', lettering: 'bNature' }, // 활동 5회
  { key: 'finisher', name: '코스 완주자' },
  { key: 'city', name: '용인 도시탐험', code: 'FIRST_ACTIVITY', lettering: 'bCity' }, // 첫 활동
  { key: 'safe', name: '안전한 이용자' },
  { key: 'jjing', name: '용인 찡' },
  { key: 'steady', name: '꾸준한 활동가' },
];

/** records → 8칸 [{ key, name, lettering, earned }] · earned 개수 · 퍼센트 */
export function useBadgeTiles(records) {
  const badges = useBadges(records);
  const got = new Set(badges.filter((b) => b.earned).map((b) => b.id));
  const tiles = CATALOG.map((c) => ({ ...c, earned: !!c.code && got.has(c.code), detail: badges.find((b) => b.id === c.code) }));
  const earned = tiles.filter((b) => b.earned).length;
  const pct = Math.round((earned / tiles.length) * 1000) / 10; // 3/8 → 37.5
  return { tiles, earned, pct };
}
