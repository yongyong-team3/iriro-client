// 시연 모드: 2024년 7월 집중호우 당시로 기준 시각을 돌려보는 슬라이더
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import Slider from '@react-native-community/slider';
import { REPLAY_HOURS, REPLAY_START } from '../mock/data';
import { addHours, diffHours, prettyTime } from '../lib/time';
import { C } from '../constants/theme';

export default function ReplayBar({ time, onChange }) {
  const [playing, setPlaying] = useState(false);
  const idx = diffHours(time, REPLAY_START);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      onChange((prev) => {
        if (diffHours(prev, REPLAY_START) >= REPLAY_HOURS - 1) {
          setPlaying(false);
          return prev;
        }
        return addHours(prev, 1);
      });
    }, 450);
    return () => clearInterval(id);
  }, [playing]);

  return (
    <View style={s.bar}>
      <Pressable style={s.play} onPress={() => setPlaying((p) => !p)} hitSlop={8}>
        <Text style={s.playText}>{playing ? '❚❚' : '▶'}</Text>
      </Pressable>
      <View style={{ flex: 1 }}>
        <View style={s.top}>
          <Text style={s.tag} numberOfLines={1}>시연 모드 · 2024.7 집중호우</Text>
          <Text style={s.time}>{prettyTime(time)}</Text>
        </View>
        <Slider
          style={{ height: 28, marginHorizontal: -8 }}
          minimumValue={0}
          maximumValue={REPLAY_HOURS - 1}
          step={1}
          value={idx}
          onValueChange={(v) => onChange(addHours(REPLAY_START, Math.round(v)))}
          minimumTrackTintColor="#38BDF8"
          maximumTrackTintColor="#475569"
          thumbTintColor="#ffffff"
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.ink, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 4 },
  play: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  playText: { color: C.ink, fontSize: 12, fontWeight: '800' },
  top: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  tag: { color: '#94A3B8', fontSize: 12, flexShrink: 1 },
  time: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
