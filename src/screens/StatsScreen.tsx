import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { AppData, calcStreak, last7, fmtHHMM, todayStr } from '../storage';
import { TECHNIQUES } from '../data';
import { DARK } from '../theme';

const TL_START = 6, TL_END = 22, TL_SLOTS = TL_END - TL_START;

export default function StatsScreen({ data }: { data: AppData }) {
  const streak = calcStreak(data.sessions);
  const today = todayStr();
  const todaySess = data.sessions.filter(s => s.date === today);
  const nowHour = new Date().getHours();
  const activeHours = new Set(todaySess.map(s => (s.hour != null ? s.hour : nowHour)).filter(h => h >= TL_START && h < TL_END));
  const days = last7(data.sessions);
  const GOAL = 3;

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
  const weekSess = data.sessions.filter(s => { const d = new Date(); d.setDate(d.getDate() - 6); return new Date(s.date) >= d; }).length;

  return (
    <SafeAreaView style={ss.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>

        {/* TOTAL BREATHED hero */}
        <View style={ss.section}>
          <Text style={ss.sectionLabel}>TOTAL BREATHED</Text>
          <View style={ss.heroRow}>
            <Text style={ss.heroNum}>{fmtHHMM(data.totalMin).split(':')[0]}</Text>
            <Text style={[ss.heroNum, { color: DARK.label }]}>:</Text>
            <Text style={ss.heroNum}>{fmtHHMM(data.totalMin).split(':')[1]}</Text>
            <Text style={ss.heroUnit}>min</Text>
          </View>
          <View style={ss.subRow}>
            <Text style={[ss.subTxt, { color: DARK.teal }]}>+{data.sessions.length} sessions</Text>
            <Text style={[ss.subTxt, { color: DARK.text2 }]}>  · {streak} day streak</Text>
          </View>
        </View>

        {/* Today's mindful minutes */}
        <View style={[ss.card, { marginHorizontal: 20, marginBottom: 14 }]}>
          <View style={ss.cardRow}>
            <Text style={ss.cardTxt}>today's mindful minutes</Text>
            <Text style={ss.cardTxt}><Text style={{ color: DARK.teal, fontWeight: '600' }}>{todaySess.length}</Text><Text style={{ color: DARK.label }}>/10</Text></Text>
          </View>
          <View style={ss.tlRow}>
            {Array.from({ length: TL_SLOTS }, (_, i) => {
              const h = TL_START + i;
              return <View key={i} style={[ss.tlSeg, { backgroundColor: activeHours.has(h) ? DARK.teal : h === nowHour ? DARK.teal + '35' : DARK.text4 }]} />;
            })}
          </View>
          <View style={ss.tlLabels}>
            {['6AM', 'NOON', 'NOW', '10PM'].map(l => <Text key={l} style={ss.tlLabel}>{l}</Text>)}
          </View>
        </View>

        {/* Streak pair */}
        <View style={[ss.pairRow, { paddingHorizontal: 20, marginBottom: 14 }]}>
          <View style={[ss.pairCard, { backgroundColor: streak > 0 ? 'rgba(232,162,60,0.08)' : DARK.surf, borderColor: streak > 0 ? 'rgba(232,162,60,0.18)' : DARK.border }]}>
            <Text style={ss.pairLabel}>STREAK</Text>
            <View style={ss.pairNumRow}>
              <Text style={[ss.pairNum, { color: streak > 0 ? '#e8a23c' : DARK.text2 }]}>{streak}</Text>
              <Text style={[ss.pairUnit, { color: streak > 0 ? 'rgba(232,162,60,0.55)' : DARK.label }]}>days</Text>
            </View>
            <Text style={[ss.pairSub, { color: streak > 0 ? 'rgba(232,162,60,0.55)' : DARK.label }]}>
              {streak >= 7 ? '🔥 on fire' : streak >= 3 ? '✦ building' : streak > 0 ? '◎ started' : '🌱 begin'}
            </Text>
          </View>
          <View style={[ss.pairCard, { backgroundColor: DARK.surf, borderColor: DARK.border }]}>
            <Text style={ss.pairLabel}>BEST</Text>
            <View style={ss.pairNumRow}>
              <Text style={[ss.pairNum, { color: DARK.text }]}>{best}</Text>
              <Text style={[ss.pairUnit, { color: DARK.label }]}>days</Text>
            </View>
            <Text style={[ss.pairSub, { color: DARK.label }]}>personal best</Text>
          </View>
        </View>

        {/* LAST 7 DAYS */}
        <View style={ss.section}>
          <View style={ss.sectionRow}>
            <Text style={ss.sectionLabel}>LAST 7 DAYS</Text>
            <Text style={{ color: DARK.label, fontSize: 11 }}>{weekSess} sessions</Text>
          </View>
          <View style={[ss.card, { marginTop: 10 }]}>
            {days.map((d, i) => {
              const pct = Math.min(100, (d.count / GOAL) * 100);
              return (
                <View key={d.date} style={[ss.dayRow, { borderBottomWidth: i < days.length - 1 ? 1 : 0, borderBottomColor: DARK.border }]}>
                  <Text style={[ss.dayLabel, { color: d.isToday ? DARK.teal : DARK.text2, fontWeight: d.isToday ? '600' : '400' }]}>{d.label}</Text>
                  <View style={ss.dayBarBg}>
                    <View style={[ss.dayBarFill, { width: `${pct}%` as any, backgroundColor: d.count >= GOAL ? DARK.teal : d.count > 0 ? DARK.teal + '60' : 'transparent' }]} />
                  </View>
                  <Text style={[ss.dayCount, { color: d.count > 0 ? DARK.teal : DARK.label }]}>{d.count > 0 ? d.count : '·'}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* TECHNIQUES */}
        {Object.keys(tc).length > 0 && (
          <View style={ss.section}>
            <Text style={ss.sectionLabel}>TECHNIQUES</Text>
            <View style={[ss.card, { marginTop: 10 }]}>
              {TECHNIQUES.filter(t => tc[t.id]).sort((a, b) => (tc[b.id] || 0) - (tc[a.id] || 0)).map((t, i, arr) => {
                const count = tc[t.id] || 0;
                return (
                  <View key={t.id} style={[ss.techRow, { borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: DARK.border }]}>
                    <View style={[ss.techDot, { backgroundColor: t.accent }]} />
                    <Text style={ss.techName}>{t.name}</Text>
                    <View style={ss.techBarBg}>
                      <View style={[ss.techBarFill, { width: `${Math.min(100, (count / maxTc) * 100)}%` as any, backgroundColor: t.accent }]} />
                    </View>
                    <Text style={ss.techCount}>{count}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* TODAY'S GOAL */}
        <View style={ss.section}>
          <View style={[ss.card, { padding: 15 }]}>
            <View style={ss.goalRow}>
              <Text style={ss.sectionLabel}>TODAY'S GOAL</Text>
              <Text style={{ color: DARK.label, fontSize: 12 }}>{todaySess.length} / {GOAL} sessions</Text>
            </View>
            <View style={ss.goalBarBg}>
              <View style={[ss.goalBarFill, { width: `${Math.min(100, (todaySess.length / GOAL) * 100)}%` as any, backgroundColor: todaySess.length >= GOAL ? '#4dbfae' : DARK.teal }]} />
            </View>
          </View>
        </View>

        {data.sessions.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Text style={{ fontSize: 36, marginBottom: 12 }}>🌬️</Text>
            <Text style={{ color: DARK.label, fontSize: 14, textAlign: 'center' }}>complete your first session{'\n'}to see progress here.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const ss = StyleSheet.create({
  root: { flex: 1, backgroundColor: DARK.bg },
  section: { paddingHorizontal: 20, marginBottom: 8, marginTop: 20 },
  sectionLabel: { color: DARK.label, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', fontWeight: '500' },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, marginTop: 8, marginBottom: 8 },
  heroNum: { color: DARK.text, fontSize: 56, fontWeight: '300', letterSpacing: -2, lineHeight: 62 },
  heroUnit: { color: DARK.text2, fontSize: 14, marginBottom: 8, marginLeft: 6 },
  subRow: { flexDirection: 'row' },
  subTxt: { fontSize: 13, fontWeight: '500' },
  card: { backgroundColor: DARK.surf, borderWidth: 1, borderColor: DARK.border, borderRadius: 13 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, paddingBottom: 10 },
  cardTxt: { color: DARK.text, fontSize: 13 },
  tlRow: { flexDirection: 'row', gap: 2, paddingHorizontal: 14, marginBottom: 5 },
  tlSeg: { flex: 1, height: 5, borderRadius: 2 },
  tlLabels: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingBottom: 12 },
  tlLabel: { color: DARK.label, fontSize: 9 },
  pairRow: { flexDirection: 'row', gap: 10 },
  pairCard: { flex: 1, borderWidth: 1, borderRadius: 13, padding: 16 },
  pairLabel: { color: DARK.label, fontSize: 9, letterSpacing: 1.8, textTransform: 'uppercase', marginBottom: 8 },
  pairNumRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 5, marginBottom: 4 },
  pairNum: { fontSize: 38, fontWeight: '300', letterSpacing: -1.5 },
  pairUnit: { fontSize: 12, marginBottom: 5 },
  pairSub: { fontSize: 11 },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 11, paddingHorizontal: 15 },
  dayLabel: { fontSize: 12, width: 26 },
  dayBarBg: { flex: 1, height: 4, backgroundColor: DARK.text4, borderRadius: 2, overflow: 'hidden' },
  dayBarFill: { height: '100%' as any, borderRadius: 2 },
  dayCount: { fontSize: 12, fontWeight: '600', width: 14, textAlign: 'right' },
  techRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, paddingHorizontal: 15 },
  techDot: { width: 8, height: 8, borderRadius: 4 },
  techName: { color: DARK.text, fontSize: 13, fontWeight: '500', width: 68 },
  techBarBg: { flex: 1, height: 4, backgroundColor: DARK.text4, borderRadius: 2, overflow: 'hidden' },
  techBarFill: { height: '100%' as any, borderRadius: 2 },
  techCount: { color: DARK.text2, fontSize: 12, width: 22, textAlign: 'right' },
  goalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  goalBarBg: { height: 4, backgroundColor: DARK.text4, borderRadius: 2 },
  goalBarFill: { height: '100%' as any, borderRadius: 2 },
});
