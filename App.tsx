import React, { useState, useEffect, Component } from 'react';
import { StatusBar, View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet, Alert, Platform } from 'react-native';
import { NavigationContainer, DarkTheme, createNavigationContainerRef } from '@react-navigation/native';
const navRef = createNavigationContainerRef<any>();
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { enableScreens } from 'react-native-screens';
import { Ionicons } from '@expo/vector-icons';
import { load, save, AppData, DEFAULT, earnedScreenMin, todayStr } from './src/storage';
import { DARK, LIGHT, Theme } from './src/theme';
import HomeScreen from './src/screens/HomeScreen';
import StatsScreen from './src/screens/StatsScreen';
import ScreentimeScreen from './src/screens/ScreentimeScreen';
import SessionScreen from './src/screens/SessionScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import AndroidAppPickerModal from './src/screens/AndroidAppPickerModal';
import { Technique, TECHNIQUES } from './src/data';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as AndroidBlocker from './modules/android-blocker';

enableScreens();

// ── Error Boundary ────────────────────────────────────────────────────────────
class ErrorBoundary extends Component<{children: React.ReactNode}, {error: string|null}> {
  state = { error: null };
  static getDerivedStateFromError(e: Error) { return { error: e.message }; }
  render() {
    if (this.state.error) {
      return (
        <View style={{ flex:1, backgroundColor:'#07111e', alignItems:'center', justifyContent:'center', padding:24 }}>
          <Text style={{ color:'#e8a23c', fontSize:14, fontFamily:'Courier', textAlign:'center' }}>{this.state.error}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

// ── Premium helpers ───────────────────────────────────────────────────────────
const isPremActive = (p: AppData['premium']) =>
  p?.paid || (p?.trial && p?.trialStart && (Date.now() - new Date(p.trialStart).getTime()) / 3600000 < 1);

const trialDaysLeft = (p: AppData['premium']) => {
  if (!p?.trial || !p?.trialStart) return 0;
  return Math.max(0, 1 - Math.floor((Date.now() - new Date(p.trialStart).getTime()) / 3600000));
};

// ── PremiumModal ──────────────────────────────────────────────────────────────
function PremiumModal({ visible, onClose, onTrial, onBuy, hasTrial, isDarkMode = true }: {
  visible: boolean; onClose:()=>void; onTrial:()=>void; onBuy:()=>void; hasTrial: boolean; isDarkMode?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={pm.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={[pm.sheet, { paddingBottom: insets.bottom + 24, backgroundColor: isDarkMode ? '#0d1b36' : '#fff' }]}>
          <View style={pm.handle} />

          {/* Icon + heading */}
          <View style={pm.iconWrap}><Ionicons name="star" size={26} color="#a48ee8" /></View>
          <Text style={pm.h1}>Breathe Premium</Text>
          <Text style={pm.sub}>Block distracting apps. Earn screentime back by breathing.</Text>

          {/* FREE vs PREMIUM comparison */}
          <View style={pm.table}>
            <View style={pm.tableHeader}>
              <Text style={[pm.tableCol, { flex: 2 }]}>Feature</Text>
              <Text style={[pm.tableCol, pm.tableColFree]}>Free</Text>
              <Text style={[pm.tableCol, pm.tableColPrem]}>Premium</Text>
            </View>
            {[
              ['All breathing techniques',     true,  true],
              ['Session tracking & streaks',   true,  true],
              ['Basic stats',                  true,  true],
              ['Block Instagram / TikTok',     false, true],
              ['Earn screentime by breathing', false, true],
              ['1 min = 10 min screen time',   false, true],
              ['Daily alarm reminders',        false, true],
              ['Year in review analytics',     false, true],
              ['Unlimited session history',    false, true],
            ].map(([label, free, prem]) => (
              <View key={label as string} style={pm.tableRow}>
                <Text style={[pm.tableCell, { flex: 2 }]}>{label as string}</Text>
                <Text style={[pm.tableCell, pm.tableCheck, !free && pm.tableCross]}>{free ? '✓' : '✕'}</Text>
                <Text style={[pm.tableCell, pm.tableCheck, { color: '#a48ee8' }]}>{prem ? '✓' : '✕'}</Text>
              </View>
            ))}
          </View>

          {/* Pricing */}
          <View style={pm.priceBox}>
            <View style={pm.priceRow}>
              <View>
                <Text style={pm.priceLabel}>Monthly</Text>
                <Text style={pm.priceAmt}>₹99 <Text style={pm.pricePer}>/month</Text></Text>
              </View>
              <TouchableOpacity style={pm.buyBtn} onPress={onBuy}>
                <Text style={pm.buyBtnTxt}>{hasTrial ? 'Buy Now' : 'Subscribe'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Trial CTA */}
          {!hasTrial ? (
            <TouchableOpacity style={pm.trialBtn} onPress={onTrial}>
              <Text style={pm.trialBtnTxt}>Start 7-Day Free Trial</Text>
              <Text style={pm.trialBtnSub}>Then ₹99/month · cancel anytime</Text>
            </TouchableOpacity>
          ) : (
            <View style={pm.trialActive}>
              <Text style={pm.trialActiveTxt}>✓ Free trial active — upgrade to keep access</Text>
            </View>
          )}
          <Text style={pm.fine}>Cancel anytime · No ads · Secure payment · ₹99/month after trial</Text>
        </View>
      </View>
    </Modal>
  );
}

const pm = StyleSheet.create({
  overlay: { flex:1, backgroundColor:'rgba(0,0,0,0.80)', justifyContent:'flex-end' },
  sheet: { backgroundColor: '#0d1b36', borderRadius:28, padding:24, paddingBottom:0, borderWidth:1, borderColor:'rgba(255,255,255,0.08)', borderBottomWidth:0, maxHeight:'92%' },
  handle: { width:40, height:4, borderRadius:2, backgroundColor:'rgba(255,255,255,0.10)', alignSelf:'center', marginBottom:20 },
  iconWrap: { width:56, height:56, borderRadius:16, alignItems:'center', justifyContent:'center', alignSelf:'center', marginBottom:12, backgroundColor:'rgba(164,142,232,0.22)', borderWidth:1, borderColor:'rgba(164,142,232,0.4)' },
  h1: { color:'#fff', fontSize:22, fontWeight:'700', textAlign:'center', marginBottom:6, letterSpacing:-0.5 },
  sub: { color:'rgba(255,255,255,0.48)', fontSize:13, textAlign:'center', lineHeight:20, marginBottom:18 },
  // Comparison table
  table: { backgroundColor:'rgba(255,255,255,0.03)', borderRadius:14, borderWidth:1, borderColor:'rgba(255,255,255,0.07)', overflow:'hidden', marginBottom:16 },
  tableHeader: { flexDirection:'row', paddingHorizontal:12, paddingVertical:10, borderBottomWidth:1, borderBottomColor:'rgba(255,255,255,0.07)', backgroundColor:'rgba(255,255,255,0.04)' },
  tableCol: { color:'rgba(255,255,255,0.40)', fontSize:11, fontWeight:'600', textAlign:'center', letterSpacing:0.5, textTransform:'uppercase' },
  tableColFree: { flex:1, textAlign:'center' },
  tableColPrem: { flex:1, textAlign:'center', color:'rgba(164,142,232,0.80)' },
  tableRow: { flexDirection:'row', paddingHorizontal:12, paddingVertical:9, borderBottomWidth:1, borderBottomColor:'rgba(255,255,255,0.05)' },
  tableCell: { color:'rgba(255,255,255,0.70)', fontSize:13, flex:1 },
  tableCheck: { flex:1, textAlign:'center', color:'rgba(79,205,216,0.90)', fontWeight:'700', fontSize:14 },
  tableCross: { color:'rgba(255,255,255,0.20)' },
  // Pricing
  priceBox: { backgroundColor:'rgba(164,142,232,0.10)', borderWidth:1, borderColor:'rgba(164,142,232,0.22)', borderRadius:14, padding:16, marginBottom:12 },
  priceRow: { flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  priceLabel: { color:'rgba(164,142,232,0.70)', fontSize:11, textTransform:'uppercase', letterSpacing:1, marginBottom:4 },
  priceAmt: { color:'#fff', fontSize:26, fontWeight:'700' },
  pricePer: { color:'rgba(255,255,255,0.45)', fontSize:14, fontWeight:'400' },
  // Buttons
  trialBtn: { backgroundColor:'#a48ee8', borderRadius:15, paddingVertical:16, paddingHorizontal:20, alignItems:'center', marginBottom:10, shadowColor:'#a48ee8', shadowOpacity:0.35, shadowRadius:14, shadowOffset:{width:0,height:5} },
  trialBtnTxt: { color:'#fff', fontSize:16, fontWeight:'700', marginBottom:2 },
  trialBtnSub: { color:'rgba(255,255,255,0.65)', fontSize:11 },
  trialActive: { backgroundColor:'rgba(79,205,216,0.10)', borderWidth:1, borderColor:'rgba(79,205,216,0.25)', borderRadius:12, padding:12, alignItems:'center', marginBottom:10 },
  trialActiveTxt: { color:'#4fcdd8', fontSize:13, fontWeight:'500' },
  buyBtn: { backgroundColor:'rgba(164,142,232,0.25)', borderWidth:1, borderColor:'rgba(164,142,232,0.40)', borderRadius:12, paddingVertical:10, paddingHorizontal:16, alignItems:'center' },
  buyBtnTxt: { color:'#a48ee8', fontSize:14, fontWeight:'700' },
  fine: { color:'rgba(255,255,255,0.20)', fontSize:11, textAlign:'center', paddingBottom:32, paddingTop:8 },
});

// ── Trial banner ──────────────────────────────────────────────────────────────
function TrialBanner({ daysLeft, onPress }: { daysLeft: number; onPress: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <TouchableOpacity onPress={onPress} style={{ backgroundColor:'#a48ee8', paddingTop: insets.top + 6, paddingBottom:8, paddingHorizontal:16, alignItems:'center' }}>
      <Text style={{ color:'#fff', fontSize:12, fontWeight:'600' }}>
        ✦ Free Trial — {daysLeft} day{daysLeft !== 1 ? 's' : ''} remaining · Upgrade →
      </Text>
    </TouchableOpacity>
  );
}

const Tab = createBottomTabNavigator();

export default function App() {
  const [data,             setData]             = useState<AppData>({ ...DEFAULT });
  const [session,          setSession]          = useState<{ tech: Technique; targetApp?: string } | null>(null);
  const [loaded,           setLoaded]           = useState(false);
  const [showPremium,      setShowPremium]      = useState(false);
  const [showOnboard,      setShowOnboard]      = useState(false);
  const [sound,            setSound]            = useState(true);
  const [isDark,           setIsDark]           = useState(true);
  const [showAndroidPicker, setShowAndroidPicker] = useState(false);
  const toggleTheme = () => setIsDark(d => !d);
  const th = isDark ? DARK : LIGHT;

  useEffect(() => {
    load().then(d => {
      setData(d);
      setLoaded(true);
      // Refresh slot hashKeys on every launch — token.hashValue changes between sessions
      const ST = require('./modules/screen-time');
      ST.getSlotInfo().then((info: any) => {
        if (info?.slots?.length > 0) {
          const freshSlots = info.slots.map((s: any) => ({ ...s, iconBase64: '' }));
          const next = { ...d, slots: freshSlots, nativeAppCount: freshSlots.length };
          setData(next);
          save(next);
        }
      }).catch(() => {});
      // Backfill icons for enabled apps missing icons
      const { APPS: ALL_APPS } = require('./src/data');
      const { fetchAppIcons } = require('./src/appIcons');
      const missing = ALL_APPS
        .filter((a: any) => d.appEnabled?.[a.id] && !d.appIconUrls?.[a.bundleId])
        .map((a: any) => a.bundleId);
      if (missing.length > 0) {
        fetchAppIcons(missing).then((icons: Record<string, string>) => {
          if (Object.keys(icons).length > 0) {
            const next = { ...d, appIconUrls: { ...(d.appIconUrls || {}), ...icons } };
            setData(next);
            save(next);
          }
        }).catch(() => {});
      }
    });
    AsyncStorage.getItem('breathe_onboarded').then(v => { if (!v) setShowOnboard(true); });
  }, []);

  const update = (d: AppData) => { setData(d); save(d); };

  // Open breathing session when user taps the "Time to Breathe" notification from ShieldActionExtension
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      if (response.notification.request.content.categoryIdentifier === 'BREATHE_UNLOCK' ||
          response.notification.request.content.title === 'Time to Breathe') {
        startSession(TECHNIQUES[0]);
      }
    });
    return () => sub.remove();
  }, []);

  // Auto-shield when any app/slot monitoring countdown expires (JS wall-clock fallback)
  useEffect(() => {
    const t = setInterval(async () => {
      const n = Date.now();

      // Android: start service and add expired apps to blocked list
      if (Platform.OS === 'android') {
        const selected = data.androidBlockedPackages || [];
        const expiredPkgs = selected.filter(pkg => {
          if (!data.androidAppMonitored?.[pkg]) return false;
          const lim = (data.androidAppLimits?.[pkg] || 15) * 60000;
          const at = data.androidAppActivatedAt?.[pkg] || 0;
          return at > 0 && n - at >= lim;
        });
        if (expiredPkgs.length > 0) {
          await AndroidBlocker.setBlockedApps(expiredPkgs);
          if (!data.androidBlockingActive) {
            await AndroidBlocker.startBlockingService();
            update({ ...data, androidBlockingActive: true });
          }
        }
        return;
      }

      // iOS: shield all apps when any timer expires
      if (data.stShieldEnabled) return;
      const { APPS: ALL_APPS } = require('./src/data');
      const anyKnownExpired = ALL_APPS.some((a: any) => {
        if (!data.appEnabled?.[a.id] || !data.appMonitored?.[a.id]) return false;
        const lim = (data.appLimits?.[a.id] || 15) * 60000;
        const at = data.appActivatedAt?.[a.id] || 0;
        return at > 0 && n - at >= lim;
      });
      const anySlotExpired = (data.slots || []).some((slot: any) => {
        if (!data.slotMonitored?.[slot.hashKey] || !data.slotActivatedAt?.[slot.hashKey]) return false;
        const lim = (data.slotLimits?.[slot.hashKey] || 15) * 60000;
        const at = data.slotActivatedAt[slot.hashKey];
        return at > 0 && n - at >= lim;
      });
      if (anyKnownExpired || anySlotExpired) {
        const ST = require('./modules/screen-time');
        const r = await ST.shieldApps().catch(() => ({ success: false }));
        if (r.success) {
          const info = await ST.getSlotInfo().catch(() => ({ slots: [] }));
          update({ ...data, stShieldEnabled: true, lockDate: todayStr(), slots: info.slots || [], slotsVersion: (data.slotsVersion || 0) + 1 });
        }
      }
    }, 15000);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const isPrem   = isPremActive(data.premium);
  const dLeft    = trialDaysLeft(data.premium);
  const hasTrial = !!(data.premium?.trial && dLeft > 0);

  const handleTrial = () => {
    update({ ...data, premium: { ...data.premium, trial: true, trialStart: new Date().toISOString() } });
    setShowPremium(false);
    Alert.alert('🎉 Trial Started!', '7 days of full access. All screentime features unlocked.');
  };

  const handleBuy = async () => {
    try {
      const IAP = require('expo-iap');
      const PRODUCT_ID = Platform.OS === 'android'
        ? 'breathe_premium_monthlyv1'
        : 'com.breathex.app.premium.monthlyv1';

      await IAP.initConnection();

      // Verify product exists in App Store Connect
      const subs = await IAP.fetchProducts({ skus: [PRODUCT_ID], type: 'subs' });
      if (!subs || subs.length === 0) {
        await IAP.endConnection().catch(() => {});
        Alert.alert(
          'Not Configured',
          'Subscription not set up in App Store Connect yet.\n\nFor testing: activate as purchased?',
          [
            { text: 'Simulate', onPress: () => { update({ ...data, premium: { ...data.premium, paid: true } }); setShowPremium(false); } },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
        return;
      }

      // Listen for purchase result (event-based in v4)
      const purchaseSub = IAP.purchaseUpdatedListener(async (purchase: any) => {
        if (purchase?.transactionReceipt) {
          await IAP.finishTransaction({ purchase, isConsumable: false });
          purchaseSub?.remove();
          await IAP.endConnection().catch(() => {});
          update({ ...data, premium: { ...data.premium, paid: true } });
          setShowPremium(false);
          Alert.alert('✓ Premium Activated', 'Thank you! All features unlocked.');
        }
      });

      await IAP.requestPurchase({
        request: {
          apple: { sku: PRODUCT_ID },
          google: { skus: [PRODUCT_ID] },
        },
        type: 'subs',
      });
    } catch (e: any) {
      if (e?.code !== 'E_USER_CANCELLED') {
        Alert.alert(
          'Purchase unavailable',
          'Open App Store Connect, create the subscription product, then try again.\n\nFor testing:',
          [
            { text: 'Simulate Purchase', onPress: () => { update({ ...data, premium: { ...data.premium, paid: true } }); setShowPremium(false); } },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
      }
    }
  };

  const startSession = (tech: Technique, targetApp?: string) => setSession({ tech, targetApp });

  const endSession = async (techId: string, minutes: number, cycles: number, targetApp?: string) => {
    const mode = data.mode || 'normal';
    const calibration = (data.calibration ?? 10) as any;
    const earned = earnedScreenMin(minutes, mode, calibration);
    const ae = { ...(data.appEarned || {}) };
    if (targetApp && !targetApp.startsWith('slot_') && !targetApp.startsWith('android_pkg_')) {
      ae[targetApp] = (ae[targetApp] || 0) + earned;
    } else if (!targetApp) {
      const ids = Object.keys(data.appEnabled || {}).filter(k => data.appEnabled[k]);
      ids.forEach(id => { ae[id] = (ae[id] || 0) + Math.round(earned / Math.max(ids.length, 1)); });
    }
    const ST = require('./modules/screen-time');
    const nativeCount = ST.getSelectedAppCount ? ST.getSelectedAppCount() : (data.nativeAppCount || 0);
    const now = new Date();

    // Android: require 5 minutes of breathing to unlock any blocked app
    if (Platform.OS === 'android' && targetApp?.startsWith('android_pkg_') && minutes < 5) {
      Alert.alert(
        'Need 5 Minutes',
        'You need at least 5 minutes of breathing to unlock this app. Keep going!',
        [{ text: 'OK' }]
      );
      setSession(null);
      return;
    }

    // iOS strict mode: require at least 5 minutes of breathing to unlock
    if (targetApp && data.stShieldEnabled && minutes < 5) {
      Alert.alert(
        'Need 5 Minutes',
        'Strict mode requires at least 5 minutes of breathing to unlock. Keep going!',
        [{ text: 'OK' }]
      );
      setSession(null);
      return;
    }

    // Unshield the specific slot/app BEFORE updating state so UI reflects correctly
    let freshSlots: any[] = data.slots || [];
    let newSlotsVersion = (data.slotsVersion || 0) + 1;
    if (targetApp && data.stShieldEnabled) {
      try {
        if (targetApp.startsWith('slot_')) {
          const slotIndex = parseInt(targetApp.replace('slot_', ''), 10);
          if (!isNaN(slotIndex)) {
            await ST.unshieldSlot(slotIndex);
            if (mode === 'strict') {
              // Re-shield after the slot's saved limit, then restart monitoring for next cycle
              const slot = (data.slots || [])[slotIndex];
              const slotLim = slot ? (data.slotLimits?.[slot.hashKey] || 15) : 15;
              setTimeout(async () => {
                await ST.reshieldSlot(slotIndex).catch(() => {});
                // Restart monitoring so blocking cycle repeats
                const { scheduleSlotMonitoring } = require('./modules/screen-time');
                await scheduleSlotMonitoring(slotIndex, slotLim).catch(() => {});
              }, slotLim * 60000);
            }
          }
        } else {
          const { APPS: ALL_APPS } = require('./src/data');
          const blockedApp = ALL_APPS.find((a: any) => a.id === targetApp);
          if (blockedApp) await ST.unshieldBundleId(blockedApp.bundleId).catch(() => {});
        }
        // Refresh slot list so ScreentimeScreen shows updated blocked states
        const info = await ST.getSlotInfo().catch(() => ({ slots: [] }));
        freshSlots = info.slots || [];
      } catch {}
    }

    // Android: temporarily unblock the specific app (or all) after breathing
    if (Platform.OS === 'android') {
      const durationMs = Math.min(earned, 1440) * 60 * 1000;
      if (targetApp?.startsWith('android_pkg_')) {
        const pkg = targetApp.replace('android_pkg_', '');
        await AndroidBlocker.temporarilyUnblock([pkg], durationMs).catch(() => {});
      } else if (data.androidBlockingActive && (data.androidBlockedPackages || []).length > 0) {
        await AndroidBlocker.temporarilyUnblock(data.androidBlockedPackages || [], durationMs).catch(() => {});
      }
    }

    setData(prev => {
      const next = {
        ...prev,
        sessions: [...prev.sessions, {
          date: now.toISOString().slice(0, 10),
          technique: techId, duration: minutes, cycles,
          hour: now.getHours(), ts: Date.now(),
        }],
        totalMin: prev.totalMin + minutes,
        earnedMin: (prev.earnedMin || 0) + earned,
        appEarned: ae,
        nativeAppCount: nativeCount,
        slots: freshSlots,
        slotsVersion: newSlotsVersion,
      };
      save(next);
      return next;
    });
    setSession(null);
  };

  if (!loaded) return <View style={{ flex: 1, backgroundColor: DARK.bg }} />;

  if (showOnboard) return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <OnboardingScreen onDone={() => {
        AsyncStorage.setItem('breathe_onboarded', '1');
        setShowOnboard(false);
      }} />
    </SafeAreaProvider>
  );

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" />
        {hasTrial && <TrialBanner daysLeft={dLeft} onPress={() => setShowPremium(true)} />}

        <NavigationContainer ref={navRef} theme={{ ...DarkTheme, colors: { ...DarkTheme.colors, background: th.bg, card: th.surf, text: th.text, border: th.border, primary: th.teal, notification: th.teal } }}>
          <Tab.Navigator
            id={undefined}
            screenOptions={({ route }) => ({
              headerShown: false,
              tabBarStyle: { backgroundColor: th.navBg, borderTopWidth: 0, paddingBottom: 6, height: 80 },
              tabBarActiveTintColor: th.teal,
              tabBarInactiveTintColor: th.label,
              tabBarLabelStyle: { fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase' },
              tabBarIcon: ({ color, focused }) => {
                const icons: Record<string, [string, string]> = {
                  Home:       ['home',              'home-outline'],
                  Stats:      ['bar-chart',         'bar-chart-outline'],
                  Screen:     ['shield-checkmark',  'shield-checkmark-outline'],
                  Settings:   ['settings-sharp',    'settings-outline'],
                };
                const [active, inactive] = icons[route.name] ?? ['ellipse', 'ellipse-outline'];
                return <Ionicons name={(focused ? active : inactive) as any} size={22} color={color} />;
              },
            })}
          >
            <Tab.Screen name="Home">
              {() => (
                <HomeScreen
                  data={data} onUpdate={update} onStartSession={startSession}
                  th={th} isPrem={isPrem} onShowPremium={() => setShowPremium(true)}
                  isDark={isDark} onToggleTheme={toggleTheme}
                  onNavigateToScreen={() => navRef.isReady() && navRef.navigate('Screen')}
                />
              )}
            </Tab.Screen>
            <Tab.Screen name="Stats">
              {() => <StatsScreen data={data} th={th} />}
            </Tab.Screen>



            <Tab.Screen name="Screen"
              options={{ tabBarBadge: !isPrem ? '' : undefined, tabBarBadgeStyle: { backgroundColor: '#a48ee8', minWidth: 8, height: 8, borderRadius: 4 } }}
            >
              {() => (
                <ScreentimeScreen
                  data={data} onUpdate={update} onStartSession={startSession}
                  th={th} isPrem={isPrem} onShowPremium={() => setShowPremium(true)}
                  onPickApps={async () => {
                    if (Platform.OS === 'android') {
                      setShowAndroidPicker(true);
                      return;
                    }
                    const ST = require('./modules/screen-time');
                    const authStatus = ST.getAuthorizationStatus();
                    if (authStatus !== 'approved') {
                      const r = await ST.requestAuthorization();
                      if (!r.authorized) return;
                    }
                    const res = await ST.showAppPicker();
                    if (res.selected) {
                      // Refresh slot list immediately — reflects new selection
                      const info = await ST.getSlotInfo().catch(() => ({ slots: [] }));
                      const newSlots = (info.slots || []).map((s: any) => ({ ...s, iconBase64: '' }));
                      update({ ...data, slots: newSlots, nativeAppCount: res.appCount });
                    } else {
                      // Cancelled — clear family selection entirely
                      await ST.clearSelection().catch(() => {});
                      update({ ...data, slots: [], nativeAppCount: 0, stShieldEnabled: false });
                    }
                  }}
                />
              )}
            </Tab.Screen>
            <Tab.Screen name="Settings">
              {() => (
                <SettingsScreen
                  data={data} onUpdate={update} th={th}
                  isDark={isDark} onToggleTheme={toggleTheme}
                  sound={sound} onToggleSound={() => setSound(s => !s)}
                  onShowPremium={() => setShowPremium(true)}
                  onResetOnboarding={() => setShowOnboard(true)}
                />
              )}
            </Tab.Screen>
          </Tab.Navigator>
        </NavigationContainer>

        <PremiumModal
          visible={showPremium}
          hasTrial={hasTrial}
          isDarkMode={isDark}
          onClose={() => setShowPremium(false)}
          onTrial={handleTrial}
          onBuy={handleBuy}
        />
        {Platform.OS === 'android' && (
          <AndroidAppPickerModal
            visible={showAndroidPicker}
            selectedPackages={data.androidBlockedPackages || []}
            th={th}
            onCancel={() => setShowAndroidPicker(false)}
            onDone={async (packages) => {
              await AndroidBlocker.setBlockedApps(packages);
              update({ ...data, androidBlockedPackages: packages });
              setShowAndroidPicker(false);
            }}
          />
        )}
        {/* SessionScreen as overlay — keeps NavigationContainer mounted so tab state is preserved */}
        {session && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }}>
            <SessionScreen
              tech={session.tech}
              targetApp={session.targetApp}
              onDone={endSession}
              onBack={() => setSession(null)}
              th={th}
            />
          </View>
        )}
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
