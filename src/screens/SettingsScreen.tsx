import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { DARK, Theme } from '../theme';
import { AppData } from '../storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PRIVACY_URL = 'https://narrow-geometry-8d7.notion.site/Breathe-Privacy-Policy-366017564263814d8acee4f287319443';
const TERMS_URL   = 'https://narrow-geometry-8d7.notion.site/Breathe-Terms-Conditions-366017564263816abc4aeb8e7e8bb8d0';
const COFFEE_URL  = 'https://buymeacoffee.com/subrahmanya';

interface Props {
  data: AppData;
  onUpdate: (d: AppData) => void;
  th?: Theme;
  isDark?: boolean;
  onToggleTheme?: () => void;
  sound: boolean;
  onToggleSound: () => void;
  onShowPremium: () => void;
  onResetOnboarding: () => void;
}

export default function SettingsScreen({ data, onUpdate, th = DARK, isDark = true, onToggleTheme, sound, onToggleSound, onShowPremium, onResetOnboarding }: Props) {
  const reminder = data.reminder || { enabled: false, time: '08:00' };

  const openScreenTime = () =>
    Linking.openURL('App-Prefs:root=SCREEN_TIME')
      .catch(() => Linking.openURL('App-Prefs:SCREENTIME')
      .catch(() => Linking.openSettings()));
  const openPrivacy = () => Linking.openURL(PRIVACY_URL).catch(() => Alert.alert('Privacy Policy', 'Visit: subrahmanya126@gmail.com'));
  const openTerms   = () => Linking.openURL(TERMS_URL).catch(() => Alert.alert('Terms', 'Visit: subrahmanya126@gmail.com'));

  const ss = styles(th);

  const Row = ({ label, sub, onPress, right }: { label: string; sub?: string; onPress?: () => void; right?: React.ReactNode }) => (
    <TouchableOpacity onPress={onPress} disabled={!onPress} style={[ss.row, { borderColor: th.border }]}>
      <View style={{ flex: 1 }}>
        <Text style={[ss.rowLabel, { color: th.text }]}>{label}</Text>
        {sub && <Text style={[ss.rowSub, { color: th.text2 }]}>{sub}</Text>}
      </View>
      {right}
    </TouchableOpacity>
  );

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

          <View style={ss.header}>
            <Text style={[ss.title, { color: th.text }]}>Settings</Text>
          </View>

          {/* Appearance */}
          <Text style={[ss.section, { color: th.label }]}>APPEARANCE</Text>
          <View style={[ss.group, { backgroundColor: th.surf, borderColor: th.border }]}>
            <Row
              label="Dark Mode"
              sub={isDark ? 'Currently dark' : 'Currently light'}
              right={<Switch value={isDark} onValueChange={onToggleTheme} trackColor={{ true: th.teal, false: th.border }} thumbColor="#fff" />}
            />
          </View>

          {/* Audio */}
          <Text style={[ss.section, { color: th.label }]}>AUDIO</Text>
          <View style={[ss.group, { backgroundColor: th.surf, borderColor: th.border }]}>
            <Row
              label="Sound Effects"
              sub="Bell tones + ambient drone during sessions"
              right={<Switch value={sound} onValueChange={onToggleSound} trackColor={{ true: th.teal, false: th.border }} thumbColor="#fff" />}
            />
          </View>

          {/* Reminders */}
          <Text style={[ss.section, { color: th.label }]}>REMINDERS</Text>
          <View style={[ss.group, { backgroundColor: th.surf, borderColor: th.border }]}>
            <Row
              label="Daily Reminder"
              sub={reminder.enabled ? `Every day at ${reminder.time}` : 'Not set'}
              onPress={() => Alert.alert('Reminder', 'Set your reminder in the Home tab → bell icon.')}
              right={<Ionicons name={reminder.enabled ? 'notifications' : 'notifications-outline'} size={16} color={reminder.enabled ? th.teal : th.text2} />}
            />
          </View>

          {/* Blocking Mode */}
          <Text style={[ss.section, { color: th.label }]}>BLOCKING MODE</Text>
          <View style={[ss.group, { backgroundColor: th.surf, borderColor: th.border }]}>
            <TouchableOpacity onPress={() => onUpdate({ ...data, mode: 'normal' })}
              style={[ss.row, { borderColor: th.border, backgroundColor: data.mode !== 'strict' ? `${th.teal}10` : 'transparent' }]}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="leaf-outline" size={16} color={th.teal} />
                  <Text style={[ss.rowLabel, { color: th.text }]}>Normal</Text>
                </View>
                <Text style={[ss.rowSub, { color: th.text2 }]}>5 min breathing → unlocked for the rest of the day</Text>
              </View>
              <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: data.mode !== 'strict' ? th.teal : th.border, backgroundColor: data.mode !== 'strict' ? th.teal : 'transparent' }} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onUpdate({ ...data, mode: 'strict' })}
              style={[ss.row, { borderColor: th.border, backgroundColor: data.mode === 'strict' ? 'rgba(220,60,60,0.07)' : 'transparent' }]}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="lock-closed-outline" size={16} color="#e05555" />
                  <Text style={[ss.rowLabel, { color: th.text }]}>Strict</Text>
                </View>
                <Text style={[ss.rowSub, { color: th.text2 }]}>5 min breathing → unlocked for your set limit, then blocks again</Text>
              </View>
              <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: data.mode === 'strict' ? '#e05555' : th.border, backgroundColor: data.mode === 'strict' ? '#e05555' : 'transparent' }} />
            </TouchableOpacity>
          </View>

          {/* Screen Time */}
          <Text style={[ss.section, { color: th.label }]}>SCREEN TIME</Text>
          <View style={[ss.group, { backgroundColor: th.surf, borderColor: th.border }]}>
            <Row
              label="Open Screen Time"
              sub="iOS Settings → Screen Time → App Limits"
              onPress={openScreenTime}
              right={<Ionicons name="open-outline" size={16} color={th.teal} />}
            />
          </View>

          {/* Subscription */}
          <Text style={[ss.section, { color: th.label }]}>SUBSCRIPTION</Text>
          {data.premium?.paid && (
            <View style={{ marginHorizontal: 16, backgroundColor: `${th.teal}12`, borderWidth: 1, borderColor: `${th.teal}35`, borderRadius: 16, padding: 14, marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Ionicons name="star" size={14} color={th.teal} />
                <Text style={{ color: th.teal, fontSize: 13, fontWeight: '600' }}>Premium Active — All features unlocked</Text>
              </View>
            </View>
          )}
          <View style={[ss.group, { backgroundColor: th.surf, borderColor: th.border }]}>
            <Row
              label="Premium Plan"
              sub={data.premium?.paid ? 'Active ✓' : data.premium?.trial ? 'Free trial active' : 'Not subscribed'}
              onPress={onShowPremium}
              right={<Ionicons name={data.premium?.paid ? 'checkmark-circle' : 'chevron-forward'} size={16} color={data.premium?.paid ? th.teal : '#a48ee8'} />}
            />
            <Row
              label="Restore Purchases"
              onPress={async () => {
                try {
                  const IAP = require('expo-iap');
                  await IAP.initConnection();
                  const purchases = await IAP.getAvailablePurchases();
                  await IAP.endConnection().catch(() => {});
                  const PREMIUM_ID = 'com.breathex.app.premium.monthly';
                  const hasPremium = purchases?.some((p: any) => p.productId === PREMIUM_ID || p.id === PREMIUM_ID);
                  if (hasPremium) {
                    onUpdate({ ...data, premium: { ...data.premium, paid: true } });
                    Alert.alert('✓ Restored', 'Premium subscription restored.');
                  } else {
                    Alert.alert('Nothing to Restore', 'No active premium subscription found for this Apple ID.');
                  }
                } catch {
                  Alert.alert('Restore Failed', 'Could not connect to App Store. Try again.');
                }
              }}
              right={<Ionicons name="refresh-outline" size={16} color={th.teal} />}
            />
          </View>

          {/* Support creator */}
          <Text style={[ss.section, { color: th.label }]}>SUPPORT THE CREATOR</Text>
          <View style={[ss.group, { backgroundColor: th.surf, borderColor: th.border }]}>
            {[
              { emoji: '☕', name: 'Coffee', sub: 'Fuel the next feature', price: '₹49', productId: 'com.breathex.app.coffee50' },
              { emoji: '🍦', name: 'Ice Cream', sub: 'Sweet motivation', price: '₹99', productId: 'com.breathex.app.icecream99' },
              { emoji: '🧋', name: 'Boba Tea', sub: 'Keep the ideas flowing', price: '₹199', productId: 'com.breathex.app.boba199' },
              { emoji: '🎁', name: 'Gift', sub: "You're amazing, thank you", price: '₹299', productId: 'com.breathex.app.gift299' },
            ].map((item, i, arr) => (
              <TouchableOpacity key={item.productId}
                style={[ss.row, { borderColor: th.border, borderBottomWidth: i < arr.length - 1 ? 1 : 0 }]}
                onPress={async () => {
                  try {
                    const IAP = require('expo-iap');
                    await IAP.initConnection();
                    const products = await IAP.fetchProducts({ skus: [item.productId], type: 'in-app' });
                    if (!products || products.length === 0) {
                      await IAP.endConnection().catch(() => {});
                      Alert.alert('Product Not Found', `App Store returned no product for:\n\n${item.productId}`);
                      return;
                    }
                    const purchaseSub = IAP.purchaseUpdatedListener(async (purchase: any) => {
                      if (purchase?.transactionReceipt) {
                        await IAP.finishTransaction({ purchase, isConsumable: true });
                        purchaseSub?.remove();
                        await IAP.endConnection().catch(() => {});
                        Alert.alert('Thank you!', 'Your support means everything!');
                      }
                    });
                    await IAP.requestPurchase({ request: { apple: { sku: item.productId }, google: { skus: [item.productId] } }, type: 'in-app' });
                  } catch (e: any) {
                    if (e?.code !== 'E_USER_CANCELLED' && !e?.message?.includes('cancel')) {
                      Alert.alert('Purchase unavailable', 'Please try again later.');
                    }
                  }
                }}>
                <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: `${th.teal}12`, alignItems: 'center', justifyContent: 'center', marginRight: 14, borderWidth: 1, borderColor: `${th.teal}20` }}>
                  <Text style={{ fontSize: 20 }}>{item.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[ss.rowLabel, { color: th.text }]}>{item.name}</Text>
                  <Text style={[ss.rowSub, { color: th.text2 }]}>{item.sub}</Text>
                </View>
                <Text style={{ color: th.teal, fontSize: 16, fontWeight: '700', marginLeft: 8 }}>{item.price}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Buy Me a Coffee */}
          <Text style={[ss.section, { color: th.label }]}>SUPPORT</Text>
          <TouchableOpacity
            onPress={() => Linking.openURL(COFFEE_URL)}
            style={[ss.group, { backgroundColor: th.surf, borderColor: th.border, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }]}
            activeOpacity={0.8}>
            <Text style={{ fontSize: 26 }}>☕</Text>
            <View style={{ flex: 1 }}>
              <Text style={[ss.rowLabel, { color: th.text }]}>Buy me a coffee</Text>
              <Text style={[ss.rowSub, { color: th.text2 }]}>Support Breathe development</Text>
            </View>
            <Ionicons name="open-outline" size={16} color={th.teal} />
          </TouchableOpacity>

          {/* About */}
          <Text style={[ss.section, { color: th.label }]}>ABOUT</Text>
          <View style={[ss.group, { backgroundColor: th.surf, borderColor: th.border }]}>
            <Row label="Privacy Policy" onPress={openPrivacy} right={<Ionicons name="open-outline" size={16} color={th.teal} />} />
            <Row label="Terms & Conditions" onPress={openTerms} right={<Ionicons name="open-outline" size={16} color={th.teal} />} />
            <Row label="Version" sub="1.0.0 · Built with ♡" right={null} />
            <Row
              label="Re-watch Introduction"
              sub="Show onboarding again"
              onPress={() => { AsyncStorage.removeItem('breathe_onboarded'); onResetOnboarding(); }}
              right={<Ionicons name="refresh-outline" size={16} color={th.teal} />}
            />
          </View>

          {/* Data */}
          <Text style={[ss.section, { color: th.label }]}>DATA</Text>
          <View style={[ss.group, { backgroundColor: th.surf, borderColor: th.border }]}>
            <Row
              label="Clear All Data"
              sub="Resets sessions, streaks, earned time"
              onPress={() => Alert.alert('Clear All Data?', 'This cannot be undone.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Clear', style: 'destructive', onPress: () => onUpdate({ ...data, sessions: [], totalMin: 0, earnedMin: 0, spentMin: 0, appEarned: {} }) },
              ])}
              right={<Text style={{ color: '#e05555', fontSize: 13, fontWeight: '500' }}>Clear</Text>}
            />
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = (th: Theme) => StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6, marginBottom: 6 },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  section: { fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', fontWeight: '600', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
  group: { marginHorizontal: 16, borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  rowLabel: { fontSize: 15, fontWeight: '500', marginBottom: 2 },
  rowSub: { fontSize: 12 },
});
