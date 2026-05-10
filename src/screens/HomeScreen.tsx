import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, Alert, Linking, Vibration,
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
  isPrem?: boolean;
  onShowPremium?: () => void;
}

const TL_START = 6, TL_END = 22, TL_SLOTS = TL_END - TL_START;

export default function HomeScreen({ data, onUpdate, onStartSession, isPrem, onShowPremium }: Props) {
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
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          {!isPrem && (
            <TouchableOpacity onPress={onShowPremium} style={ss.premBtn}>
              <Text style={ss.premBtnTxt}>✦ Premium</Text>
            </TouchableOpacity>
          )}
          <View style={ss.dayBadge}>
            <View style={[ss.dayDot, { backgroundColor: streak > 0 ? DARK.teal : DARK.label }]} />
            <Text style={ss.dayTxt}>day {streak}</Text>
          </View>
        </View>
      </View>

      <ScrollView style={ss.scroll} contentContainerStyle={{ paddingBottom: 24 }}>

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

        {/* LOCKED APPS — matches reference screenshot */}
        <View style={[ss.section, { paddingBottom: 0 }]}>
          <View style={ss.lockedCard}>
            {/* Header row */}
            <View style={ss.lockedHeader}>
              <View style={ss.lockedIconBox}><Text style={{ fontSize: 18 }}>🔒</Text></View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={ss.lockedTitle}>Apps Blocked</Text>
                <Text style={ss.lockedSub}>Complete a breathing session to unlock</Text>
              </View>
              <View style={ss.recDot} />
            </View>

            {/* Blocked Apps label + Manage */}
            <View style={ss.lockedMeta}>
              <Text style={ss.lockedMetaL}>Blocked Apps</Text>
              <TouchableOpacity onPress={handlePickApps}>
                <Text style={ss.lockedManage}>Manage →</Text>
              </TouchableOpacity>
            </View>

            {/* App pills — horizontal scroll like screenshot */}
            {enabledApps.length === 0 ? (
              <TouchableOpacity onPress={handlePickApps} style={{ paddingBottom: 14 }}>
                <Text style={{ color: DARK.teal, fontSize: 13, fontWeight: '600' }}>+ pick apps to block</Text>
              </TouchableOpacity>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ height: 46, marginBottom: 14 }} contentContainerStyle={{ gap: 8, alignItems: 'center' }}>
                {enabledApps.map(app => {
                  const ae = appEarned[app.id] || 0;
                  const isOpen = ae > 0;
                  return (
                    <TouchableOpacity key={app.id} onPress={() => handleOpenApp(app)}
                      style={[ss.appPill, { borderColor: isOpen ? 'rgba(79,205,216,0.35)' : 'rgba(200,50,50,0.38)', backgroundColor: isOpen ? 'rgba(79,205,216,0.12)' : 'rgba(200,50,50,0.18)' }]}>
                      <View style={[ss.pillIcon, { backgroundColor: app.color }]}>
                        <Text style={ss.pillInitials}>{app.initials}</Text>
                      </View>
                      <Text style={ss.pillName}>{app.name}</Text>
                      <Text style={{ fontSize: 12 }}>{isOpen ? '🔓' : '🔒'}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* Breathe to Unlock — blue CTA matching screenshot */}
            <TouchableOpacity style={ss.unlockBtn} onPress={() => onStartSession(selTech)}>
              <Text style={{ fontSize: 20 }}>⚡</Text>
              <View style={{ flex: 1 }}>
                <Text style={ss.unlockTitle}>Breathe to Unlock Apps</Text>
                <Text style={ss.unlockSub}>{selTech.name} · {selTech.phases.map(p => p.dur).join('·')}</Text>
              </View>
              <View style={ss.unlockBadge}>
                <Text style={{ fontSize: 11 }}>⏱</Text>
                <Text style={ss.unlockBadgeTxt}>{earned > 0 ? `${earned}m` : `${cycleSeconds * 10}:00`} unlock</Text>
              </View>
            </TouchableOpacity>
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
                    <Text style={[ss.techDetailPhase, {}]}>
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

      {/* Fixed bottom breathe button — not floating */}
      <View style={ss.fixedBottom}>
        <TouchableOpacity style={ss.beginCard} onPress={() => onStartSession(selTech)}>
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
  premBtn: { backgroundColor: 'rgba(164,142,232,0.18)', borderWidth: 1, borderColor: 'rgba(164,142,232,0.40)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  premBtnTxt: { color: '#a48ee8', fontSize: 12, fontWeight: '700' },
  dayDot: { width: 6, height: 6, borderRadius: 3 },
  dayTxt: { color: DARK.text2, fontSize: 12, fontWeight: '500' },
  scroll: { flex: 1 },
  section: { paddingHorizontal: 20, marginBottom: 8 },
  sectionLabel: { color: DARK.label, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', fontWeight: '500', marginBottom: 2 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  sectionAction: { fontSize: 12, fontWeight: '600' },
  heroRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, marginBottom: 8 },
  heroNum: { color: DARK.text, fontSize: 58, fontWeight: '300', letterSpacing: -2, lineHeight: 64 },
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
  // Locked apps card — matches screenshot
  lockedCard: { backgroundColor: '#0d1520', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: 'rgba(220,60,60,0.20)', marginBottom: 4 },
  lockedHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  lockedIconBox: { width: 40, height: 40, borderRadius: 11, backgroundColor: 'rgba(220,60,60,0.22)', borderWidth: 1, borderColor: 'rgba(220,60,60,0.40)', alignItems: 'center', justifyContent: 'center' },
  lockedTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  lockedSub: { color: 'rgba(255,255,255,0.42)', fontSize: 12, marginTop: 1 },
  recDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#cc2200' },
  lockedMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  lockedMetaL: { color: 'rgba(255,255,255,0.50)', fontSize: 13, fontWeight: '500' },
  lockedManage: { color: '#4a90d9', fontSize: 13, fontWeight: '600' },
  appPill: { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderRadius: 22, paddingHorizontal: 11, paddingVertical: 8 },
  pillIcon: { width: 26, height: 26, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  pillInitials: { color: 'rgba(255,255,255,0.92)', fontSize: 10, fontWeight: '700' },
  pillName: { color: 'rgba(255,255,255,0.88)', fontSize: 13, fontWeight: '500' },
  unlockBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2563eb', borderRadius: 13, padding: 14, gap: 10 },
  unlockTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  unlockSub: { color: 'rgba(255,255,255,0.60)', fontSize: 11, marginTop: 1, fontFamily: 'Courier' },
  unlockBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  unlockBadgeTxt: { color: '#fff', fontSize: 12, fontWeight: '600' },
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
  fixedBottom: { paddingHorizontal: 16, paddingVertical: 10, paddingBottom: 12, borderTopWidth: 1, borderTopColor: DARK.border, backgroundColor: DARK.bg },
  beginCard: { backgroundColor: 'rgba(44,92,152,0.92)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.13)', borderRadius: 15, paddingVertical: 18, paddingHorizontal: 20, alignItems: 'center' },
  beginCardTitle: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 4, letterSpacing: -0.3 },
  beginCardSub: { color: 'rgba(255,255,255,0.5)', fontSize: 11, letterSpacing: 0.3, fontFamily: 'Courier' },
});
