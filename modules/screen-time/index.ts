import { NativeModules, Platform } from 'react-native';

const { ScreenTimeModule } = NativeModules;

export type AuthStatus = 'approved' | 'denied' | 'notDetermined' | 'unavailable';

export interface ShieldResult {
  success: boolean;
  error?: string;
}

// Request FamilyControls authorization (iOS 16+)
export async function requestAuthorization(): Promise<{ authorized: boolean; error?: string }> {
  if (Platform.OS !== 'ios') return { authorized: false, error: 'iOS only' };
  if (!ScreenTimeModule) return { authorized: false, error: 'Native module not available — build with EAS' };
  return ScreenTimeModule.requestAuthorization();
}

// Get current authorization status
export function getAuthorizationStatus(): AuthStatus {
  if (Platform.OS !== 'ios' || !ScreenTimeModule) return 'unavailable';
  return ScreenTimeModule.getAuthorizationStatus();
}

// Present native FamilyActivityPicker — user selects which apps to block
// Returns opaque token stored for shielding
export async function showAppPicker(): Promise<{ selected: boolean; appCount: number }> {
  if (Platform.OS !== 'ios' || !ScreenTimeModule) return { selected: false, appCount: 0 };
  return ScreenTimeModule.showAppPicker();
}

// Shield (block) previously selected apps
export async function shieldApps(): Promise<ShieldResult> {
  if (Platform.OS !== 'ios' || !ScreenTimeModule) return { success: false, error: 'iOS only' };
  return ScreenTimeModule.shieldApps();
}

// Remove shield (unblock apps) — call when user earns screentime
export async function unshieldApps(): Promise<ShieldResult> {
  if (Platform.OS !== 'ios' || !ScreenTimeModule) return { success: false, error: 'iOS only' };
  return ScreenTimeModule.unshieldApps();
}

// Schedule auto-shield after X minutes of usage (DeviceActivitySchedule)
export async function scheduleLimit(appId: string, minutesPerDay: number): Promise<ShieldResult> {
  if (Platform.OS !== 'ios' || !ScreenTimeModule) return { success: false };
  return ScreenTimeModule.scheduleLimit(appId, minutesPerDay);
}
