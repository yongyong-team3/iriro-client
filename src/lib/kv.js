// 기기 저장소 (AsyncStorage) + 메모리 캐시.
// 앱 시작 시 initKV()로 한 번 불러오면 이후에는 동기적으로 읽을 수 있어서
// 웹 버전에서 쓰던 localStorage 방식 코드를 거의 그대로 쓸 수 있습니다.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const PREFIX = 'cbv:';
const cache = new Map();
const listeners = new Map();

export async function initKV() {
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(PREFIX));
    const pairs = await AsyncStorage.multiGet(keys);
    pairs.forEach(([k, v]) => {
      try {
        cache.set(k.slice(PREFIX.length), JSON.parse(v));
      } catch {
        /* 깨진 값 무시 */
      }
    });
  } catch {
    /* 저장소를 못 읽어도 앱은 기본값으로 동작 */
  }
}

export function getKV(key, fallback) {
  return cache.has(key) ? cache.get(key) : fallback;
}

export function setKV(key, value) {
  cache.set(key, value);
  AsyncStorage.setItem(PREFIX + key, JSON.stringify(value)).catch(() => {});
  listeners.get(key)?.forEach((fn) => fn(value));
}

// 여러 화면에서 같은 키를 써도 값이 함께 바뀌는 상태 훅
export function useKV(key, fallback) {
  const [value, setValue] = useState(() => getKV(key, fallback));
  useEffect(() => {
    const set = listeners.get(key) ?? new Set();
    set.add(setValue);
    listeners.set(key, set);
    return () => set.delete(setValue);
  }, [key]);
  const update = (next) => setKV(key, typeof next === 'function' ? next(getKV(key, fallback)) : next);
  return [value, update];
}
