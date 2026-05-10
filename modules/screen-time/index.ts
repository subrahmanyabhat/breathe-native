import { Platform } from 'react-native';

// Package name: @breathe/screen-time  (listed in package.json as file:./modules/screen-time)
// expo-module.config.json tells EAS to compile ScreenTimeModule.swift
let _module: any = null;
function getModule() {
  if (_module) return _module;
  try {
    const { requireNativeModule } = require('expo-modules-core');
    _module = requireNativeModule('ScreenTime');
    return _module;
  } catch {
    return null; // not compiled yet — needs EAS build with FamilyControls entitlement
  }
}

export type AuthStatus = 'approved' | 'denied' | 'notDetermined' | 'unavailable';

export function getAuthorizationStatus(): AuthStatus {
  if (Platform.OS !== 'ios') return 'unavailable';
  const m = getModule();
  if (!m) return 'unavailable';
  try { return m.getAuthorizationStatus(); } catch { return 'unavailable'; }
}

export async function requestAuthorization(): Promise<{ authorized: boolean; error?: string }> {
  if (Platform.OS !== 'ios') return { authorized: false, error: 'iOS only' };
  const m = getModule();
  if (!m) return { authorized: false, error: 'Native module not compiled — rebuild with EAS' };
  try { return await m.requestAuthorization(); } catch (e: any) { return { authorized: false, error: e.message }; }
}

export async function showAppPicker(): Promise<{ selected: boolean; appCount: number; error?: string }> {
  if (Platform.OS !== 'ios') return { selected: false, appCount: 0 };
  const m = getModule();
  if (!m) return { selected: false, appCount: 0, error: 'Native module not available' };
  try { return await m.showAppPicker(); } catch (e: any) { return { selected: false, appCount: 0, error: e.message }; }
}

export async function shieldApps(): Promise<{ success: boolean; error?: string }> {
  if (Platform.OS !== 'ios') return { success: false };
  const m = getModule();
  if (!m) return { success: false, error: 'Native module not available' };
  try { return await m.shieldApps(); } catch (e: any) { return { success: false, error: e.message }; }
}

export async function unshieldApps(): Promise<{ success: boolean; error?: string }> {
  if (Platform.OS !== 'ios') return { success: false };
  const m = getModule();
  if (!m) return { success: false, error: 'Native module not available' };
  try { return await m.unshieldApps(); } catch (e: any) { return { success: false, error: e.message }; }
}

export async function scheduleLimit(minutes: number): Promise<{ success: boolean; error?: string }> {
  if (Platform.OS !== 'ios') return { success: false };
  const m = getModule();
  if (!m) return { success: false, error: 'Native module not available' };
  try { return await m.scheduleLimit(minutes); } catch (e: any) { return { success: false, error: e.message }; }
}
