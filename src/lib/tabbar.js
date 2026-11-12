// 하단 탭바 숨기기 (기록 준비·측정 중에는 시안처럼 탭바 없이 조작 버튼만 보여요)
// 저장하지 않는 메모리 값이라 앱을 다시 켜면 항상 보이는 상태로 돌아와요.
import { useEffect, useSyncExternalStore } from 'react';

let hidden = false;
const subs = new Set();
const set = (v) => {
  if (hidden === v) return;
  hidden = v;
  subs.forEach((fn) => fn());
};
const subscribe = (fn) => (subs.add(fn), () => subs.delete(fn));

export const useTabBarHidden = () => useSyncExternalStore(subscribe, () => hidden, () => hidden);

/** 화면에서 호출: hide 가 true 인 동안 탭바를 숨겨요 (화면을 떠나면 다시 보여요) */
export function useHideTabBar(hide) {
  useEffect(() => {
    set(!!hide);
    return () => set(false);
  }, [hide]);
}
