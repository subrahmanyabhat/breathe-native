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
          <View style={pm.iconWrap}>
            <Text style={{ fontSize: 28 }}>✦</Text>
          </View>
          <Text style={pm.h1}>Unlock Premium</Text>
          <Text style={pm.sub}>Breathe your way to more time.{'\n'}Block apps. Earn screentime back.</Text>

          {/* Benefits */}
          <View style={pm.benefits}>
            {[
              ['⏱', '1 min breathing = 10 min screentime'],
              ['🔒', 'Block Instagram, TikTok, YouTube, X'],
              ['🔔', 'Daily reminders & streak protection'],
              ['📊', 'Session analytics & insights'],
            ].map(([icon, text]) => (
              <View key={text} style={pm.benefit}>
                <Text style={pm.benefitIcon}>{icon}</Text>
                <Text style={pm.benefitTxt}>{text}</Text>
              </View>
            ))}
          </View>

          {/* CTAs */}
          {!hasTrial && (
            <TouchableOpacity style={pm.trialBtn} onPress={onTrial}>
              <Text style={pm.trialBtnTxt}>Start 7-Day Free Trial</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[pm.buyBtn, hasTrial && pm.trialBtn]} onPress={onBuy}>
            <Text style={[pm.buyBtnTxt, hasTrial && pm.trialBtnTxt]}>
              {hasTrial ? 'Upgrade Now — $4.99/mo' : '$4.99 / month  ·  $29.99 / year'}
            </Text>
          </TouchableOpacity>
          <Text style={pm.fine}>Cancel anytime · No ads · Secure payment</Text>
        </View>
      </View>
    </Modal>
  );
}

const pm = StyleSheet.create({
  overlay: { flex:1, backgroundColor:'rgba(0,0,0,0.75)', justifyContent:'flex-end' },
  sheet: { backgroundColor:'#0d1b36', borderRadius:28, padding:28, borderWidth:1, borderColor:'rgba(255,255,255,0.08)', borderBottomWidth:0 },
  handle: { width:40, height:4, borderRadius:2, backgroundColor:'rgba(255,255,255,0.10)', alignSelf:'center', marginBottom:24 },
  iconWrap: { width:60, height:60, borderRadius:18, backgroundColor:'linear-gradient(135deg,#a48ee8,#5ec4e0)' as any, alignItems:'center', justifyContent:'center', alignSelf:'center', marginBottom:14, backgroundColor:'rgba(164,142,232,0.25)', borderWidth:1, borderColor:'rgba(164,142,232,0.4)' },
  h1: { color:'#fff', fontSize:22, fontWeight:'700', textAlign:'center', marginBottom:8, letterSpacing:-0.5 },
  sub: { color:'rgba(255,255,255,0.50)', fontSize:14, textAlign:'center', lineHeight:21, marginBottom:22 },
  benefits: { gap:8, marginBottom:24 },
  benefit: { flexDirection:'row', alignItems:'center', gap:12, backgroundColor:'rgba(255,255,255,0.04)', borderWidth:1, borderColor:'rgba(255,255,255,0.07)', borderRadius:12, padding:13 },
  benefitIcon: { fontSize:17, flexShrink:0 },
  benefitTxt: { color:'rgba(255,255,255,0.88)', fontSize:14, flex:1 },
  trialBtn: { backgroundColor:'#a48ee8', borderRadius:15, padding:17, alignItems:'center', marginBottom:10, shadowColor:'#a48ee8', shadowOpacity:0.4, shadowRadius:16, shadowOffset:{width:0,height:6} },
  trialBtnTxt: { color:'#fff', fontSize:16, fontWeight:'700' },
  buyBtn: { backgroundColor:'rgba(255,255,255,0.07)', borderWidth:1, borderColor:'rgba(255,255,255,0.10)', borderRadius:15, padding:15, alignItems:'center', marginBottom:12 },
  buyBtnTxt: { color:'rgba(255,255,255,0.55)', fontSize:14, fontWeight:'500' },
  fine: { color:'rgba(255,255,255,0.25)', fontSize:11, textAlign:'center' },
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
