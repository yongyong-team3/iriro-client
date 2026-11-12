"""침수흔적도 GeoJSON → 구간별 '과거 침수 이력' JSON 생성.

python scripts/build_flood_history.py <yongin_flood_trace.geojson> [버퍼m=150]
- 구간 path(src/mock/data.js) 주변 버퍼(m) 안에 걸치는 침수 구역을 찾는다.
- 결과: src/data/floodHistory.json (앱이 읽음). 구간 좌표를 실제 산책로로 바꾸면 다시 실행.
"""
import json, math, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = sys.argv[1]
BUF = float(sys.argv[2]) if len(sys.argv) > 2 else 150.0

# data.js에서 구간 id·name·path 읽기
js = (ROOT / 'src/mock/data.js').read_text(encoding='utf-8')
segs = []
for m in re.finditer(r"id:\s*'(gy-\d+)',\s*name:\s*'([^']+)'[\s\S]*?path:\s*(\[\[[^;]*?\]\])", js):
    path = json.loads(m.group(3))
    segs.append({'id': m.group(1), 'name': m.group(2), 'path': path})

LAT0 = 37.3
KX = 111320 * math.cos(math.radians(LAT0)); KY = 110540
xy = lambda lat, lon: (lon * KX, lat * KY)

def seg_dist(p, a, b):
    (px, py), (ax, ay), (bx, by) = p, a, b
    dx, dy = bx - ax, by - ay
    t = 0 if dx == dy == 0 else max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return math.hypot(px - ax - t * dx, py - ay - t * dy)

def inside(p, ring):
    x, y = p; c = False
    for (x1, y1), (x2, y2) in zip(ring, ring[1:]):
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            c = not c
    return c

def poly_line_dist(ring, line):
    if any(inside(q, ring) for q in line):
        return 0.0
    d = min(seg_dist(p, a, b) for p in ring for a, b in zip(line, line[1:]))
    return min(d, min(seg_dist(q, a, b) for q in line for a, b in zip(ring, ring[1:])))

gj = json.load(open(SRC, encoding='utf-8'))
polys = []
for f in gj['features']:
    ring = [xy(lat, lon) for lon, lat in f['geometry']['coordinates'][0]]
    polys.append((f, ring))

out = {'source': '행정안전부 침수흔적도 (2008·2011·2020·2022, 용인시 처인구)', 'buffer_m': BUF,
       'note': '과거 침수 기록이며 현재 상태와 다를 수 있어요. 구간 좌표는 임시 좌표 기준입니다.', 'segments': {}}
for s in segs:
    line = [xy(lat, lon) for lat, lon in s['path']]
    hits = []
    for f, ring in polys:
        d = poly_line_dist(ring, line)
        if d <= BUF:
            hits.append((f['properties'], round(d), f['geometry']))
    events = {}
    for p, d, g in hits:
        e = events.setdefault(p['year'], {'year': p['year'], 'event': p['event'], 'start': p['start'], 'end': p['end'],
                                          'areas': 0, 'max_depth_m': 0.0, 'area_m2': 0.0, 'min_dist_m': d})
        e['areas'] += 1; e['max_depth_m'] = max(e['max_depth_m'], p['depth_m'])
        e['area_m2'] += p['area_m2']; e['min_dist_m'] = min(e['min_dist_m'], d)
    ev = sorted(events.values(), key=lambda e: e['year'], reverse=True)
    for e in ev:
        e['max_depth_m'] = round(e['max_depth_m'], 2); e['area_m2'] = round(e['area_m2'])
    out['segments'][s['id']] = {
        'name': s['name'], 'count': len(ev), 'events': ev,
        'max_depth_m': max((e['max_depth_m'] for e in ev), default=None),
        # 지도에 그릴 폴리곤 (위경도, 구간과 겹치는 것만)
        'polygons': [{'year': p['year'], 'depth_m': p['depth_m'],
                      'coords': [[round(lat, 6), round(lon, 6)] for lon, lat in g['coordinates'][0]]} for p, d, g in hits],
    }
    print(f"{s['id']} {s['name']}: 구역 {len(hits)}개, 사건 {[e['year'] for e in ev]}")

dst = ROOT / 'src/data/floodHistory.json'
dst.parent.mkdir(exist_ok=True)
dst.write_text(json.dumps(out, ensure_ascii=False), encoding='utf-8')
print('saved', dst, dst.stat().st_size, 'bytes')
