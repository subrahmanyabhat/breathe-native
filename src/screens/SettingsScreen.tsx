import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DARK, Theme } from '../theme';
import { AppData } from '../storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

  const openScreenTime = () => Linking.openURL('App-Prefs:root=SCREENTIME');
  const openPrivacy   = () => Linking.openURL('https://breathex.app/privacy');

  const Row = ({ label, sub, onPress, right }: { label: string; sub?: string; onPress?: () => void; right?: React.ReactNode }) => (
    <TouchableOpacity onPress={onPress} disabled={!onPress} style={[s.row, { borderColor: th.border }]}>
      <View style={{ flex: 1 }}>
        <Text style={[s.rowLabel, { color: th.text }]}>{label}</Text>
        {sub && <Text style={[s.rowSub, { color: th.text2 }]}>{sub}</Text>}
      </View>
      {right}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[s.root, { backgroundColor: th.bg }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={s.header}>
          <Text style={[s.title, { color: th.text }]}>Settings</Text>
        </View>

        {/* Appearance */}
        <Text style={[s.section, { color: th.label }]}>APPEARANCE</Text>
        <View style={[s.group, { backgroundColor: th.surf, borderColor: th.border }]}>
          <Row
            label="Dark Mode"
            sub={isDark ? 'Currently dark' : 'Currently light'}
            right={<Switch value={isDark} onValueChange={onToggleTheme} trackColor={{ true: th.teal, false: th.toggleTrack }} thumbColor="#fff" />}
          />
        </View>

        {/* Sound */}
        <Text style={[s.section, { color: th.label }]}>AUDIO</Text>
        <View style={[s.group, { backgroundColor: th.surf, borderColor: th.border }]}>
          <Row
            label="Sound Effects"
            sub="Bell tones + ambient drone during sessions"
            right={<Switch value={sound} onValueChange={onToggleSound} trackColor={{ true: th.teal, false: th.toggleTrack }} thumbColor="#fff" />}
          />
        </View>

        {/* Reminders */}
        <Text style={[s.section, { color: th.label }]}>REMINDERS</Text>
        <View style={[s.group, { backgroundColor: th.surf, borderColor: th.border }]}>
          <Row
            label="Daily Reminder"
            sub={reminder.enabled ? `Every day at ${reminder.time}` : 'Not set'}
            onPress={() => Alert.alert('Reminder', 'Set your reminder in the Home tab → bell icon.')}
            right={<Text style={{ color: th.teal, fontSize: 13, fontWeight: '600' }}>Edit →</Text>}
          />
        </View>

        {/* Screen Time */}
        <Text style={[s.section, { color: th.label }]}>SCREEN TIME</Text>
        <View style={[s.group, { backgroundColor: th.surf, borderColor: th.border }]}>
          <Row
            label="Open Screen Time"
            sub="iOS Settings → Screen Time → App Limits"
            onPress={openScreenTime}
            right={<Text style={{ color: th.teal, fontSize: 13 }}>Open →</Text>}
          />
        </View>

        {/* Premium */}
        <Text style={[s.section, { color: th.label }]}>SUBSCRIPTION</Text>
      {data.premium?.paid && (
        <View style={{ marginHorizontal: 16, backgroundColor: `${th.teal}15`, borderWidth: 1, borderColor: `${th.teal}40`, borderRadius: 12, padding: 12, marginBottom: 8 }}>
          <Text style={{ color: th.teal, fontSize: 13, fontWeight: '600', textAlign: 'center' }}>✦ Premium Active — All features unlocked</Text>
        </View>
      )}
        <View style={[s.group, { backgroundColor: th.surf, borderColor: th.border }]}>
          <Row
            label="Premium Plan"
            sub={data.premium?.paid ? 'Active ✓' : data.premium?.trial ? 'Free trial active' : 'Not subscribed'}
            onPress={onShowPremium}
            right={<Text style={{ color: '#a48ee8', fontSize: 13, fontWeight: '600' }}>{data.premium?.paid ? 'Manage' : 'Upgrade →'}</Text>}
          />
          <Row
            label="Restore Purchases"
            onPress={() => Alert.alert('Restore', 'Checking purchases…')}
            right={<Text style={{ color: th.teal, fontSize: 13 }}>Restore →</Text>}
          />
        </View>

        {/* About */}
        <Text style={[s.section, { color: th.label }]}>ABOUT</Text>
        <View style={[s.group, { backgroundColor: th.surf, borderColor: th.border }]}>
          <Row label="Privacy Policy" onPress={openPrivacy} right={<Text style={{ color: th.teal, fontSize: 13 }}>View →</Text>} />
          <Row label="Version" sub="1.0.0" right={null} />
          <Row
            label="Re-watch Introduction"
            sub="Show onboarding again"
            onPress={() => { AsyncStorage.removeItem('breathe_onboarded'); onResetOnboarding(); }}
            right={<Text style={{ color: th.teal, fontSize: 13 }}>Show →</Text>}
          />
        </View>

        {/* Danger */}
        <Text style={[s.section, { color: th.label }]}>DATA</Text>
        <View style={[s.group, { backgroundColor: th.surf, borderColor: th.border }]}>
          <Row
            label="Clear All Data"
            sub="Resets sessions, streaks, earned time"
            onPress={() => Alert.alert('Clear All Data?', 'This cannot be undone.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Clear', style: 'destructive', onPress: () => onUpdate({ ...data, sessions: [], totalMin: 0, earnedMin: 0, spentMin: 0, appEarned: {} }) },
            ])}
            right={<Text style={{ color: th.sealed, fontSize: 13 }}>Clear</Text>}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  section: { fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', fontWeight: '600', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  group: { marginHorizontal: 16, borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1 },
  rowLabel: { fontSize: 15, fontWeight: '500', marginBottom: 1 },
  rowSub: { fontSize: 12 },
});
