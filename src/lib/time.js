// 시간 문자열은 'YYYY-MM-DDTHH:mm' (한국 시간, 타임존 표기 없음)으로 통일합니다.

export function parseLocal(s) {
  const [d, t = '00:00'] = s.split('T');
  const [y, m, day] = d.split('-').map(Number);
  const [hh, mm] = t.split(':').map(Number);
  return new Date(y, m - 1, day, hh, mm);
}

export function formatLocal(date) {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}`;
}

export function addHours(s, h) {
  const d = parseLocal(s);
  d.setHours(d.getHours() + h);
  return formatLocal(d);
}

export function diffHours(a, b) {
  return Math.round((parseLocal(a) - parseLocal(b)) / 3600000);
}

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

// "7월 18일(목) 오전 9시"
export function prettyTime(s, { withDate = true } = {}) {
  const d = parseLocal(s);
  const h = d.getHours();
  const ampm = h < 12 ? '오전' : '오후';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const time = `${ampm} ${h12}시`;
  if (!withDate) return time;
  return `${d.getMonth() + 1}월 ${d.getDate()}일(${DAYS[d.getDay()]}) ${time}`;
}

// 기준 시각 대비 "오늘/내일/모레 오전 9시"
export function relativeTime(target, now) {
  const t = parseLocal(target);
  const n = parseLocal(now);
  const dayDiff = Math.round(
    (new Date(t.getFullYear(), t.getMonth(), t.getDate()) - new Date(n.getFullYear(), n.getMonth(), n.getDate())) / 86400000,
  );
  const label = dayDiff === 0 ? '오늘' : dayDiff === 1 ? '내일' : dayDiff === 2 ? '모레' : `${t.getMonth() + 1}/${t.getDate()}`;
  return `${label} ${prettyTime(target, { withDate: false })}`;
}
