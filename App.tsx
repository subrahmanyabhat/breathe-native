import React, { useState, useEffect, Component } from 'react';
import { StatusBar, View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { enableScreens } from 'react-native-screens';
import { Ionicons } from '@expo/vector-icons';
import { load, save, AppData, DEFAULT } from './src/storage';
import { DARK } from './src/theme';
import HomeScreen from './src/screens/HomeScreen';
import StatsScreen from './src/screens/StatsScreen';
import ScreentimeScreen from './src/screens/ScreentimeScreen';
import SessionScreen from './src/screens/SessionScreen';
import { Technique } from './src/data';

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
  p?.paid || (p?.trial && p?.trialStart && (Date.now() - new Date(p.trialStart).getTime()) / 86400000 < 7);

const trialDaysLeft = (p: AppData['premium']) => {
  if (!p?.trial || !p?.trialStart) return 0;
  return Math.max(0, 7 - Math.floor((Date.now() - new Date(p.trialStart).getTime()) / 86400000));
};

// ── PremiumModal ──────────────────────────────────────────────────────────────
function PremiumModal({ visible, onClose, onTrial, onBuy, hasTrial }: {
  visible: boolean; onClose:()=>void; onTrial:()=>void; onBuy:()=>void; hasTrial: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={pm.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={[pm.sheet, { paddingBottom: insets.bottom + 24 }]}>
          <View style={pm.handle} />

          {/* Icon + heading */}
          <View style={pm.iconWrap}><Text style={{ fontSize: 28 }}>✦</Text></View>
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
              <Text style={pm.trialBtnTxt}>🎁  Start 7-Day Free Trial</Text>
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
  sheet: { backgroundColor:'#0d1b36', borderRadius:28, padding:24, paddingBottom:0, borderWidth:1, borderColor:'rgba(255,255,255,0.08)', borderBottomWidth:0, maxHeight:'92%' },
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
function TrialBanner({ daysLeft }: { daysLeft: number }) {
  return (
    <View style={{ backgroundColor:'#a48ee8', paddingVertical:6, paddingHorizontal:16, alignItems:'center' }}>
      <Text style={{ color:'#fff', fontSize:12, fontWeight:'600' }}>
        ✦ Free Trial — {daysLeft} day{daysLeft !== 1 ? 's' : ''} remaining
      </Text>
    </View>
  );
}

const Tab = createBottomTabNavigator();

export default function App() {
  const [data,        setData]        = useState<AppData>({ ...DEFAULT });
  const [session,     setSession]     = useState<{ tech: Technique; targetApp?: string } | null>(null);
  const [loaded,      setLoaded]      = useState(false);
  const [showPremium, setShowPremium] = useState(false);

  useEffect(() => { load().then(d => { setData(d); setLoaded(true); }); }, []);

  const update = (d: AppData) => { setData(d); save(d); };

  const isPrem   = isPremActive(data.premium);
  const dLeft    = trialDaysLeft(data.premium);
  const hasTrial = !!(data.premium?.trial && dLeft > 0);

  const handleTrial = () => {
    update({ ...data, premium: { ...data.premium, trial: true, trialStart: new Date().toISOString() } });
    setShowPremium(false);
    Alert.alert('🎉 Trial Started!', '7 days of full access. All screentime features unlocked.');
  };

  const handleBuy = () => {
    // Placeholder — real StoreKit purchase goes here
    update({ ...data, premium: { ...data.premium, paid: true } });
    setShowPremium(false);
    Alert.alert('✓ Premium Activated', 'Thank you! All features unlocked.');
  };

  const startSession = (tech: Technique, targetApp?: string) => setSession({ tech, targetApp });

  const endSession = (techId: string, minutes: number, cycles: number, targetApp?: string) => {
    const earned = minutes * 10;
    const ae = { ...(data.appEarned || {}) };
    if (targetApp) {
      ae[targetApp] = (ae[targetApp] || 0) + earned;
    } else {
      const ids = Object.keys(data.appEnabled || {}).filter(k => data.appEnabled[k]);
      ids.forEach(id => { ae[id] = (ae[id] || 0) + Math.round(earned / Math.max(ids.length, 1)); });
    }
    const now = new Date();
    update({
      ...data,
      sessions: [...data.sessions, {
        date: now.toISOString().slice(0, 10),
        technique: techId, duration: minutes, cycles,
        hour: now.getHours(), ts: Date.now(),
      }],
      totalMin: data.totalMin + minutes,
      earnedMin: (data.earnedMin || 0) + earned,
      appEarned: ae,
    });
    setSession(null);
  };

  if (!loaded) return <View style={{ flex: 1, backgroundColor: DARK.bg }} />;

  if (session) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" />
        <SessionScreen tech={session.tech} targetApp={session.targetApp} onDone={endSession} onBack={() => setSession(null)} />
      </SafeAreaProvider>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" />
        {hasTrial && <TrialBanner daysLeft={dLeft} />}

        <NavigationContainer theme={{ ...DarkTheme, colors: { ...DarkTheme.colors, background: DARK.bg, card: DARK.surf, text: DARK.text, border: DARK.border, primary: DARK.teal, notification: DARK.teal } }}>
          <Tab.Navigator
            screenOptions={({ route }) => ({
              headerShown: false,
              tabBarStyle: { backgroundColor: 'rgba(7,17,30,0.97)', borderTopColor: DARK.border, borderTopWidth: 1, paddingBottom: 6, height: 80 },
              tabBarActiveTintColor: DARK.teal,
              tabBarInactiveTintColor: DARK.label,
              tabBarLabelStyle: { fontSize: 10, letterSpacing: 0.6 },
              tabBarIcon: ({ color, focused }) => {
                const icons: Record<string, [string, string]> = {
                  Home:       ['home',              'home-outline'],
                  Stats:      ['bar-chart',         'bar-chart-outline'],
                  Screentime: ['shield-checkmark',  'shield-checkmark-outline'],
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
                  isPrem={isPrem} onShowPremium={() => setShowPremium(true)}
                />
              )}
            </Tab.Screen>
            <Tab.Screen name="Stats">
              {() => <StatsScreen data={data} />}
            </Tab.Screen>
            <Tab.Screen name="Screentime"
              options={{ tabBarBadge: !isPrem ? '' : undefined, tabBarBadgeStyle: { backgroundColor: '#a48ee8', minWidth: 8, height: 8, borderRadius: 4 } }}
            >
              {() => (
                <ScreentimeScreen
                  data={data} onUpdate={update} onStartSession={startSession}
                  isPrem={isPrem} onShowPremium={() => setShowPremium(true)}
                />
              )}
            </Tab.Screen>
          </Tab.Navigator>
        </NavigationContainer>

        <PremiumModal
          visible={showPremium}
          hasTrial={hasTrial}
          onClose={() => setShowPremium(false)}
          onTrial={handleTrial}
          onBuy={handleBuy}
        />
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
