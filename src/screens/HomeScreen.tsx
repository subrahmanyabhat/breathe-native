import React, { useState, useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Linking, Modal, Switch, AppState,
  Animated,
} from 'react-native';
import { scheduleDailyReminder, cancelDailyReminder } from '../notifications';
import { AppData } from '../storage';
import { TECHNIQUES, APPS, Technique } from '../data';
import { DARK, Theme } from '../theme';
import { calcStreak, todayStr } from '../storage';
import * as ScreenTime from '../../modules/screen-time';
const safeSTStatus = () => { try { return ScreenTime.getAuthorizationStatus(); } catch { return 'unavailable'; } };

interface Props {
  data: AppData;
  onUpdate: (d: AppData) => void;
  onStartSession: (tech: Technique, targetApp?: string) => void;
  isPrem?: boolean;
  onShowPremium?: () => void;
  isDark?: boolean;
  onToggleTheme?: () => void;
  th?: Theme;
  onNavigateToScreen?: () => void;
}

export default function HomeScreen({ data, onUpdate, onStartSession, isPrem, onShowPremium, isDark = true, onToggleTheme, th = DARK, onNavigateToScreen }: Props) {
  const [showReminder, setShowReminder] = useState(false);
  const [reminderTime, setReminderTime] = useState(data.reminder?.time || '08:00');
  const [reminderOn, setReminderOn] = useState(!!data.reminder?.enabled);
  const [savingReminder, setSavingReminder] = useState(false);
  const [selTech, setSelTech] = useState(TECHNIQUES[0]);

  const orbPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(orbPulse, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(orbPulse, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  useEffect(() => {
    const t = setInterval(async () => {
      const n = Date.now();
      if (!data.stShieldEnabled) return;
      const au = data.appUnlocked || {};
      const en = data.appEnabled || {};
      const stillUnlocked = APPS
        .filter(a => en[a.id])
        .filter(a => { const exp = au[a.id] || 0; return exp === -1 || exp > n; })
        .map(a => a.bundleId);
      const hadUnlocked = APPS.some(a => en[a.id] && (au[a.id] === -1 || (au[a.id] || 0) > 0));
      if (hadUnlocked && stillUnlocked.length === 0) {
        await ScreenTime.reshieldAll();
      } else if (hadUnlocked && stillUnlocked.length > 0) {
        await ScreenTime.reshieldExcept(stillUnlocked);
      }
    }, 15000);
    return () => clearInterval(t);
  }, [data]);

  useEffect(() => {
    const actuallyShielded = ScreenTime.isShieldActive();
    if (data.stShieldEnabled !== actuallyShielded) {
      onUpdate({ ...data, stShieldEnabled: actuallyShielded });
    }
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') safeSTStatus();
    });
    return () => sub.remove();
  }, []);

  const saveReminder = async (enabled: boolean, time: string) => {
    setSavingReminder(true);
    if (enabled) {
      const ok = await scheduleDailyReminder(time);
      onUpdate({ ...data, reminder: { enabled: ok, time } });
      if (ok) Alert.alert('✓ Reminder Set', `You'll be reminded every day at ${time} to breathe.`);
    } else {
      await cancelDailyReminder();
      onUpdate({ ...data, reminder: { enabled: false, time } });
    }
    setSavingReminder(false);
    setShowReminder(false);
  };

  const streak = calcStreak(data.sessions);
  const today = todayStr();
  const todaySess = data.sessions.filter(s => s.date === today);
  const earned = todaySess.reduce((sum, s) => sum + (s.duration || 0), 0);
  const enabledApps = APPS.filter(a => data.appEnabled?.[a.id]);
  const slots = data.slots || [];
  const activeCount = slots.length || enabledApps.length;
  const phaseStr = selTech.phases.map(p => p.dur).join('·');

  const orbScale = orbPulse.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1.0] });
  const orbGlow = orbPulse.interpolate({ inputRange: [0, 1], outputRange: [0.28, 0.72] });

  const ss = styles(th);

  return (
    <View style={{ flex: 1, backgroundColor: th.bg }}>
      {/* Seamless gradient overlay */}
      <LinearGradient
        colors={[`${th.teal}22`, `${th.teal}00`]}
        locations={[0, 1]}
        style={[StyleSheet.absoluteFillObject, { height: 320 }]}
        pointerEvents="none"
      />

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={ss.header}>
          <View style={ss.logoRow}>
            <View style={[ss.logoBox, { backgroundColor: th.teal }]} />
            <Text style={[ss.logoTxt, { color: th.text }]}>Breathe</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            {!isPrem && (
              <TouchableOpacity onPress={onShowPremium} style={ss.premBtn}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="star" size={11} color="#a48ee8" />
                  <Text style={ss.premBtnTxt}>Premium</Text>
                </View>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => setShowReminder(true)} style={ss.iconBtn}>
              <Ionicons name={data.reminder?.enabled ? 'notifications' : 'notifications-outline'} size={17} color={data.reminder?.enabled ? th.teal : th.text2} />
            </TouchableOpacity>
            <View style={ss.dayBadge}>
              <View style={[ss.dayDot, { backgroundColor: streak > 0 ? th.teal : th.label }]} />
              <Text style={[ss.dayTxt, { color: th.text2 }]}>day {streak}</Text>
            </View>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60, paddingTop: 8 }}>

          {/* Stats card */}
          <View style={[ss.statsCard, { backgroundColor: th.surf, borderColor: th.border }]}>
            <View style={ss.statCol}>
              <Text style={[ss.statNum, { color: th.teal }]}>{earned}<Text style={ss.statUnit}>m</Text></Text>
              <Text style={[ss.statLbl, { color: th.text2 }]}>today</Text>
            </View>
            <View style={[ss.statDivider, { backgroundColor: th.border }]} />
            <View style={ss.statCol}>
              <Text style={[ss.statNum, { color: th.amber }]}>{streak}</Text>
              <Text style={[ss.statLbl, { color: th.text2 }]}>streak</Text>
            </View>
            <View style={[ss.statDivider, { backgroundColor: th.border }]} />
            <View style={ss.statCol}>
              <Text style={[ss.statNum, { color: th.text }]}>{todaySess.length}<Text style={[ss.statUnit, { color: th.text2 }]}>/10</Text></Text>
              <Text style={[ss.statLbl, { color: th.text2 }]}>mindful</Text>
            </View>
          </View>

          {/* Centered floating breathe button */}
          <TouchableOpacity
            activeOpacity={0.82}
            onPress={() => onStartSession(selTech)}
            style={ss.floatBreathWrap}>
            <View style={ss.floatOrbOuter}>
              <Animated.View style={[ss.floatOrbGlow, { opacity: orbGlow, backgroundColor: `${selTech.accent}30` }]} />
              <Animated.View style={[ss.floatOrbRing, { transform: [{ scale: orbScale }], borderColor: `${selTech.accent}55` }]}>
                <View style={[ss.floatOrbCore, { backgroundColor: `${selTech.accent}18` }]}>
                  <View style={[ss.floatOrbDot, { backgroundColor: selTech.accent, shadowColor: selTech.accent }]} />
                </View>
              </Animated.View>
            </View>
            <Text style={[ss.floatLabel, { color: th.text }]}>Breathe</Text>
            <Text style={[ss.floatSub, { color: th.text2 }]}>{phaseStr} · tap to begin</Text>
          </TouchableOpacity>

          {/* Technique chips — full width row below orb */}
          <View style={[ss.techRow, { borderColor: th.border }]}>
            {TECHNIQUES.map((t, i) => {
              const active = selTech.id === t.id;
              return (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => setSelTech(t)}
                  style={[ss.techChip, {
                    backgroundColor: active ? `${t.accent}18` : 'transparent',
                    borderRightWidth: i < TECHNIQUES.length - 1 ? 1 : 0,
                    borderRightColor: th.border,
                  }]}>
                  <Text style={[ss.techChipTxt, { color: active ? t.accent : th.text2 }]}>
                    {t.name === 'box' ? 'Box' : t.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Block distracting apps */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onNavigateToScreen}
            style={[ss.blockCard, { backgroundColor: th.surf, borderColor: th.border }]}>
            <View style={[ss.blockIconBox, { backgroundColor: `${th.teal}18`, borderColor: `${th.teal}30` }]}>
              <Ionicons name={data.stShieldEnabled ? 'lock-closed' : 'shield-outline'} size={18} color={th.teal} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[ss.blockTitle, { color: th.text }]}>Block distracting apps</Text>
              <Text style={[ss.blockSub, { color: th.text2 }]}>
                {activeCount > 0
                  ? `${activeCount} app${activeCount !== 1 ? 's' : ''} selected${data.stShieldEnabled ? ' · blocked' : ''}`
                  : 'Select apps to block'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={th.text2} />
          </TouchableOpacity>


          {/* Learn section */}
          <View style={ss.learnHeader}>
            <Text style={[ss.learnHeadTxt, { color: th.label }]}>BREATHING TECHNIQUES</Text>
          </View>

          {TECHNIQUES.map(t => {
            const totalDur = t.phases.reduce((s, p) => s + p.dur, 0);
            return (
              <TouchableOpacity
                key={t.id}
                activeOpacity={0.85}
                onPress={() => { setSelTech(t); }}
                style={[ss.learnCard, { backgroundColor: th.surf, borderColor: selTech.id === t.id ? `${t.accent}55` : th.border }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <View style={{ backgroundColor: t.tagBg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
                    <Text style={{ color: t.accent, fontSize: 10, fontWeight: '700', letterSpacing: 0.4 }}>{t.tag}</Text>
                  </View>
                  <Text style={{ color: `${t.accent}90`, fontSize: 12, fontWeight: '500' }}>{totalDur}s cycle</Text>
                </View>
                <Text style={{ color: th.text, fontSize: 14, fontWeight: '600', marginBottom: 4 }}>{t.name === 'box' ? 'Box Breathing' : t.name}</Text>
                <Text style={{ color: th.text2, fontSize: 12, lineHeight: 18, marginBottom: 12 }}>{t.desc}</Text>
                {/* Phase bars */}
                <View style={{ flexDirection: 'row', gap: 3, marginBottom: 6 }}>
                  {t.phases.map((p, i) => (
                    <View key={i} style={{ flex: p.dur, height: 3, borderRadius: 2, backgroundColor: i === 0 ? t.accent : `${t.accent}50` }} />
                  ))}
                </View>
                <View style={{ flexDirection: 'row' }}>
                  {t.phases.map((p, i) => (
                    <View key={i} style={{ flex: p.dur }}>
                      <Text style={{ color: th.label, fontSize: 10 }} numberOfLines={1}>
                        {p.label} <Text style={{ color: th.text2, fontWeight: '600' }}>{p.dur}s</Text>
                      </Text>
                    </View>
                  ))}
                </View>
                <TouchableOpacity
                  onPress={() => onStartSession(t)}
                  style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: `${t.accent}50`, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: `${t.accent}10` }}>
                  <Text style={{ color: t.accent, fontSize: 14, fontWeight: '600', letterSpacing: 0.2 }}>Breathe</Text>
                  <Ionicons name="arrow-forward" size={16} color={t.accent} />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}

        </ScrollView>
      </SafeAreaView>

      {/* Reminder Modal */}
      <Modal visible={showReminder} transparent animationType="slide" onRequestClose={() => setShowReminder(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={() => setShowReminder(false)} />
          <View style={[ss.reminderSheet, { backgroundColor: th.surf, borderColor: th.border }]}>
            <View style={[ss.reminderHandle, { backgroundColor: th.text2 }]} />
            <Text style={[ss.reminderSheetTitle, { color: th.text }]}>Daily Reminder</Text>
            <Text style={{ color: th.text2, fontSize: 13, lineHeight: 18, marginBottom: 20 }}>Set a daily alarm to breathe.</Text>

            <View style={[ss.reminderRow, { backgroundColor: th.bg, borderColor: th.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[ss.reminderLabel, { color: th.text }]}>Enable reminder</Text>
                <Text style={{ color: th.text2, fontSize: 12, marginTop: 2 }}>Fires every day at the set time</Text>
              </View>
              <Switch value={reminderOn} onValueChange={setReminderOn} trackColor={{ true: th.teal, false: th.border }} thumbColor="#fff" />
            </View>

            <View style={[ss.reminderRow, { backgroundColor: th.bg, borderColor: th.border, opacity: reminderOn ? 1 : 0.4 }]}>
              <Text style={[ss.reminderLabel, { color: th.text }]}>Time</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {(['hour', 'min'] as const).map((unit, ui) => (
                  <View key={unit} style={{ alignItems: 'center' }}>
                    <TouchableOpacity disabled={!reminderOn} onPress={() => {
                      const [h, m] = reminderTime.split(':').map(Number);
                      if (ui === 0) setReminderTime(`${String((h - 1 + 24) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
                      else setReminderTime(`${String(h).padStart(2, '0')}:${String((m + 15) % 60).padStart(2, '0')}`);
                    }} style={[ss.stepBtn, { borderColor: th.border, backgroundColor: th.bg }]}>
                      <Text style={[ss.stepTxt, { color: th.text }]}>+</Text>
                    </TouchableOpacity>
                    <Text style={{ color: th.teal, fontSize: 22, fontWeight: '700', minWidth: 30, textAlign: 'center' }}>
                      {ui === 0 ? reminderTime.split(':')[0] : reminderTime.split(':')[1]}
                    </Text>
                    <TouchableOpacity disabled={!reminderOn} onPress={() => {
                      const [h, m] = reminderTime.split(':').map(Number);
                      if (ui === 0) setReminderTime(`${String((h + 1) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
                      else setReminderTime(`${String(h).padStart(2, '0')}:${String((m - 15 + 60) % 60).padStart(2, '0')}`);
                    }} style={[ss.stepBtn, { borderColor: th.border, backgroundColor: th.bg }]}>
                      <Text style={[ss.stepTxt, { color: th.text }]}>−</Text>
                    </TouchableOpacity>
                    {ui === 0 && <Text style={{ color: th.text2, fontSize: 22, fontWeight: '700', marginTop: -50, marginLeft: 30 }}>:</Text>}
                  </View>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[ss.saveBtn, { backgroundColor: th.teal, opacity: savingReminder ? 0.6 : 1 }]}
              onPress={() => saveReminder(reminderOn, reminderTime)}
              disabled={savingReminder}>
              <Text style={{ color: th.id === 'dark' ? '#07111e' : '#fff', fontSize: 15, fontWeight: '700' }}>
                {savingReminder ? 'Setting…' : reminderOn ? `Set for ${reminderTime}` : 'Save (off)'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ marginTop: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: th.border, borderRadius: 12, backgroundColor: th.bg }}
              onPress={() => Linking.openURL('x-apple-reminderkit://')}>
              <Text style={{ color: th.teal, fontSize: 13, fontWeight: '600' }}>Open Reminders App →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = (th: Theme) => StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoBox: { width: 30, height: 30, borderRadius: 9 },
  logoTxt: { fontSize: 18, fontWeight: '600', letterSpacing: -0.3 },
  premBtn: { backgroundColor: 'rgba(164,142,232,0.18)', borderWidth: 1, borderColor: 'rgba(164,142,232,0.40)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  premBtnTxt: { color: '#a48ee8', fontSize: 12, fontWeight: '700' },
  iconBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dayBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: th.surf, borderWidth: 1, borderColor: th.border, borderRadius: 20, paddingHorizontal: 11, paddingVertical: 6 },
  dayDot: { width: 6, height: 6, borderRadius: 3 },
  dayTxt: { fontSize: 13, fontWeight: '500' },

  statsCard: { marginHorizontal: 16, borderRadius: 16, borderWidth: 1, flexDirection: 'row', paddingVertical: 20, marginBottom: 14 },
  statCol: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 28, fontWeight: '300', letterSpacing: -1, lineHeight: 32 },
  statUnit: { fontSize: 15, fontWeight: '300' },
  statLbl: { fontSize: 12, marginTop: 5 },
  statDivider: { width: 1, marginVertical: 4 },

  floatBreathWrap: { alignItems: 'center', paddingVertical: 12, marginBottom: 4 },
  floatOrbOuter: { width: 180, height: 180, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  floatOrbGlow: { position: 'absolute', width: 180, height: 180, borderRadius: 90 },
  floatOrbRing: { width: 162, height: 162, borderRadius: 81, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  floatOrbCore: { width: 112, height: 112, borderRadius: 56, alignItems: 'center', justifyContent: 'center' },
  floatOrbDot: { width: 32, height: 32, borderRadius: 16, shadowOpacity: 0.9, shadowRadius: 16, shadowOffset: { width: 0, height: 0 } },
  floatLabel: { fontSize: 24, fontWeight: '300', letterSpacing: 4, marginBottom: 6 },
  floatSub: { fontSize: 12 },

  techRow: { flexDirection: 'row', marginHorizontal: 16, borderRadius: 14, borderWidth: 1, overflow: 'hidden', marginBottom: 14 },
  techChip: { flex: 1, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  techChipTxt: { fontSize: 13, fontWeight: '500' },

  blockCard: { marginHorizontal: 16, borderRadius: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12, marginBottom: 14 },
  blockIconBox: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  blockTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  blockSub: { fontSize: 12 },

  appsGrid: { marginHorizontal: 16, borderRadius: 16, borderWidth: 1, padding: 10, flexDirection: 'row', flexWrap: 'wrap', marginBottom: 14 },
  appCell: { width: '33.33%', alignItems: 'center', paddingVertical: 10 },
  appIconWrap: { position: 'relative', marginBottom: 6 },
  appIcon: { width: 54, height: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  appInitials: { color: 'rgba(255,255,255,0.92)', fontSize: 14, fontWeight: '700' },
  lockBadge: { position: 'absolute', bottom: -2, right: -2, width: 16, height: 16, borderRadius: 8, backgroundColor: '#1a1a2e', borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  appName: { fontSize: 11, textAlign: 'center', paddingHorizontal: 4 },

  learnHeader: { marginHorizontal: 16, marginBottom: 12 },
  learnHeadTxt: { fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', fontWeight: '600' },
  learnCard: { marginHorizontal: 16, borderRadius: 18, borderWidth: 1, padding: 20, marginBottom: 16 },

  reminderSheet: { borderRadius: 28, padding: 24, paddingBottom: 44, borderWidth: 1, borderBottomWidth: 0 },
  reminderHandle: { width: 40, height: 4, borderRadius: 2, opacity: 0.3, alignSelf: 'center', marginBottom: 22 },
  reminderSheetTitle: { fontSize: 19, fontWeight: '700', marginBottom: 4 },
  reminderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 13, padding: 15, marginBottom: 10 },
  reminderLabel: { fontSize: 14, fontWeight: '500' },
  stepBtn: { width: 30, height: 24, alignItems: 'center', justifyContent: 'center', borderRadius: 6, borderWidth: 1 },
  stepTxt: { fontSize: 14, lineHeight: 18, fontWeight: '600' },
  saveBtn: { borderRadius: 13, padding: 15, alignItems: 'center', marginTop: 6 },
});
