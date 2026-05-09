import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, Alert, Linking, Switch,
} from 'react-native';
import { AppData } from '../storage';
import { APPS, TECHNIQUES, Technique } from '../data';
import { DARK } from '../theme';
import { fmtHHMM } from '../storage';
import * as ScreenTime from '../../modules/screen-time';
const safeSTStatus = () => { try { return ScreenTime.getAuthorizationStatus(); } catch { return 'unavailable'; } };

const LIMIT_STEPS = [5, 10, 15, 20, 30, 45, 60, 90, 120];
const nextStep = (v: number, dir: number) => {
  const i = LIMIT_STEPS.indexOf(v);
  if (i === -1) return dir > 0 ? LIMIT_STEPS[1] : LIMIT_STEPS[0];
  return LIMIT_STEPS[Math.max(0, Math.min(LIMIT_STEPS.length - 1, i + dir))];
};

interface Props {
  data: AppData;
  onUpdate: (d: AppData) => void;
  onStartSession: (tech: Technique, targetApp?: string) => void;
}

export default function ScreentimeScreen({ data, onUpdate, onStartSession }: Props) {
  const [stStatus, setStStatus] = useState<string>(safeSTStatus);
  const [shielded, setShielded] = useState(data.stShieldEnabled || false);
  const [doneSteps, setDoneSteps] = useState<Record<string, boolean>>({});

  const earned = data.earnedMin || 0;
  const appEnabled = data.appEnabled || {};
  const appLimits = data.appLimits || {};
  const appEarned = data.appEarned || {};

  const toggleApp = (id: string) => {
    onUpdate({ ...data, appEnabled: { ...appEnabled, [id]: !appEnabled[id] } });
  };

  const adjustLimit = (id: string, dir: number) => {
    onUpdate({ ...data, appLimits: { ...appLimits, [id]: nextStep(appLimits[id] || 30, dir) } });
  };

  const useTime = (id: string, min: number) => {
    const ae = { ...appEarned };
    if ((ae[id] || 0) < min) return;
    ae[id] = (ae[id] || 0) - min;
    onUpdate({ ...data, appEarned: ae, spentMin: (data.spentMin || 0) + min });
  };

  const handleRequestAuth = async () => {
    const res = await ScreenTime.requestAuthorization();
    if (res.authorized) {
      setStStatus('approved');
      Alert.alert('✓ Authorized', 'Screen Time access granted. You can now pick apps to block.');
    } else {
      Alert.alert('Authorization Failed', res.error || 'Go to Settings → Privacy → Screen Time and enable access.');
      Linking.openURL('App-Prefs:root=SCREENTIME');
    }
  };

  const handlePickApps = async () => {
    if (stStatus !== 'approved') { await handleRequestAuth(); return; }
    const res = await ScreenTime.showAppPicker();
    if (res.selected) {
      Alert.alert('Apps Configured', `${res.appCount} app(s) selected. Tap "Shield Apps" to block them when limit is reached.`);
    }
  };

  const handleShield = async () => {
    if (stStatus !== 'approved') { await handleRequestAuth(); return; }
    if (shielded) {
      await ScreenTime.unshieldApps();
      setShielded(false);
      onUpdate({ ...data, stShieldEnabled: false });
      Alert.alert('Apps Unblocked', 'The selected apps are now accessible again.');
    } else {
      const res = await ScreenTime.shieldApps();
      if (res.success) {
        setShielded(true);
        onUpdate({ ...data, stShieldEnabled: true });
        Alert.alert('Apps Blocked 🔒', 'Selected apps are now shielded. Breathe to earn access back.');
      }
    }
  };

  const markStep = (id: string) => setDoneSteps(d => ({ ...d, [id]: !d[id] }));

  const openSettings = () => Linking.openURL('App-Prefs:root=SCREENTIME');

  return (
    <SafeAreaView style={ss.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Hero */}
        <View style={ss.section}>
          <Text style={ss.sectionLabel}>SCREENTIME</Text>
          <View style={ss.heroRow}>
            <Text style={ss.heroNum}>{fmtHHMM(earned)}</Text>
            <Text style={ss.heroUnit}>min banked</Text>
          </View>
        </View>

        {/* Screen Time Authorization */}
        <View style={ss.section}>
          <View style={[ss.authCard, { borderColor: stStatus === 'approved' ? DARK.teal + '55' : DARK.border }]}>
            <View style={ss.authRow}>
              <View style={{ flex: 1 }}>
                <Text style={ss.authTitle}>Screen Time Access</Text>
                <Text style={[ss.authStatus, { color: stStatus === 'approved' ? DARK.teal : DARK.label }]}>
                  {stStatus === 'approved' ? '✓ authorized' : stStatus === 'denied' ? '✕ denied' : '○ not set up'}
                </Text>
              </View>
              {stStatus !== 'approved' && (
                <TouchableOpacity style={[ss.authBtn, { backgroundColor: DARK.teal }]} onPress={handleRequestAuth}>
                  <Text style={ss.authBtnTxt}>Enable →</Text>
                </TouchableOpacity>
              )}
            </View>
            {stStatus === 'approved' && (
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <TouchableOpacity style={[ss.actionBtn, { flex: 1, borderColor: DARK.teal + '55' }]} onPress={handlePickApps}>
                  <Text style={[ss.actionBtnTxt, { color: DARK.teal }]}>⚙ Pick Apps to Block</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[ss.actionBtn, { flex: 1, borderColor: shielded ? DARK.sealed : DARK.teal + '55', backgroundColor: shielded ? 'rgba(220,90,90,0.12)' : 'rgba(79,205,216,0.08)' }]} onPress={handleShield}>
                  <Text style={[ss.actionBtnTxt, { color: shielded ? DARK.sealed : DARK.teal }]}>
                    {shielded ? '🔓 Unshield Apps' : '🔒 Shield Apps'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Pool */}
        <View style={[ss.section]}>
          <View style={[ss.poolCard]}>
            <View style={{ flex: 1 }}>
              <Text style={ss.poolLabel}>POOL BALANCE</Text>
              <Text style={ss.poolNum}>{fmtHHMM(earned)}</Text>
              <Text style={ss.poolSub}>1 min breathing = 10 min screen</Text>
            </View>
            <View style={ss.poolBadge}>
              <Text style={ss.poolBadgeLabel}>APPS</Text>
              <Text style={ss.poolBadgeNum}>{APPS.filter(a => appEnabled[a.id]).length}</Text>
              <Text style={ss.poolBadgeSub}>locked</Text>
            </View>
          </View>
        </View>

        {/* App Blocking */}
        <View style={ss.section}>
          <Text style={ss.sectionLabel}>APP BLOCKING</Text>
          {APPS.map((app, i) => {
            const on = !!appEnabled[app.id];
            const lim = appLimits[app.id] || app.limit;
            const ae = appEarned[app.id] || 0;
            const pct = Math.min(100, (ae / Math.max(lim, 1)) * 100);

            return (
              <View key={app.id} style={[ss.appCard, { borderColor: on ? DARK.borderHi : DARK.border, opacity: on ? 1 : 0.65 }, { marginTop: i === 0 ? 10 : 0 }]}>
                <View style={ss.appCardHeader}>
                  <View style={[ss.appIcon, { backgroundColor: app.color }]}>
                    <Text style={ss.appInitials}>{app.initials}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={ss.appName}>{app.name}</Text>
                    <Text style={ss.appLimitTxt}>block after <Text style={{ color: on ? DARK.teal : DARK.label, fontWeight: '600' }}>{lim}m</Text>/day</Text>
                  </View>
                  <Switch value={on} onValueChange={() => toggleApp(app.id)} trackColor={{ true: DARK.teal, false: DARK.text4 }} thumbColor="#fff" />
                </View>

                {on && (
                  <>
                    <View style={ss.limitRow}>
                      <Text style={ss.limitLabel}>daily limit</Text>
                      <View style={ss.limitControls}>
                        <TouchableOpacity style={ss.stepBtn} onPress={() => adjustLimit(app.id, -1)}>
                          <Text style={ss.stepBtnTxt}>−</Text>
                        </TouchableOpacity>
                        <Text style={ss.limitVal}>{lim}m</Text>
                        <TouchableOpacity style={ss.stepBtn} onPress={() => adjustLimit(app.id, +1)}>
                          <Text style={ss.stepBtnTxt}>+</Text>
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity style={ss.applyBtn} onPress={() => {
                        Alert.alert(
                          `Set ${app.name} to ${lim}m/day`,
                          `Steps:\n1. Open App Limits\n2. Add Limit\n3. Search "${app.name}"\n4. Set ${lim} min\n5. Enable "Block at End of Limit"`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Open Screen Time', onPress: openSettings },
                          ]
                        );
                      }}>
                        <Text style={ss.applyBtnTxt}>Apply to iPhone →</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={ss.earnedSection}>
                      <View style={ss.earnedHeader}>
                        <Text style={ss.earnedLabel}>earned for {app.name}</Text>
                        <Text style={ss.earnedVal}>{ae} min</Text>
                      </View>
                      <View style={ss.progressBg}>
                        <View style={[ss.progressFill, { width: `${pct}%` as any }]} />
                      </View>
                      <View style={ss.useRow}>
                        {[10, 20, 30].map(m => (
                          <TouchableOpacity key={m} onPress={() => useTime(app.id, m)} style={[ss.useBtn, { backgroundColor: ae >= m ? 'rgba(164,142,232,0.10)' : DARK.text4, borderColor: ae >= m ? 'rgba(164,142,232,0.28)' : DARK.border, opacity: ae >= m ? 1 : 0.35 }]}>
                            <Text style={[ss.useBtnTxt, { color: ae >= m ? '#a48ee8' : DARK.label }]}>use {m}m</Text>
                          </TouchableOpacity>
                        ))}
                        <TouchableOpacity onPress={() => onStartSession(TECHNIQUES[0], app.id)} style={[ss.useBtn, { flex: 1, backgroundColor: 'rgba(79,205,216,0.08)', borderColor: DARK.teal + '44' }]}>
                          <Text style={[ss.useBtnTxt, { color: DARK.teal }]}>+ breathe</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </>
                )}
              </View>
            );
          })}
        </View>

        {/* Setup Guide */}
        <View style={[ss.section, { marginTop: 20 }]}>
          <Text style={ss.sectionLabel}>SETUP GUIDE</Text>
          {[
            { id: 'auth', n: '01', title: 'Enable Screen Time', desc: 'Required for app blocking. Tap "Enable" above or open Settings.', btn: 'Open Settings →', action: openSettings },
            { id: 'pick', n: '02', title: 'Pick Apps to Block', desc: 'After auth, tap "Pick Apps to Block" — a native app picker will appear. Select Instagram, TikTok, etc.', btn: 'Pick Apps →', action: handlePickApps },
            { id: 'shield', n: '03', title: 'Shield / Unshield', desc: 'Tap "Shield Apps" to immediately block your selected apps. Breathe sessions unshield them automatically.', btn: 'Shield Now →', action: handleShield },
            { id: 'limit', n: '04', title: 'Set Daily Limits (optional)', desc: 'Use the − / + controls above per app, then tap "Apply to iPhone →" for step-by-step iOS App Limits setup.', btn: 'Open App Limits →', action: openSettings },
          ].map((s, i) => {
            const done = doneSteps[s.id];
            return (
              <View key={s.id} style={[ss.stepCard, { borderColor: done ? DARK.teal + '44' : DARK.border, opacity: done ? 0.65 : 1, marginTop: i === 0 ? 10 : 8 }]}>
                <View style={ss.stepRow}>
                  <TouchableOpacity style={[ss.stepBadge, { backgroundColor: done ? DARK.teal : DARK.text4, borderColor: done ? DARK.teal : DARK.border }]} onPress={() => markStep(s.id)}>
                    <Text style={[ss.stepBadgeTxt, { color: done ? '#07111e' : DARK.label }]}>{done ? '✓' : s.n}</Text>
                  </TouchableOpacity>
                  <View style={{ flex: 1 }}>
                    <Text style={ss.stepTitle}>{s.title}</Text>
                    <Text style={ss.stepDesc}>{s.desc}</Text>
                    <TouchableOpacity style={ss.stepBtn2} onPress={s.action}>
                      <Text style={ss.stepBtn2Txt}>⚙ {s.btn}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const ss = StyleSheet.create({
  root: { flex: 1, backgroundColor: DARK.bg },
  section: { paddingHorizontal: 20, marginBottom: 8, marginTop: 16 },
  sectionLabel: { color: DARK.label, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', fontWeight: '500' },
  heroRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 8 },
  heroNum: { color: DARK.text, fontSize: 48, fontWeight: '300', letterSpacing: -2 },
  heroUnit: { color: DARK.text2, fontSize: 14, marginBottom: 8 },
  authCard: { backgroundColor: DARK.surf, borderWidth: 1, borderRadius: 13, padding: 16 },
  authRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  authTitle: { color: DARK.text, fontSize: 14, fontWeight: '600' },
  authStatus: { fontSize: 12, marginTop: 2 },
  authBtn: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  authBtnTxt: { color: '#07111e', fontSize: 13, fontWeight: '700' },
  actionBtn: { borderWidth: 1, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 12, alignItems: 'center' },
  actionBtnTxt: { fontSize: 12, fontWeight: '600' },
  poolCard: { backgroundColor: 'rgba(164,142,232,0.12)', borderWidth: 1, borderColor: 'rgba(164,142,232,0.22)', borderRadius: 14, padding: 18, flexDirection: 'row', alignItems: 'center' },
  poolLabel: { color: 'rgba(164,142,232,0.7)', fontSize: 10, letterSpacing: 1.8, textTransform: 'uppercase', marginBottom: 5 },
  poolNum: { color: '#a48ee8', fontSize: 34, fontWeight: '300', letterSpacing: -1.5 },
  poolSub: { color: DARK.text2, fontSize: 12, marginTop: 3 },
  poolBadge: { backgroundColor: 'rgba(164,142,232,0.10)', borderWidth: 1, borderColor: 'rgba(164,142,232,0.18)', borderRadius: 12, padding: 12, alignItems: 'center', minWidth: 64 },
  poolBadgeLabel: { color: 'rgba(164,142,232,0.65)', fontSize: 10, letterSpacing: 1 },
  poolBadgeNum: { color: '#a48ee8', fontSize: 22, fontWeight: '700' },
  poolBadgeSub: { color: 'rgba(164,142,232,0.45)', fontSize: 10 },
  appCard: { backgroundColor: DARK.surf, borderWidth: 1, borderRadius: 13, marginBottom: 10, overflow: 'hidden' },
  appCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, paddingHorizontal: 15 },
  appIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  appInitials: { color: 'rgba(255,255,255,0.92)', fontSize: 11, fontWeight: '700' },
  appName: { color: DARK.text, fontSize: 14, fontWeight: '500' },
  appLimitTxt: { color: DARK.text2, fontSize: 12 },
  limitRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 9, paddingHorizontal: 15, backgroundColor: DARK.text4, borderTopWidth: 1, borderTopColor: DARK.border },
  limitLabel: { color: DARK.text2, fontSize: 12, flex: 1 },
  limitControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: DARK.surf, borderWidth: 1, borderColor: DARK.border, alignItems: 'center', justifyContent: 'center' },
  stepBtnTxt: { color: DARK.text, fontSize: 15, lineHeight: 18 },
  limitVal: { color: DARK.text, fontSize: 14, fontWeight: '700', minWidth: 32, textAlign: 'center' },
  applyBtn: { backgroundColor: 'rgba(79,205,216,0.12)', borderWidth: 1, borderColor: DARK.teal + '44', borderRadius: 9, paddingHorizontal: 10, paddingVertical: 6 },
  applyBtnTxt: { color: DARK.teal, fontSize: 11, fontWeight: '600' },
  earnedSection: { padding: 11, paddingHorizontal: 15, borderTopWidth: 1, borderTopColor: DARK.border },
  earnedHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 },
  earnedLabel: { color: DARK.text2, fontSize: 12 },
  earnedVal: { color: '#a48ee8', fontSize: 13, fontWeight: '700' },
  progressBg: { height: 3, backgroundColor: DARK.text4, borderRadius: 2, marginBottom: 9 },
  progressFill: { height: '100%' as any, backgroundColor: '#a48ee8', borderRadius: 2 },
  useRow: { flexDirection: 'row', gap: 7 },
  useBtn: { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 7, alignItems: 'center' },
  useBtnTxt: { fontSize: 12, fontWeight: '600' },
  stepCard: { backgroundColor: DARK.surf, borderWidth: 1, borderRadius: 13, padding: 15 },
  stepRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  stepBadge: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stepBadgeTxt: { fontSize: 10, fontWeight: '700', fontFamily: 'Courier' },
  stepTitle: { color: DARK.text, fontSize: 14, fontWeight: '600', marginBottom: 4 },
  stepDesc: { color: DARK.text2, fontSize: 12, lineHeight: 18, marginBottom: 10 },
  stepBtn2: { backgroundColor: 'rgba(79,205,216,0.10)', borderWidth: 1, borderColor: DARK.teal + '44', borderRadius: 9, paddingHorizontal: 12, paddingVertical: 7, alignSelf: 'flex-start' },
  stepBtn2Txt: { color: DARK.teal, fontSize: 12, fontWeight: '600' },
  borderHi: DARK.borderHi,
});
