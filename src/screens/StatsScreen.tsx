import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { AppData, calcStreak, last7, fmtHHMM, todayStr } from '../storage';
import { TECHNIQUES } from '../data';
import { DARK, Theme } from '../theme';

const TL_START = 6, TL_END = 22, TL_SLOTS = TL_END - TL_START;

export default function StatsScreen({ data, th = DARK }: { data: AppData; th?: Theme }) {
  const streak = calcStreak(data.sessions);
  const today = todayStr();
  const todaySess = data.sessions.filter(s => s.date === today);
  const nowHour = new Date().getHours();
  const activeHours = new Set(todaySess.map(s => (s.hour != null ? s.hour : nowHour)).filter(h => h >= TL_START && h < TL_END));
  const days = last7(data.sessions);
  const GOAL = 3;
  const weekSess = data.sessions.filter(s => { const d = new Date(); d.setDate(d.getDate() - 6); return new Date(s.date) >= d; }).length;

  const allDays = [...new Set(data.sessions.map(s => s.date))].sort().reverse();
  let best = 0, cur = 0;
  allDays.forEach((d, i) => {
    if (i === 0) cur = 1;
    else { const diff = Math.round((new Date(allDays[i - 1]).getTime() - new Date(d).getTime()) / 86400000); if (diff === 1) cur++; else { best = Math.max(best, cur); cur = 1; } }
  });
  best = Math.max(best, cur);

  const tc: Record<string, number> = {};
  data.sessions.forEach(s => { tc[s.technique] = (tc[s.technique] || 0) + 1; });
  const maxTc = Math.max(...Object.values(tc), 1);

  const ss = styles(th);

  return (
    <View style={{ flex: 1, backgroundColor: th.bg }}>
      <LinearGradient
        colors={[`${th.teal}20`, `${th.teal}00`]}
        locations={[0, 1]}
        style={[StyleSheet.absoluteFillObject, { height: 300 }]}
        pointerEvents="none"
      />

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 50, paddingTop: 8 }}>

          {/* Header */}
          <View style={ss.header}>
            <Text style={[ss.title, { color: th.text }]}>Statistics</Text>
          </View>

          {/* Top stats row */}
          <View style={[ss.statsCard, { backgroundColor: th.surf, borderColor: th.border }]}>
            <View style={ss.statCol}>
              <Text style={[ss.statNum, { color: th.teal }]}>{fmtHHMM(data.totalMin)}</Text>
              <Text style={[ss.statLbl, { color: th.text2 }]}>total</Text>
            </View>
            <View style={[ss.statDivider, { backgroundColor: th.border }]} />
            <View style={ss.statCol}>
              <Text style={[ss.statNum, { color: th.amber }]}>{streak}</Text>
              <Text style={[ss.statLbl, { color: th.text2 }]}>streak</Text>
            </View>
            <View style={[ss.statDivider, { backgroundColor: th.border }]} />
            <View style={ss.statCol}>
              <Text style={[ss.statNum, { color: th.text }]}>{data.sessions.length}</Text>
              <Text style={[ss.statLbl, { color: th.text2 }]}>sessions</Text>
            </View>
          </View>

          {/* Mindful minutes today */}
          <View style={[ss.card, { marginHorizontal: 16 }]}>
            <View style={ss.cardHeader}>
              <Text style={[ss.sectionLabel, { color: th.label }]}>TODAY'S MINDFUL MINUTES</Text>
              <Text style={{ color: th.label, fontSize: 12 }}>
                <Text style={{ color: th.teal, fontWeight: '600' }}>{todaySess.length}</Text>/10
              </Text>
            </View>
            <View style={ss.tlRow}>
              {Array.from({ length: TL_SLOTS }, (_, i) => {
                const h = TL_START + i;
                return <View key={i} style={[ss.tlSeg, { backgroundColor: activeHours.has(h) ? th.teal : h === nowHour ? `${th.teal}35` : th.border }]} />;
              })}
            </View>
            <View style={ss.tlLabels}>
              {['6AM', 'NOON', 'NOW', '10PM'].map(l => <Text key={l} style={[ss.tlLabel, { color: th.label }]}>{l}</Text>)}
            </View>
          </View>

          {/* Streak / Best pair */}
          <View style={[ss.pairRow, { paddingHorizontal: 16 }]}>
            <View style={[ss.pairCard, {
              backgroundColor: streak > 0 ? 'rgba(232,162,60,0.08)' : th.surf,
              borderColor: streak > 0 ? 'rgba(232,162,60,0.22)' : th.border,
            }]}>
              <Text style={[ss.sectionLabel, { color: streak > 0 ? 'rgba(232,162,60,0.6)' : th.label }]}>STREAK</Text>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginTop: 10, marginBottom: 4 }}>
                <Text style={{ fontSize: 36, fontWeight: '300', letterSpacing: -1.5, color: streak > 0 ? th.amber : th.text2 }}>{streak}</Text>
                <Text style={{ fontSize: 13, marginBottom: 6, color: streak > 0 ? `${th.amber}88` : th.label }}>days</Text>
              </View>
              <Text style={{ fontSize: 11, color: streak > 0 ? `${th.amber}66` : th.label }}>
                {streak >= 7 ? '✦ on fire' : streak >= 3 ? '✦ building' : streak > 0 ? '◎ started' : '◎ begin today'}
              </Text>
            </View>
            <View style={[ss.pairCard, { backgroundColor: th.surf, borderColor: th.border }]}>
              <Text style={[ss.sectionLabel, { color: th.label }]}>BEST</Text>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginTop: 10, marginBottom: 4 }}>
                <Text style={{ fontSize: 36, fontWeight: '300', letterSpacing: -1.5, color: th.text }}>{best}</Text>
                <Text style={{ fontSize: 13, marginBottom: 6, color: th.label }}>days</Text>
              </View>
              <Text style={{ fontSize: 11, color: th.label }}>personal best</Text>
            </View>
          </View>

          {/* Last 7 days */}
          <View style={{ marginHorizontal: 16 }}>
            <View style={ss.sectionRow}>
              <Text style={[ss.sectionLabel, { color: th.label }]}>LAST 7 DAYS</Text>
              <Text style={{ color: th.label, fontSize: 11 }}>{weekSess} sessions</Text>
            </View>
            <View style={[ss.card, { marginTop: 10 }]}>
              {days.map((d, i) => {
                const pct = Math.min(100, (d.count / GOAL) * 100);
                return (
                  <View key={d.date} style={[ss.dayRow, { borderBottomWidth: i < days.length - 1 ? 1 : 0, borderBottomColor: th.border }]}>
                    <Text style={{ color: d.isToday ? th.teal : th.text2, fontSize: 12, width: 26, fontWeight: d.isToday ? '600' : '400' }}>{d.label}</Text>
                    <View style={ss.barBg}>
                      <View style={[ss.barFill, { width: `${pct}%` as any, backgroundColor: d.count >= GOAL ? th.teal : d.count > 0 ? `${th.teal}60` : 'transparent' }]} />
                    </View>
                    <Text style={{ color: d.count > 0 ? th.teal : th.label, fontSize: 12, fontWeight: '600', width: 14, textAlign: 'right' }}>{d.count > 0 ? d.count : '·'}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Techniques breakdown */}
          {Object.keys(tc).length > 0 && (
            <View style={{ marginHorizontal: 16 }}>
              <View style={ss.sectionRow}>
                <Text style={[ss.sectionLabel, { color: th.label }]}>TECHNIQUES</Text>
              </View>
              <View style={[ss.card, { marginTop: 10 }]}>
                {TECHNIQUES.filter(t => tc[t.id]).sort((a, b) => (tc[b.id] || 0) - (tc[a.id] || 0)).map((t, i, arr) => {
                  const count = tc[t.id] || 0;
                  return (
                    <View key={t.id} style={[ss.dayRow, { borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: th.border }]}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: t.accent, marginRight: 4 }} />
                      <Text style={{ color: th.text, fontSize: 13, fontWeight: '500', width: 72 }}>{t.name}</Text>
                      <View style={ss.barBg}>
                        <View style={[ss.barFill, { width: `${Math.min(100, (count / maxTc) * 100)}%` as any, backgroundColor: t.accent }]} />
                      </View>
                      <Text style={{ color: th.text2, fontSize: 12, width: 22, textAlign: 'right' }}>{count}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Today's goal */}
          <View style={{ marginHorizontal: 16 }}>
            <View style={[ss.card, { padding: 18 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text style={[ss.sectionLabel, { color: th.label }]}>TODAY'S GOAL</Text>
                <Text style={{ color: th.label, fontSize: 12 }}>{todaySess.length} / {GOAL} sessions</Text>
              </View>
              <View style={[ss.barBg, { height: 5, borderRadius: 3 }]}>
                <View style={[ss.barFill, { height: '100%' as any, width: `${Math.min(100, (todaySess.length / GOAL) * 100)}%` as any, borderRadius: 3, backgroundColor: todaySess.length >= GOAL ? th.teal : th.teal }]} />
              </View>
            </View>
          </View>

          {data.sessions.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: 50 }}>
              <Ionicons name="leaf-outline" size={36} color={th.label} style={{ marginBottom: 12 }} />
              <Text style={{ color: th.label, fontSize: 14, textAlign: 'center', lineHeight: 22 }}>complete your first session{'\n'}to see progress here.</Text>
            </View>
          )}

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = (th: Theme) => StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6, marginBottom: 6 },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  sectionLabel: { fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', fontWeight: '600' },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 16 },

  statsCard: { marginHorizontal: 16, borderRadius: 16, borderWidth: 1, flexDirection: 'row', paddingVertical: 20, marginBottom: 14 },
  statCol: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 24, fontWeight: '300', letterSpacing: -0.8 },
  statLbl: { fontSize: 12, marginTop: 5 },
  statDivider: { width: 1, marginVertical: 4 },

  card: { backgroundColor: th.surf, borderWidth: 1, borderColor: th.border, borderRadius: 16, marginBottom: 14 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 12 },
  tlRow: { flexDirection: 'row', gap: 2, paddingHorizontal: 16, marginBottom: 6 },
  tlSeg: { flex: 1, height: 5, borderRadius: 2 },
  tlLabels: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14 },
  tlLabel: { fontSize: 9 },

  pairRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  pairCard: { flex: 1, borderWidth: 1, borderRadius: 16, padding: 18 },

  dayRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, paddingHorizontal: 16 },
  barBg: { flex: 1, height: 4, backgroundColor: th.border, borderRadius: 2, overflow: 'hidden' },
  barFill: { height: '100%' as any, borderRadius: 2 },
});
