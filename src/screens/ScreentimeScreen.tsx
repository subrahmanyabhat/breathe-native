import React, { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking, Platform, AppState } from 'react-native';
import { AppData, last7 } from '../storage';
import { TECHNIQUES, Technique } from '../data';
import { DARK, Theme } from '../theme';
import { AppTokenView, scheduleSlotMonitoring, stopSlotMonitoring } from '../../modules/screen-time';
import * as AndroidBlocker from '../../modules/android-blocker';
import type { InstalledApp } from '../../modules/android-blocker';

const safeSTStatus = () => { try { return require('../../modules/screen-time').getAuthorizationStatus(); } catch { return 'unavailable'; } };
const doAuth     = async () => { try { return await require('../../modules/screen-time').requestAuthorization(); } catch { return { authorized: false }; } };
const doUnshield = async () => { try { return await require('../../modules/screen-time').unshieldApps(); } catch { return { success: false }; } };

const STEPS = [5, 10, 15, 20, 30, 45, 60, 90, 120];
const nextStep = (v: number, dir: number) => {
  const i = STEPS.indexOf(v);
  return STEPS[Math.max(0, Math.min(STEPS.length - 1, (i < 0 ? 2 : i) + dir))];
};

interface Props {
  data: AppData;
  onUpdate: (d: AppData) => void;
  onStartSession: (t: Technique, app?: string) => void;
  isPrem?: boolean;
  onShowPremium?: () => void;
  th?: Theme;
  onPickApps?: () => void;
}

export default function ScreentimeScreen({ data, onUpdate, onStartSession, isPrem, onShowPremium, th = DARK, onPickApps }: Props) {
  const [status, setStatus] = useState(safeSTStatus);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [slots, setSlots] = useState<{ index: number; name: string; bundleId: string; iconBase64: string; isBlocked: boolean; hashKey: string }[]>(
    (data?.slots || []).map(s => ({ ...s, iconBase64: '' }))
  );
  const [androidPerms, setAndroidPerms] = useState<{ usage: boolean; overlay: boolean } | null>(null);
  const [androidAppsMap, setAndroidAppsMap] = useState<Record<string, InstalledApp>>({});

  const checkAndroidPerms = useCallback(async () => {
    if (Platform.OS !== 'android') return;
    const [usage, overlay] = await Promise.all([
      AndroidBlocker.hasUsageStatsPermission(),
      AndroidBlocker.hasOverlayPermission(),
    ]);
    setAndroidPerms({ usage, overlay });
  }, []);

  // Load ALL installed apps once — used for name + icon lookup
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    checkAndroidPerms();
    AndroidBlocker.getInstalledApps().then(list => {
      const map: Record<string, InstalledApp> = {};
      list.forEach(a => { map[a.packageName] = a; });
      setAndroidAppsMap(map);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') checkAndroidPerms();
    });
    return () => sub.remove();
  }, [checkAndroidPerms]);

  useEffect(() => {
    if (!data || typeof data !== 'object') return;
    const ST = require('../../modules/screen-time');
    ST.getSlotInfo().then((info: any) => {
      setSlots((info?.slots || []).map((s: any) => ({ ...s, iconBase64: '' })));
    }).catch(() => {});
  }, [data?.slots?.length, data?.stShieldEnabled, data?.nativeAppCount, data?.slotsVersion]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state !== 'active') return;
      const ST = require('../../modules/screen-time');
      ST.getSlotInfo().then((info: any) => {
        setSlots((info?.slots || []).map((s: any) => ({ ...s, iconBase64: '' })));
      }).catch(() => {});
    });
    return () => sub.remove();
  }, [data]);

  const isAuth = status === 'approved';
  const todayKey = new Date().toISOString().slice(0, 10);
  const earned = (data?.sessions || []).filter(s => s.date === todayKey).reduce((sum, s) => sum + (s.duration || 0), 0);
  const totalAppCount = Platform.OS === 'android'
    ? (data?.androidBlockedPackages || []).length
    : slots.length;
  const chart = last7(data?.sessions || []);
  const maxEarned = Math.max(...chart.map(d => d.earned), 1);

  if (!data) return null;

  const reqAuth = async () => {
    setLoading(true);
    const r = await doAuth() as any;
    if (r.authorized) setStatus('approved');
    else Alert.alert('Screen Time Required', 'Grant access in Settings → Screen Time → Family Controls.', [
      { text: 'Open Settings', onPress: () => Linking.openSettings() },
      { text: 'Cancel', style: 'cancel' },
    ]);
    setLoading(false);
  };

  const renderLimitSection = (
    lim: number,
    isMonitored: boolean,
    isBlocked: boolean,
    onChangeLim: (v: number) => void,
    onActivate: () => void,
    onBreathe: () => void,
    onStop: () => void,
    activatedAt: number,
  ) => {
    const elapsed = (isMonitored && activatedAt) ? Math.round((now - activatedAt) / 60000) : 0;
    const pct = lim > 0 ? Math.min(1, elapsed / lim) : 0;
    const danger = pct >= 0.8;
    return (
      <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: th.border }}>
        {isMonitored && !isBlocked && activatedAt > 0 && (
          <View style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
              <Text style={{ color: th.text2, fontSize: 11 }}>Screen time today</Text>
              <Text style={{ color: danger ? '#e05555' : th.teal, fontSize: 11, fontWeight: '600' }}>{elapsed}m / {lim}m</Text>
            </View>
            <View style={{ height: 4, backgroundColor: th.border, borderRadius: 2 }}>
              <View style={{ width: `${pct * 100}%` as any, height: '100%' as any, backgroundColor: danger ? '#e05555' : th.teal, borderRadius: 2 }} />
            </View>
          </View>
        )}
        {isBlocked && (
          <View style={{ marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#e05555' }} />
            <Text style={{ color: '#e05555', fontSize: 11, fontWeight: '600' }}>Blocked · limit reached</Text>
          </View>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ color: th.text2, fontSize: 12 }}>Block after</Text>
          <TouchableOpacity style={[ss.stepBtn, { borderColor: th.border, backgroundColor: th.bg }]} onPress={() => onChangeLim(nextStep(lim, -1))}>
            <Text style={[ss.stepTxt, { color: th.text }]}>−</Text>
          </TouchableOpacity>
          <Text style={{ color: th.text, fontSize: 15, fontWeight: '700', minWidth: 40, textAlign: 'center' }}>{lim}m</Text>
          <TouchableOpacity style={[ss.stepBtn, { borderColor: th.border, backgroundColor: th.bg }]} onPress={() => onChangeLim(nextStep(lim, +1))}>
            <Text style={[ss.stepTxt, { color: th.text }]}>+</Text>
          </TouchableOpacity>
          <Text style={{ color: th.label, fontSize: 11, flex: 1 }}>per day</Text>
          {isBlocked ? (
            <TouchableOpacity onPress={onBreathe}
              style={[ss.actionBtn, { backgroundColor: `${th.teal}18`, borderColor: `${th.teal}55` }]}>
              <Ionicons name="flash" size={13} color={th.teal} />
              <Text style={[ss.actionTxt, { color: th.teal }]}>Breathe</Text>
            </TouchableOpacity>
          ) : isMonitored ? (
            <TouchableOpacity onPress={onStop}
              style={[ss.actionBtn, { backgroundColor: th.surf, borderColor: th.border }]}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: th.teal }} />
              <Text style={[ss.actionTxt, { color: th.teal }]}>Stop</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={onActivate}
              style={[ss.actionBtn, { backgroundColor: `${th.teal}18`, borderColor: `${th.teal}55` }]}>
              <Text style={[ss.actionTxt, { color: th.teal }]}>Activate</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

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
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60, paddingTop: 8 }}>

          {/* Header */}
          <View style={ss.header}>
            <Text style={[ss.title, { color: th.text }]}>Screen Time</Text>
          </View>

          {/* This week chart */}
          <View style={[ss.card, { marginHorizontal: 16 }]}>
            <Text style={[ss.sectionLabel, { color: th.label, marginBottom: 14 }]}>BREATHING THIS WEEK</Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 60 }}>
              {chart.map((d, i) => (
                <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                  <View style={{ width: '100%', borderRadius: 4, minHeight: 4, height: Math.max(4, (d.earned / maxEarned) * 52), backgroundColor: d.isToday ? th.teal : `${th.teal}50` }} />
                  <Text style={{ fontSize: 9, marginTop: 5, fontWeight: '500', color: d.isToday ? th.teal : th.label }}>{d.label}</Text>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
              <Text style={{ color: th.text2, fontSize: 12 }}>{chart.reduce((a, d) => a + d.minutes, 0)} min breathed</Text>
              <Text style={{ color: th.teal, fontSize: 12, fontWeight: '600' }}>{chart.reduce((a, d) => a + d.earned, 0)}m earned</Text>
            </View>
          </View>

          {/* Today + Breathe Now */}
          <View style={[ss.card, { marginHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 16 }]}>
            <View style={{ flex: 1 }}>
              <Text style={[ss.sectionLabel, { color: `rgba(164,142,232,0.65)` }]}>BREATHED TODAY</Text>
              <Text style={{ color: '#a48ee8', fontSize: 30, fontWeight: '300', marginTop: 6, letterSpacing: -1 }}>{earned}m</Text>
            </View>
            <TouchableOpacity
              onPress={() => onStartSession(TECHNIQUES[0])}
              style={{ backgroundColor: `${th.teal}18`, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: `${th.teal}44`, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="flash" size={16} color={th.teal} />
              <Text style={{ color: th.teal, fontSize: 14, fontWeight: '700' }}>Breathe Now</Text>
            </TouchableOpacity>
          </View>

          {/* Android permissions + blocking */}
          {Platform.OS === 'android' && androidPerms && !androidPerms.usage && (
            <TouchableOpacity
              onPress={() => AndroidBlocker.openUsageStatsSettings()}
              style={[ss.card, { marginHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(232,162,60,0.08)', borderColor: 'rgba(232,162,60,0.25)' }]}>
              <Ionicons name="warning-outline" size={20} color="#e8a23c" />
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#e8a23c', fontSize: 13, fontWeight: '600' }}>Usage Access Required</Text>
                <Text style={{ color: th.text2, fontSize: 11, marginTop: 2 }}>Tap to grant in Settings → Usage Access</Text>
              </View>
              <Ionicons name="open-outline" size={16} color="#e8a23c" />
            </TouchableOpacity>
          )}
          {Platform.OS === 'android' && androidPerms && !androidPerms.overlay && (
            <TouchableOpacity
              onPress={() => AndroidBlocker.openOverlaySettings()}
              style={[ss.card, { marginHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(232,162,60,0.08)', borderColor: 'rgba(232,162,60,0.25)' }]}>
              <Ionicons name="warning-outline" size={20} color="#e8a23c" />
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#e8a23c', fontSize: 13, fontWeight: '600' }}>Display Over Apps Required</Text>
                <Text style={{ color: th.text2, fontSize: 11, marginTop: 2 }}>Tap to grant in Settings → Display over other apps</Text>
              </View>
              <Ionicons name="open-outline" size={16} color="#e8a23c" />
            </TouchableOpacity>
          )}

          {/* Auth banner */}
          {Platform.OS === 'ios' && !isAuth && (
            <TouchableOpacity onPress={reqAuth}
              style={[ss.card, { marginHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(232,162,60,0.08)', borderColor: 'rgba(232,162,60,0.25)', opacity: loading ? 0.6 : 1 }]}>
              <Ionicons name="warning-outline" size={20} color="#e8a23c" />
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#e8a23c', fontSize: 13, fontWeight: '600' }}>Screen Time Not Authorized</Text>
                <Text style={{ color: th.text2, fontSize: 11, marginTop: 2 }}>Tap to enable app blocking</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Apps section */}
          <View style={{ marginHorizontal: 16 }}>
            <Text style={[ss.sectionLabel, { color: th.label, marginBottom: 12, marginTop: 4 }]}>APPS TO BLOCK</Text>

            <TouchableOpacity
              onPress={() => onPickApps?.()}
              style={[ss.card, { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 16, backgroundColor: `${th.teal}10`, borderColor: `${th.teal}40` }]}>
              <Ionicons name="add-circle-outline" size={18} color={th.teal} />
              <Text style={{ color: th.teal, fontSize: 15, fontWeight: '600' }}>
                {totalAppCount > 0 ? `${totalAppCount} app${totalAppCount !== 1 ? 's' : ''} selected  ·  tap to change` : 'Select Apps to Block'}
              </Text>
            </TouchableOpacity>

            {/* Android: per-app cards with limit/monitoring, same as iOS */}
            {Platform.OS === 'android' && (data?.androidBlockedPackages || []).map(pkg => {
              const appInfo = androidAppsMap[pkg];
              const lim = data.androidAppLimits?.[pkg] || 15;
              const isMon = !!data.androidAppMonitored?.[pkg];
              const activatedAt = data.androidAppActivatedAt?.[pkg] || 0;
              const elapsed = (isMon && activatedAt) ? Math.round((now - activatedAt) / 60000) : 0;
              const isBlocked = isMon && activatedAt > 0 && elapsed >= lim;
              return (
                <View key={pkg} style={ss.appCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {appInfo?.icon ? (
                      <Image
                        source={{ uri: `data:image/png;base64,${appInfo.icon}` }}
                        style={{ width: 44, height: 44, borderRadius: 10, marginRight: 12 }}
                      />
                    ) : (
                      <View style={{ width: 44, height: 44, borderRadius: 10, marginRight: 12, backgroundColor: th.border }} />
                    )}
                    <Text style={{ color: th.text, fontSize: 15, fontWeight: '600', flex: 1 }} numberOfLines={1}>
                      {appInfo?.appName || pkg}
                    </Text>
                    <TouchableOpacity
                      onPress={async () => {
                        const next = (data.androidBlockedPackages || []).filter(p => p !== pkg);
                        const newMon = { ...(data.androidAppMonitored || {}), [pkg]: false };
                        const newAt = { ...(data.androidAppActivatedAt || {}), [pkg]: 0 };
                        // Remove from service blocked list
                        const serviceBlocked = next.filter(p => !!(data.androidAppMonitored || {})[p]);
                        await AndroidBlocker.setBlockedApps(serviceBlocked);
                        if (serviceBlocked.length === 0) await AndroidBlocker.stopBlockingService();
                        onUpdate({ ...data, androidBlockedPackages: next, androidAppMonitored: newMon, androidAppActivatedAt: newAt, androidBlockingActive: serviceBlocked.length > 0 });
                      }}
                      style={ss.removeBtn}>
                      <Ionicons name="close" size={16} color="#e05555" />
                    </TouchableOpacity>
                  </View>
                  {renderLimitSection(
                    lim, isMon, isBlocked,
                    (v) => onUpdate({ ...data, androidAppLimits: { ...(data.androidAppLimits || {}), [pkg]: v } }),
                    async () => {
                      if (!androidPerms?.usage || !androidPerms?.overlay) {
                        Alert.alert('Permissions needed', 'Grant Usage Access and Display Over Apps permissions first.');
                        return;
                      }
                      onUpdate({ ...data, androidAppMonitored: { ...(data.androidAppMonitored || {}), [pkg]: true }, androidAppActivatedAt: { ...(data.androidAppActivatedAt || {}), [pkg]: Date.now() } });
                    },
                    () => onStartSession(TECHNIQUES[0], `android_pkg_${pkg}`),
                    async () => {
                      const newMon = { ...(data.androidAppMonitored || {}), [pkg]: false };
                      const newAt = { ...(data.androidAppActivatedAt || {}), [pkg]: 0 };
                      await AndroidBlocker.setBlockedApps((data.androidBlockedPackages || []).filter(p => p !== pkg && !!(newMon[p])));
                      onUpdate({ ...data, androidAppMonitored: newMon, androidAppActivatedAt: newAt });
                    },
                    activatedAt,
                  )}
                </View>
              );
            })}

            {/* iOS: slot monitoring per app */}
            {Platform.OS === 'ios' && slots.map(slot => {
              const isBlocked = slot.isBlocked || !!data?.stShieldEnabled;
              const slotLim = data.slotLimits?.[slot.hashKey] || 15;
              const slotMon = !!data.slotMonitored?.[slot.hashKey];
              return (
                <View key={slot.hashKey} style={ss.appCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <AppTokenView
                      key={slot.hashKey}
                      hashKey={slot.hashKey}
                      darkMode={th.id === 'dark'}
                      showTitle={true}
                      style={{ flex: 1, height: 44 }}
                    />
                    <TouchableOpacity
                      onPress={async () => {
                        const ST = require('../../modules/screen-time');
                        const newSlotMon = { ...(data.slotMonitored || {}), [slot.hashKey]: false };
                        const newSlotAt = { ...(data.slotActivatedAt || {}), [slot.hashKey]: 0 };
                        await ST.removeSlotFromSelection(slot.index).catch(() => {});
                        const info = await ST.getSlotInfo().catch(() => ({ slots: [] }));
                        const newSlots = (info.slots || []).map((s: any) => ({ ...s, iconBase64: '' }));
                        setSlots(newSlots);
                        onUpdate({ ...data, slots: newSlots, nativeAppCount: newSlots.length, slotMonitored: newSlotMon, slotActivatedAt: newSlotAt });
                      }}
                      style={ss.removeBtn}>
                      <Ionicons name="close" size={16} color="#e05555" />
                    </TouchableOpacity>
                  </View>
                  {renderLimitSection(
                    slotLim, slotMon, isBlocked,
                    (v) => onUpdate({ ...data, slotLimits: { ...(data.slotLimits || {}), [slot.hashKey]: v } }),
                    async () => {
                      const r = await scheduleSlotMonitoring(slot.index, slotLim);
                      if (!r.success) { Alert.alert('Monitoring Failed', r.error || 'Could not start Screen Time monitoring.'); return; }
                      onUpdate({ ...data, slotMonitored: { ...(data.slotMonitored || {}), [slot.hashKey]: true }, slotActivatedAt: { ...(data.slotActivatedAt || {}), [slot.hashKey]: Date.now() } });
                    },
                    () => onStartSession(TECHNIQUES[0], `slot_${slot.index}`),
                    async () => {
                      await stopSlotMonitoring(slot.index);
                      onUpdate({ ...data, slotMonitored: { ...(data.slotMonitored || {}), [slot.hashKey]: false }, slotActivatedAt: { ...(data.slotActivatedAt || {}), [slot.hashKey]: 0 } });
                    },
                    data.slotActivatedAt?.[slot.hashKey] || 0,
                  )}
                </View>
              );
            })}

            {/* Unlock All (iOS only) */}
            {Platform.OS === 'ios' && data.stShieldEnabled && (
              <TouchableOpacity
                onPress={async () => {
                  const r = await doUnshield();
                  if (r.success) onUpdate({ ...data, stShieldEnabled: false, appUnlocked: {}, lockDate: '', unlockedIndices: [], appMonitored: {}, appActivatedAt: {}, slotMonitored: {}, slotActivatedAt: {}, slotsVersion: (data.slotsVersion || 0) + 1 });
                  else Alert.alert('Could not unlock', 'Try again.');
                }}
                style={[ss.card, { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 16, backgroundColor: 'rgba(220,60,60,0.08)', borderColor: 'rgba(220,60,60,0.25)' }]}>
                <Ionicons name="lock-open-outline" size={18} color="#e05555" />
                <Text style={{ color: '#e05555', fontSize: 15, fontWeight: '700' }}>Unlock All Apps</Text>
              </TouchableOpacity>
            )}

            {/* Open iOS Screen Time (iOS only) */}
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                onPress={() => Linking.openURL('App-Prefs:root=SCREEN_TIME').catch(() => Linking.openSettings())}
                style={[ss.card, { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: `${th.teal}08`, borderColor: `${th.teal}25` }]}>
                <Ionicons name="bar-chart-outline" size={22} color={th.teal} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: th.text, fontSize: 14, fontWeight: '600' }}>View Full Screen Time</Text>
                  <Text style={{ color: th.text2, fontSize: 11, marginTop: 2 }}>Usage, limits & reports → iOS Settings</Text>
                </View>
                <Ionicons name="open-outline" size={16} color={th.teal} />
              </TouchableOpacity>
            )}
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = (th: Theme) => StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6, marginBottom: 6 },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  sectionLabel: { fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', fontWeight: '600' },
  card: { backgroundColor: th.surf, borderWidth: 1, borderColor: th.border, borderRadius: 16, padding: 16, marginBottom: 14 },
  appCard: { backgroundColor: th.surf, borderWidth: 1, borderColor: th.border, borderRadius: 16, padding: 16, marginBottom: 12 },
  removeBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(220,60,60,0.10)', borderWidth: 1.5, borderColor: 'rgba(220,60,60,0.28)' },
  stepBtn: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepTxt: { fontSize: 16, lineHeight: 20, fontWeight: '600' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  actionTxt: { fontSize: 12, fontWeight: '600' },
});
