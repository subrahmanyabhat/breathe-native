import { Platform, Alert, Linking } from 'react-native';

// Lazy-require expo-notifications to avoid crash if module isn't ready
const getNotifs = () => {
  try { return require('expo-notifications'); } catch { return null; }
};

export async function requestNotificationPermission(): Promise<boolean> {
  const N = getNotifs();
  if (!N) return false;
  try {
    const { status: existing } = await N.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await N.requestPermissionsAsync();
    return status === 'granted';
  } catch { return false; }
}

/**
 * Schedule a daily repeating notification — acts as a daily alarm.
 * time format: "HH:MM" (24h)
 */
export async function scheduleDailyReminder(time: string): Promise<boolean> {
  const N = getNotifs();
  if (!N) return false;
  try {
    const granted = await requestNotificationPermission();
    if (!granted) {
      Alert.alert(
        'Notification Permission Required',
        'Allow notifications so Breathe can remind you each day.',
        [
          { text: 'Open Settings', onPress: () => Linking.openURL(Platform.OS === 'android' ? 'android.settings.APP_NOTIFICATION_SETTINGS' : 'App-Prefs:root=NOTIFICATIONS_ID') },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return false;
    }

    // Cancel any previous reminder
    await cancelDailyReminder();

    const [hour, minute] = time.split(':').map(Number);

    await N.scheduleNotificationAsync({
      identifier: 'breathe-daily-reminder',
      content: {
        title: '🌬️ Time to breathe',
        body: 'Your daily breathing session is waiting. 1 min = 10 min screen time.',
        sound: true,
        badge: 1,
      },
      trigger: {
        type: 'calendar',
        hour,
        minute,
        repeats: true,
      },
    });
    return true;
  } catch (e) {
    console.warn('scheduleDailyReminder error:', e);
    return false;
  }
}

export async function cancelDailyReminder(): Promise<void> {
  const N = getNotifs();
  if (!N) return;
  try {
    await N.cancelScheduledNotificationAsync('breathe-daily-reminder');
  } catch {}
}

/**
 * Try to apply a Screen Time app limit via native FamilyControls.
 * Falls back to opening Screen Time settings if entitlement not granted.
 */
export async function applyScreenTimeLimit(appId: string, minutes: number): Promise<'applied' | 'opened_settings' | 'error'> {
  try {
    const ST = require('../modules/screen-time');
    const r = await ST.scheduleLimit(appId, minutes);
    if (r && r.success) return 'applied';
    // If failed, open settings
    Linking.openURL(Platform.OS === 'android' ? 'android.settings.DIGITAL_WELLBEING' : 'App-Prefs:root=SCREENTIME');
    return 'opened_settings';
  } catch {
    Linking.openURL(Platform.OS === 'android' ? 'android.settings.DIGITAL_WELLBEING' : 'App-Prefs:root=SCREENTIME');
    return 'opened_settings';
  }
}
