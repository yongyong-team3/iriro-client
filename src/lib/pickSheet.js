// 하단 ▶ → 지도 홈에 '어떤 활동을 기록할까요?' 시트를 여는 신호 (메모리 값)
import { useSyncExternalStore } from 'react';

let open = false;
const subs = new Set();
const set = (v) => {
  if (open === v) return;
  open = v;
  subs.forEach((fn) => fn());
};
const subscribe = (fn) => (subs.add(fn), () => subs.delete(fn));
export const usePickSheet = () => useSyncExternalStore(subscribe, () => open, () => open);
export const openPickSheet = () => set(true);
export const closePickSheet = () => set(false);
