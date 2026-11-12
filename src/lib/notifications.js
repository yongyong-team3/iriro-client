// 알림 목록 · 알림 설정
//   서버 모드: NOTI-01 목록(회복 예측 알림만) · NOTI-02 읽음 · NOTI-03/04 설정(회복 예측 스위치 하나, 기본 꺼짐) = F-10
//   목업 모드: 이 기기에서 만들어요
//     - 하천 상태 변화: 코스가 '이용 위험'·'공식 통제'면 알림 / 회복 예측이 있으면 회복 알림 (AI 분석)
//     - 활동 기록: 기록을 저장하면 알림
//     - 서비스 소식: 가입 환영
import { useEffect, useMemo, useState } from 'react';
import { getKV, setKV, useKV } from './kv';
import { useAppState } from '../context/AppState';
import { courseSituation } from '../components/courseUi';
import { USE_MOCK } from '../api/client';
import { getNotificationSettings, listNotifications, markNotificationRead, updateNotificationSettings } from '../api/me';
import { prettyTime } from './time';

export const NOTIF_DEFAULT = { river: true, activity: true, service: false };

/** 활동 기록 저장 등 이벤트 알림 추가 — 목업만 (서버 모드는 서버가 알림을 만들어요) */
export function pushNotification(n) {
  if (!USE_MOCK) return;
  const set = getKV('notif-settings', NOTIF_DEFAULT);
  if (set[n.type] === false) return;
  const list = getKV('notifications', []) ?? [];
  setKV('notifications', [{ id: `n-${Date.now()}`, at: new Date().toISOString(), ...n }, ...list].slice(0, 50));
}

// 서버 알림은 'srv-notifications' 에 담아 두고 마이·알림 화면이 같이 써요
export function refreshNotifications() {
  if (USE_MOCK) return Promise.resolve();
  return listNotifications()
    .then((l) => setKV('srv-notifications', l))
    .catch(() => {});
}

export function useNotifications() {
  const [saved] = useKV('notifications', []);
  const [remote] = useKV('srv-notifications', null);
  const [read, setRead] = useKV('notif-read', []);
  const [localSettings, setLocalSettings] = useKV('notif-settings', NOTIF_DEFAULT);
  const [srvSettings, setSrvSettings] = useState(null);
  const [welcomeAt, setWelcomeAt] = useKV('welcome-at', null);
  const { courses } = useAppState();

  useEffect(() => {
    if (USE_MOCK) {
      if (!welcomeAt) setWelcomeAt(new Date().toISOString());
      return;
    }
    refreshNotifications();
    getNotificationSettings()
      .then(setSrvSettings)
      .catch(() => {});
  }, []);

  const settings = USE_MOCK ? localSettings : (srvSettings ?? { recovery: false });

  const mockList = useMemo(() => {
    if (!USE_MOCK) return [];
    const river = [];
    if (settings.river) {
      const seen = new Set();
      for (const c of courses ?? []) {
        if (seen.has(c.trailId)) continue;
        const sit = courseSituation(c);
        const name = (c.trailName ?? '').replace(/ 하천길$/, '');
        if (sit === 'flooded' || sit === 'closed') {
          seen.add(c.trailId);
          river.push({
            id: `river-${c.trailId}-${sit}`,
            type: 'river',
            title: '하천 상태가 바뀌었어요',
            body: `${name} 주변 하천이\n'${sit === 'closed' ? '공식 통제' : '이용 위험'}'으로 변경됐어요.`,
            meta: '방금 · AI 분석',
            at: new Date().toISOString(),
            alert: true,
          });
          // F-10 회복 예측 알림 (참고 수위 아래로 내려갈 예상 시각이 있을 때)
          const rc = c.recovery;
          if (rc?.available && !rc.reached && rc.estimate) {
            river.push({
              id: `recover-${c.trailId}-${rc.estimate}`,
              type: 'river',
              title: '회복 예측이 나왔어요',
              body: `${name} 하천길은 ${prettyTime(rc.estimate)} 이후\n다시 이용할 수 있을 것으로 예상돼요.`,
              meta: '방금 · AI 회복 예측',
              at: new Date().toISOString(),
            });
          }
        }
      }
    }
    const welcome = { id: 'welcome', type: 'service', title: '이리로에 오신 것을 환영해요', body: '나의 하천길을 탐색해 보세요.', at: welcomeAt ?? new Date().toISOString() };
    return [...river, ...(saved ?? []).filter((n) => settings[n.type] !== false), welcome];
  }, [courses, saved, settings, welcomeAt]);

  const list = USE_MOCK ? mockList : (remote ?? []);
  const isRead = (n) => (USE_MOCK ? read.includes(n.id) : n.read);
  const unread = list.filter((n) => !isRead(n));

  return {
    list,
    unread,
    isRead: (id) => {
      const n = list.find((x) => x.id === id);
      return n ? isRead(n) : true;
    },
    markAllRead: () => {
      if (USE_MOCK) {
        setRead((r) => [...new Set([...(r ?? []), ...list.map((n) => n.id)])].slice(-200));
        return;
      }
      // NOTI-02 로 안 읽은 것만 하나씩 (모두 읽음 API 없음)
      const ids = unread.map((n) => n.id);
      if (!ids.length) return;
      setKV('srv-notifications', list.map((n) => ({ ...n, read: true })));
      Promise.all(ids.map((id) => markNotificationRead(id).catch(() => {}))).then(refreshNotifications);
    },
    settings,
    setSetting: (k, v) => {
      if (USE_MOCK) {
        setLocalSettings((s) => ({ ...(s ?? NOTIF_DEFAULT), [k]: v }));
        return;
      }
      const prev = settings;
      setSrvSettings({ ...prev, [k]: v });
      updateNotificationSettings({ [k]: v }).catch(() => setSrvSettings(prev)); // NOTI-04 실패하면 되돌림
    },
  };
}
