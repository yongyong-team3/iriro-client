// 날씨 탭 예시 데이터 (최종 시안 2026-11-11)
//   서버(WEATHER-01)는 지금 기온과 하늘 상태(맑음·흐림·비·눈)만 줘요.
//   체감·최고/최저·시간별·10일 예보·강수 확률·바람·습도·자외선·미세먼지는 받을 곳이 없어서
//   지금 기온·하늘에 맞춰 만든 '예시 데이터'예요. 화면에 '예시 데이터'라고 표시해요.

// 아이콘 종류: sun 맑음 · partly 구름 조금 · cloud 흐림 · drizzle 이슬비 · rain 비
export const KIND_LABEL = { sun: '맑음', partly: '구름 조금', cloud: '흐림', drizzle: '이슬비', rain: '비' };

/** 목업 장면 날씨({ sky, rainMm }) 또는 서버 condition → 아이콘 종류 */
export function kindOf({ sky, rainMm, condition } = {}) {
  const c = String(condition ?? '').toUpperCase();
  if (c === 'SUNNY') return 'sun';
  if (c === 'CLOUDY' || c === 'SNOWY') return 'cloud';
  if (c === 'RAINY') return 'drizzle';
  if (sky === 'rain') return rainMm >= 10 ? 'rain' : 'drizzle';
  if (sky === 'cloudy') return 'cloud';
  if (sky === 'partly') return 'partly';
  return 'sun';
}

const wet = (k) => k === 'rain' || k === 'drizzle';
const hourLabel = (h) => `${h < 12 ? '오전' : '오후'} ${h % 12 || 12}시`;
const WEEK = ['일', '월', '화', '수', '목', '금', '토'];

/** 지금 기온·하늘 → 화면 전체에 쓸 예시 값 */
export function sampleWeather({ tempC = 21, kind = 'sun', at = new Date() }) {
  const t = Math.round(tempC);
  const d0 = new Date(at);
  const rainy = wet(kind);
  // 시간별: 비 → 잦아들며 흐림, 맑음 → 그대로
  const seq = rainy ? [kind, 'drizzle', 'cloud', 'cloud', 'cloud', 'partly'] : kind === 'cloud' ? ['cloud', 'cloud', 'partly', 'partly', 'cloud', 'cloud'] : ['sun', 'sun', 'partly', 'sun', 'sun', 'partly'];
  const pop = rainy ? [65, 45, 20, 10, 10, 0] : kind === 'cloud' ? [30, 30, 20, 20, 30, 30] : [0, 0, 10, 0, 0, 10];
  const hourly = seq.map((k, i) => {
    const h = (d0.getHours() + i) % 24;
    return { label: i === 0 ? '지금' : hourLabel(h), kind: k, pop: pop[i], temp: t - (i >= 3 ? 1 : 0) };
  });
  // 10일: 내일부터 차차 맑고 포근해짐
  const days = Array.from({ length: 10 }, (_, i) => {
    const d = new Date(d0);
    d.setDate(d.getDate() + i);
    const k = i === 0 ? kind : rainy && i === 1 ? 'rain' : ['sun', 'partly', 'sun', 'sun', 'partly', 'drizzle', 'cloud', 'sun'][i % 8];
    const lo = t - 5 + Math.round(Math.sin(i) * 2) + Math.min(i, 4);
    const hi = lo + 6 + (i % 3);
    return { day: i === 0 ? '오늘' : i === 1 ? '내일' : WEEK[d.getDay()], date: `${d.getMonth() + 1}.${d.getDate()}`, kind: k, pop: wet(k) ? [65, 45, 50][i % 3] : 0, lo, hi };
  });
  return {
    feels: rainy ? t - 2 : t,
    hi: Math.max(t + 1, days[0].hi),
    lo: Math.min(t - 5, days[0].lo),
    summary: rainy ? '밤 10시부터 비가 잦아들고, 내일은 조금 더 포근해요' : kind === 'cloud' ? '하루 종일 구름이 많고, 비 소식은 없어요' : '하루 종일 맑고, 산책하기 좋은 날씨예요',
    hourly,
    days,
    pop: hourly[0].pop,
    popNote: rainy ? '외출할 땐 작은 우산을 챙겨요' : '우산 없이 나가도 괜찮아요',
    wind: 2.3,
    windNote: '북동풍 · 가볍게 부는 바람',
    humidity: rainy ? 82 : 55,
    humidNote: rainy ? '평소보다 공기가 촉촉해요' : '쾌적한 습도예요',
    uv: rainy ? 1 : kind === 'cloud' ? 2 : 5,
    uvLabel: rainy || kind === 'cloud' ? '낮음' : '보통',
    uvNote: rainy || kind === 'cloud' ? '자외선 걱정은 잠시 내려놔요' : '한낮에는 모자를 챙겨요',
    pm10: 18,
    pm25: 8,
    air: '좋음',
    airNote: '공기는 맑은 편이에요. 편안하게 숨 쉬어도 좋아요',
    guide: rainy
      ? { title: '오늘은 우산과 함께, 천천히 걸어가요.', body: '약한 비로 길이 미끄러울 수 있어요. 바닥이 젖은 계단과 경사로를 조심해 주세요.', items: '작은 우산 · 미끄럽지 않은 신발' }
      : kind === 'cloud'
        ? { title: '구름 낀 날, 가볍게 걸어요.', body: '햇볕이 약해 걷기 편해요. 하천 수위는 지도 홈에서 함께 확인해 주세요.', items: '얇은 겉옷 · 물 한 병' }
        : { title: '맑은 날, 하천길을 걸어요.', body: '햇볕이 강할 수 있어요. 비가 그친 뒤라면 하천 수위를 지도 홈에서 확인해 주세요.', items: '모자 · 물 한 병' },
  };
}
