import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, Alert, Linking,
} from 'react-native';
import { AppData } from '../storage';
import { TECHNIQUES, APPS, Technique } from '../data';
import { DARK } from '../theme';
import { calcStreak, todayStr, fmtHHMM } from '../storage';
import * as ScreenTime from '../../modules/screen-time';
const safeSTStatus = () => { try { return ScreenTime.getAuthorizationStatus(); } catch { return 'unavailable'; } };

interface Props {
  data: AppData;
  onUpdate: (d: AppData) => void;
  onStartSession: (tech: Technique, targetApp?: string) => void;
}

const TL_START = 6, TL_END = 22, TL_SLOTS = TL_END - TL_START;

export default function HomeScreen({ data, onUpdate, onStartSession }: Props) {
  const [selTech, setSelTech] = useState(TECHNIQUES[0]);
  const [btab, setBtab] = useState<'practice' | 'learn'>('practice');
  const [expandedLearn, setExpandedLearn] = useState<string | null>(null);
  const [stStatus, setStStatus] = useState<string>(safeSTStatus);

  const streak = calcStreak(data.sessions);
  const today = todayStr();
  const todaySess = data.sessions.filter(s => s.date === today);
  const nowHour = new Date().getHours();
  const activeHours = new Set(todaySess.map(s => (s.hour != null ? s.hour : nowHour)).filter(h => h >= TL_START && h < TL_END));
  const earned = data.earnedMin || 0;
  const spent = data.spentMin || 0;
  const enabledApps = APPS.filter(a => data.appEnabled?.[a.id]);
  const appEarned = data.appEarned || {};
  const cycleSeconds = selTech.phases.reduce((s, p) => s + p.dur, 0);

  const handleRequestST = async () => {
    const res = await ScreenTime.requestAuthorization();
    if (res.authorized) {
      setStStatus('approved');
      Alert.alert('Screen Time', 'Authorization granted. You can now use the app picker to select which apps to block.');
    } else {
      Alert.alert('Screen Time', res.error || 'Authorization denied. Please enable in Settings > Screen Time.');
    }
  };

  const handlePickApps = async () => {
    if (stStatus !== 'approved') { handleRequestST(); return; }
    const res = await ScreenTime.showAppPicker();
    if (res.selected) {
      Alert.alert('Apps Selected', `${res.appCount} app(s) configured for blocking. Breathe sessions will shield them when your limit is reached.`);
    }
  };

  const handleOpenApp = (app: typeof APPS[0]) => {
    const ae = appEarned[app.id] || 0;
    if (ae > 0) {
      Linking.openURL(app.bundleId.includes('instagram') ? 'instagram://' : `https://www.google.com`).catch(() => {});
    } else {
      Alert.alert(
        `${app.name} is sealed 🔒`,
        `Breathe to earn ${app.id} screentime.\n\n1 min breathing = 10 min screen`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Start Breathing', onPress: () => onStartSession(selTech, app.id) },
        ]
      );
    }
  };

  return (
    <SafeAreaView style={ss.root}>
      {/* Header */}
      <View style={ss.header}>
        <View style={ss.logoRow}>
          <View style={[ss.logoBox, { backgroundColor: DARK.teal }]} />
          <Text style={ss.logoTxt}>breathe</Text>
        </View>
        <View style={ss.dayBadge}>
          <View style={[ss.dayDot, { backgroundColor: streak > 0 ? DARK.teal : DARK.label }]} />
          <Text style={ss.dayTxt}>day {streak}</Text>
        </View>
      </View>

      <ScrollView style={ss.scroll} contentContainerStyle={{ paddingBottom: 160 }}>

        {/* BANKED SCREENTIME hero */}
        <View style={ss.section}>
          <Text style={ss.sectionLabel}>BANKED SCREENTIME</Text>
          <View style={ss.heroRow}>
            <Text style={ss.heroNum}>{fmtHHMM(earned).split(':')[0]}</Text>
            <Text style={[ss.heroNum, { color: DARK.label }]}>:</Text>
            <Text style={ss.heroNum}>{fmtHHMM(earned).split(':')[1]}</Text>
            <Text style={ss.heroUnit}>min</Text>
          </View>
          <View style={ss.earnedRow}>
            <Text style={[ss.earnedTxt, { color: DARK.earned }]}>+{fmtHHMM(earned)} earned</Text>
            <Text style={[ss.earnedTxt, { color: DARK.spent }]}>  −{fmtHHMM(spent)} spent</Text>
          </View>
        </View>

        {/* Today's mindful minutes */}
        <View style={[ss.card, { marginHorizontal: 16, marginBottom: 14 }]}>
          <View style={ss.cardHeader}>
            <Text style={ss.cardTxt}>today's mindful minutes</Text>
            <Text style={ss.cardTxt}><Text style={{ color: DARK.teal, fontWeight: '600' }}>{todaySess.length}</Text><Text style={{ color: DARK.label }}>/10</Text></Text>
          </View>
          <View style={ss.tlRow}>
            {Array.from({ length: TL_SLOTS }, (_, i) => {
              const h = TL_START + i;
              const active = activeHours.has(h);
              const curr = h === nowHour;
              return <View key={i} style={[ss.tlSeg, { backgroundColor: active ? DARK.teal : curr ? DARK.teal + '35' : DARK.text4 }]} />;
            })}
          </View>
          <View style={ss.tlLabels}>
            {['6AM', 'NOON', 'NOW', '10PM'].map(l => <Text key={l} style={ss.tlLabel}>{l}</Text>)}
          </View>
        </View>

        {/* LOCKED APPS */}
        <View style={[ss.section, { paddingBottom: 0 }]}>
          <View style={ss.sectionRow}>
            <Text style={ss.sectionLabel}>LOCKED APPS</Text>
            <TouchableOpacity onPress={handlePickApps}>
              <Text style={[ss.sectionAction, { color: DARK.teal }]}>+ pick apps</Text>
            </TouchableOpacity>
          </View>
          <View style={[ss.card, { marginTop: 10, overflow: 'hidden' }]}>
            {enabledApps.length === 0 ? (
              <TouchableOpacity style={{ padding: 18, alignItems: 'center' }} onPress={handlePickApps}>
                <Text style={{ color: DARK.teal, fontSize: 13, fontWeight: '600' }}>tap to pick apps to block →</Text>
              </TouchableOpacity>
            ) : enabledApps.map((app, i) => {
              const ae = appEarned[app.id] || 0;
              const isOpen = ae > 0;
              return (
                <TouchableOpacity key={app.id} style={[ss.appRow, { borderBottomWidth: i < enabledApps.length - 1 ? 1 : 0, borderBottomColor: DARK.border }]} onPress={() => handleOpenApp(app)}>
                  <View style={[ss.appIcon, { backgroundColor: app.color }]}>
                    <Text style={ss.appInitials}>{app.initials}</Text>
                    {!isOpen && <View style={ss.lockDot}><Text style={{ fontSize: 7 }}>🔒</Text></View>}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={ss.appName}>{app.name}</Text>
                    <Text style={[ss.appStatus, { color: isOpen ? DARK.teal : DARK.sealed }]}>
                      {isOpen ? `${ae}:00 left · tap to open` : 'sealed · tap to breathe'}
                    </Text>
                  </View>
                  <Text style={[ss.appAction, { color: isOpen ? DARK.teal : DARK.text4 }]}>{isOpen ? 'open' : '—'}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* BREATHING section */}
        <View style={[ss.section, { marginTop: 20 }]}>
          <View style={ss.sectionRow}>
            <Text style={ss.sectionLabel}>BREATHING</Text>
            <View style={ss.tabPill}>
              {(['practice', 'learn'] as const).map(t => (
                <TouchableOpacity key={t} onPress={() => setBtab(t)} style={[ss.tabBtn, btab === t ? ss.tabBtnActive : {}]}>
                  <Text style={[ss.tabBtnTxt, btab === t ? ss.tabBtnTxtActive : {}]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {btab === 'practice' ? (
            <>
              {/* Technique chips */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 8, paddingRight: 20 }}>
                {TECHNIQUES.map(t => {
                  const active = selTech.id === t.id;
                  return (
                    <TouchableOpacity key={t.id} onPress={() => setSelTech(t)} style={[ss.chip, { backgroundColor: active ? t.accent : DARK.text4, borderColor: active ? t.accent : DARK.border }]}>
                      <Text style={[ss.chipTxt, { color: active ? '#07111e' : DARK.text2 }]}>{t.name}</Text>
                      <Text style={[ss.chipTag, { color: active ? '#07111e99' : DARK.label }]}>{t.tag}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Selected tech detail */}
              <View style={[ss.techDetail, { borderColor: 'rgba(255,255,255,0.07)' }]}>
                <View style={ss.techDetailRow}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={ss.techDetailName}>{selTech.name}</Text>
                    <Text style={ss.techDetailDesc}>{selTech.desc}</Text>
                    <Text style={[ss.techDetailPhase, { fontVariant: ['tabular-nums'] }]}>
                      {selTech.phases.map((p, i) => `${i > 0 ? ' · ' : ''}${p.dur}`).join('')}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[ss.techEarn, { color: selTech.accent }]}>+{Math.floor(cycleSeconds * 10 / 60)}m</Text>
                    <Text style={ss.techEarnSub}>per cycle</Text>
                  </View>
                </View>
              </View>
            </>
          ) : (
            // Learn tab
            TECHNIQUES.map(t => {
              const isExp = expandedLearn === t.id;
              const maxPhase = Math.max(...t.phases.map(p => p.dur));
              return (
                <View key={t.id} style={{ marginBottom: 10 }}>
                  <TouchableOpacity style={[ss.learnCard, { borderBottomLeftRadius: isExp ? 0 : 13, borderBottomRightRadius: isExp ? 0 : 13 }]} onPress={() => setExpandedLearn(isExp ? null : t.id)}>
                    <View style={ss.learnCardHeader}>
                      <View>
                        <View style={[ss.tagPill, { backgroundColor: t.tagBg }]}>
                          <Text style={[ss.tagPillTxt, { color: t.accent }]}>{t.tag}</Text>
                        </View>
                        <Text style={ss.learnName}>{t.name}</Text>
                      </View>
                      <Text style={[ss.learnChevron, { color: t.accent }]}>{isExp ? '↑' : '↓'}</Text>
                    </View>
                    {t.phases.map((p, pi) => (
                      <View key={pi} style={ss.phaseBarRow}>
                        <Text style={ss.phaseBarLabel}>{p.label}</Text>
                        <View style={ss.phaseBarBg}>
                          <View style={[ss.phaseBarFill, { width: `${(p.dur / maxPhase) * 100}%` as any, backgroundColor: t.accent }]} />
                        </View>
                        <Text style={ss.phaseBarDur}>{p.dur}s</Text>
                      </View>
                    ))}
                  </TouchableOpacity>
                  {isExp && (
                    <View style={[ss.learnExpanded, { borderColor: 'rgba(255,255,255,0.07)' }]}>
                      <Text style={ss.learnExpandedSec}>HOW TO DO IT</Text>
                      {/* Steps omitted for brevity — rendered from TECHNIQUE_INFO in practice */}
                      <Text style={{ color: DARK.text2, fontSize: 13, lineHeight: 20 }}>{t.desc}</Text>
                      <TouchableOpacity style={[ss.startBtn, { backgroundColor: t.accent, marginTop: 14 }]} onPress={() => { setSelTech(t); setBtab('practice'); }}>
                        <Text style={[ss.startBtnTxt, { color: '#07111e' }]}>start {t.name} →</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Sticky begin session */}
      <View style={ss.stickyBottom}>
        <TouchableOpacity style={[ss.beginCard, { borderColor: 'rgba(255,255,255,0.13)' }]} onPress={() => onStartSession(selTech)}>
          <Text style={ss.beginCardTitle}>begin session</Text>
          <Text style={ss.beginCardSub}>{selTech.name} · {selTech.phases.map(p => p.dur).join('·')} · ~{cycleSeconds * 10}:00 reward</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const ss = StyleSheet.create({
  root: { flex: 1, backgroundColor: DARK.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoBox: { width: 18, height: 18, borderRadius: 5 },
  logoTxt: { color: DARK.text, fontSize: 17, fontWeight: '600', letterSpacing: -0.3 },
  dayBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: DARK.text4, borderWidth: 1, borderColor: DARK.border, borderRadius: 20, paddingHorizontal: 11, paddingVertical: 5 },
  dayDot: { width: 6, height: 6, borderRadius: 3 },
  dayTxt: { color: DARK.text2, fontSize: 12, fontWeight: '500' },
  scroll: { flex: 1 },
  section: { paddingHorizontal: 20, marginBottom: 8 },
  sectionLabel: { color: DARK.label, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', fontWeight: '500', marginBottom: 2 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  sectionAction: { fontSize: 12, fontWeight: '600' },
  heroRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, marginBottom: 8 },
  heroNum: { color: DARK.text, fontSize: 58, fontWeight: '300', letterSpacing: -2, lineHeight: 64, fontVariant: ['tabular-nums'] as any },
  heroUnit: { color: DARK.text2, fontSize: 15, marginBottom: 8, marginLeft: 6 },
  earnedRow: { flexDirection: 'row', gap: 16 },
  earnedTxt: { fontSize: 13, fontWeight: '500' },
  card: { backgroundColor: DARK.surf, borderWidth: 1, borderColor: DARK.border, borderRadius: 13 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, paddingBottom: 10 },
  cardTxt: { color: DARK.text, fontSize: 13 },
  tlRow: { flexDirection: 'row', gap: 2, paddingHorizontal: 14, marginBottom: 5 },
  tlSeg: { flex: 1, height: 5, borderRadius: 2 },
  tlLabels: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingBottom: 12 },
  tlLabel: { color: DARK.label, fontSize: 9, letterSpacing: 0.5 },
  appRow: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 12, paddingHorizontal: 15 },
  appIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  appInitials: { color: 'rgba(255,255,255,0.92)', fontSize: 11, fontWeight: '700' },
  lockDot: { position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, borderRadius: 7, backgroundColor: DARK.bg, alignItems: 'center', justifyContent: 'center' },
  appName: { color: DARK.text, fontSize: 14, fontWeight: '500' },
  appStatus: { fontSize: 12, marginTop: 1 },
  appAction: { fontSize: 13, fontWeight: '600', letterSpacing: 0.3 },
  tabPill: { flexDirection: 'row', gap: 3, backgroundColor: DARK.text4, borderRadius: 20, padding: 3 },
  tabBtn: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 4 },
  tabBtnActive: { backgroundColor: DARK.surf, borderWidth: 1, borderColor: DARK.border },
  tabBtnTxt: { color: DARK.label, fontSize: 11, fontWeight: '400' },
  tabBtnTxtActive: { color: DARK.text, fontWeight: '500' },
  chip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  chipTxt: { fontSize: 13, fontWeight: '500' },
  chipTag: { fontSize: 11 },
  techDetail: { backgroundColor: DARK.surf, borderWidth: 1, borderRadius: 13, padding: 14, marginBottom: 10 },
  techDetailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  techDetailName: { color: 'rgba(255,255,255,0.88)', fontSize: 14, fontWeight: '600', marginBottom: 3 },
  techDetailDesc: { color: 'rgba(255,255,255,0.42)', fontSize: 12, lineHeight: 18, marginBottom: 8 },
  techDetailPhase: { color: 'rgba(255,255,255,0.45)', fontSize: 11, fontFamily: 'Courier' },
  techEarn: { fontSize: 12, fontWeight: '600', marginBottom: 1 },
  techEarnSub: { color: 'rgba(255,255,255,0.30)', fontSize: 10 },
  learnCard: { backgroundColor: '#0a1e40', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', borderRadius: 13, padding: 14 },
  learnCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  learnName: { color: 'rgba(255,255,255,0.90)', fontSize: 14, fontWeight: '600', marginTop: 5 },
  learnChevron: { fontSize: 13, marginTop: 4 },
  tagPill: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  tagPillTxt: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  phaseBarRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
  phaseBarLabel: { color: 'rgba(255,255,255,0.28)', fontSize: 9, width: 38 },
  phaseBarBg: { flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2 },
  phaseBarFill: { height: '100%' as any, borderRadius: 2, opacity: 0.7 },
  phaseBarDur: { color: 'rgba(255,255,255,0.28)', fontSize: 9, width: 16, textAlign: 'right' },
  learnExpanded: { backgroundColor: DARK.surf, borderWidth: 1, borderTopWidth: 0, borderBottomLeftRadius: 13, borderBottomRightRadius: 13, padding: 16 },
  learnExpandedSec: { color: DARK.label, fontSize: 9, letterSpacing: 1.8, textTransform: 'uppercase', fontWeight: '500', marginBottom: 10 },
  startBtn: { borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  startBtnTxt: { fontSize: 13, fontWeight: '700' },
  stickyBottom: { position: 'absolute', bottom: 88, left: 0, right: 0, paddingHorizontal: 16 },
  beginCard: { backgroundColor: 'rgba(44,92,152,0.85)', borderWidth: 1, borderRadius: 15, paddingVertical: 18, paddingHorizontal: 20, alignItems: 'center' },
  beginCardTitle: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 4, letterSpacing: -0.3 },
  beginCardSub: { color: 'rgba(255,255,255,0.5)', fontSize: 11, letterSpacing: 0.3, fontFamily: 'Courier' },
});
