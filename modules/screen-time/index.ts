import { Platform, requireNativeComponent } from 'react-native';
import React from 'react';
import type { ViewStyle } from 'react-native';

// Package name: @breathe/screen-time  (listed in package.json as file:./modules/screen-time)
// expo-module.config.json tells EAS to compile ScreenTimeModule.swift
let _module: any = null;
let _moduleError: string | null = null;
function getModule() {
  if (_module) return _module;
  try {
    const { requireNativeModule } = require('expo-modules-core');
    _module = requireNativeModule('ScreenTime');
    return _module;
  } catch (e: any) {
    _moduleError = e?.message || String(e);
    console.warn('[ScreenTime] Module load error:', _moduleError);
    return null;
  }
}

export function getModuleError(): string | null { return _moduleError; }

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

export function isShieldActive(): boolean {
  if (Platform.OS !== 'ios') return false;
  const m = getModule();
  if (!m) return false;
  try { return m.isShieldActive(); } catch { return false; }
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

export async function scheduleMonitoring(minutes: number): Promise<{ success: boolean; error?: string }> {
  if (Platform.OS !== 'ios') return { success: false };
  const m = getModule();
  if (!m) return { success: false, error: 'Native module not available' };
  try { return await m.scheduleMonitoring(minutes); } catch (e: any) { return { success: false, error: e.message }; }
}

export async function stopMonitoring(): Promise<{ success: boolean }> {
  if (Platform.OS !== 'ios') return { success: false };
  const m = getModule();
  if (!m) return { success: false };
  try { return await m.stopMonitoring(); } catch { return { success: false }; }
}

export async function getSelectedAppIcons(): Promise<{ bundleId: string; base64: string }[]> {
  if (Platform.OS !== 'ios') return [];
  const m = getModule();
  if (!m) return [];
  try { return await m.getSelectedAppIcons(); } catch { return []; }
}

export async function extractTokenInfo(): Promise<{ index: number; name: string; iconBase64: string; hashKey: string }[]> {
  if (Platform.OS !== 'ios') return [];
  const m = getModule();
  if (!m) return [];
  try { return await m.extractTokenInfo(); } catch { return []; }
}

export async function getInstalledKnownApps(): Promise<string[]> {
  if (Platform.OS !== 'ios') return [];
  const m = getModule();
  if (!m) return [];
  try { return await m.getInstalledKnownApps(); } catch { return []; }
}

export async function getSelectedBundleIds(): Promise<string[]> {
  if (Platform.OS !== 'ios') return [];
  const m = getModule();
  if (!m) return [];
  try { return await m.getSelectedBundleIds(); } catch { return []; }
}

export function getSelectedAppCount(): number {
  if (Platform.OS !== 'ios') return 0;
  const m = getModule();
  if (!m) return 0;
  try { return m.getSelectedAppCount(); } catch { return 0; }
}

export async function unshieldSlot(slotIndex: number): Promise<{ success: boolean }> {
  if (Platform.OS !== 'ios') return { success: false };
  const m = getModule();
  if (!m) return { success: false };
  try { return await m.unshieldSlot(slotIndex); } catch { return { success: false }; }
}

export async function reshieldSlot(slotIndex: number): Promise<{ success: boolean }> {
  if (Platform.OS !== 'ios') return { success: false };
  const m = getModule();
  if (!m) return { success: false };
  try { return await m.reshieldSlot(slotIndex); } catch { return { success: false }; }
}

export async function getSlotInfo(): Promise<{ slots: { index: number; name: string; bundleId: string; iconBase64: string; isBlocked: boolean; hashKey: string }[]; total: number }> {
  if (Platform.OS !== 'ios') return { slots: [], total: 0 };
  const m = getModule();
  if (!m) return { slots: [], total: 0 };
  try { return await m.getSlotInfo(); } catch { return { slots: [], total: 0 }; }
}

export async function reshieldExcept(excludedBundleIds: string[]): Promise<{ success: boolean }> {
  if (Platform.OS !== 'ios') return { success: false };
  const m = getModule();
  if (!m) return { success: false };
  try { return await m.reshieldExcept(excludedBundleIds); } catch { return { success: false }; }
}

export async function unshieldBundleId(bundleId: string): Promise<{ success: boolean; error?: string }> {
  if (Platform.OS !== 'ios') return { success: false };
  const m = getModule();
  if (!m) return { success: false };
  try { return await m.unshieldBundleId(bundleId); } catch (e: any) { return { success: false, error: e.message }; }
}

export async function unshieldAppAtIndex(index: number): Promise<{ success: boolean; error?: string }> {
  if (Platform.OS !== 'ios') return { success: false };
  const m = getModule();
  if (!m) return { success: false };
  try { return await m.unshieldAppAtIndex(index); } catch (e: any) { return { success: false, error: e.message }; }
}

export async function reshieldAll(): Promise<{ success: boolean; error?: string }> {
  if (Platform.OS !== 'ios') return { success: false };
  const m = getModule();
  if (!m) return { success: false };
  try { return await m.reshieldAll(); } catch (e: any) { return { success: false, error: e.message }; }
}

export async function clearSelection(): Promise<{ success: boolean }> {
  if (Platform.OS !== 'ios') return { success: false };
  const m = getModule();
  if (!m) return { success: false };
  try { return await m.clearSelection(); } catch { return { success: false }; }
}

export async function removeSlotFromSelection(slotIndex: number): Promise<{ success: boolean; error?: string }> {
  if (Platform.OS !== 'ios') return { success: false };
  const m = getModule();
  if (!m) return { success: false };
  try { return await m.removeSlotFromSelection(slotIndex); } catch (e: any) { return { success: false, error: e.message }; }
}

// ── Native view: renders real app icon + name via Label(ApplicationToken) ──
// Only works on iOS 16+ with FamilyControls authorized.
// hashKey must match one of the tokens in the current activitySelection.
interface AppTokenViewProps {
  hashKey: string;
  darkMode?: boolean;
  showTitle?: boolean;
  style?: ViewStyle;
}

// The view is the default view of the 'ScreenTime' module (not a separate module).
// requireNativeViewManager takes the MODULE name, not the view class name.
let _NativeAppTokenView: any = null;
function getNativeTokenView() {
  if (_NativeAppTokenView) return _NativeAppTokenView;
  try {
    const { requireNativeViewManager } = require('expo-modules-core');
    // Module name is 'ScreenTime' — the view is its default/only view
    _NativeAppTokenView = requireNativeViewManager('ScreenTime');
  } catch (e) {
    console.warn('[AppTokenView] requireNativeViewManager failed:', e);
    _NativeAppTokenView = null;
  }
  return _NativeAppTokenView;
}

export async function scheduleSlotMonitoring(slotIndex: number, minutes: number): Promise<{ success: boolean; error?: string }> {
  if (Platform.OS !== 'ios') return { success: false };
  const m = getModule();
  if (!m) return { success: false, error: 'Module unavailable' };
  try { return await m.scheduleSlotMonitoring(slotIndex, minutes); } catch (e: any) { return { success: false, error: e.message }; }
}

export async function stopSlotMonitoring(slotIndex: number): Promise<{ success: boolean }> {
  if (Platform.OS !== 'ios') return { success: false };
  const m = getModule();
  if (!m) return { success: false };
  try { return await m.stopSlotMonitoring(slotIndex); } catch { return { success: false }; }
}

export async function showUsageReport(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  const m = getModule();
  if (!m) return false;
  try { return await m.showUsageReport(); } catch { return false; }
}

export function checkPendingUnlock(): boolean {
  if (Platform.OS !== 'ios') return false;
  const m = getModule();
  if (!m) return false;
  try { return m.checkPendingUnlock(); } catch { return false; }
}

export function AppTokenView({ hashKey, darkMode = true, showTitle = true, style }: AppTokenViewProps) {
  if (Platform.OS !== 'ios') return null;
  const NativeView = getNativeTokenView();
  if (!NativeView) return null;
  return React.createElement(NativeView, { hashKey, darkMode, showTitle, style });
}
