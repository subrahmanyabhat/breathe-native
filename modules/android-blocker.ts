import { NativeModules, Platform } from 'react-native';

const mod = NativeModules.AppBlockerModule;
const ok = Platform.OS === 'android' && !!mod;

export interface InstalledApp {
  packageName: string;
  appName: string;
  icon: string;
}

const noop = <T>(v: T) => Promise.resolve(v);

export const getInstalledApps = (): Promise<InstalledApp[]> =>
  ok ? mod.getInstalledApps() : noop([]);

export const setBlockedApps = (packages: string[]): Promise<boolean> =>
  ok ? mod.setBlockedApps(packages) : noop(false);

export const getBlockedApps = (): Promise<string[]> =>
  ok ? mod.getBlockedApps() : noop([]);

export const hasUsageStatsPermission = (): Promise<boolean> =>
  ok ? mod.hasUsageStatsPermission() : noop(false);

export const hasOverlayPermission = (): Promise<boolean> =>
  ok ? mod.hasOverlayPermission() : noop(false);

export const openUsageStatsSettings = (): Promise<boolean> =>
  ok ? mod.openUsageStatsSettings() : noop(false);

export const openOverlaySettings = (): Promise<boolean> =>
  ok ? mod.openOverlaySettings() : noop(false);

export const startBlockingService = (): Promise<boolean> =>
  ok ? mod.startBlockingService() : noop(false);

export const stopBlockingService = (): Promise<boolean> =>
  ok ? mod.stopBlockingService() : noop(false);

export const isBlockingActive = (): Promise<boolean> =>
  ok ? mod.isBlockingActive() : noop(false);

export const temporarilyUnblock = (packages: string[], durationMs: number): Promise<boolean> =>
  ok ? mod.temporarilyUnblock(packages, durationMs) : noop(false);
