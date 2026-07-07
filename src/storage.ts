import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'breathe_v1';

export interface Session {
  date: string;
  technique: string;
  duration: number;
  cycles: number;
  hour: number;
  ts: number;
}

export type AppMode = 'normal' | 'strict';
export type Calibration = 10 | 20 | 30 | 0;

export interface AppData {
  sessions: Session[];
  totalMin: number;
  earnedMin: number;
  spentMin: number;
  appEarned: Record<string, number>;
  appLimits: Record<string, number>;
  appEnabled: Record<string, boolean>;
  appUnlocked: Record<string, number>;
  stShieldEnabled: boolean;
  lockDate: string;
  nativeAppCount: number;
  unlockedIndices: number[];
  mode: AppMode;
  calibration: Calibration;
  appIconUrls: Record<string, string>;
  appMonitored: Record<string, boolean>;
  appActivatedAt: Record<string, number>;
  slots: { index: number; name: string; bundleId: string; isBlocked: boolean; hashKey: string }[];
  slotLimits: Record<string, number>;      // hashKey → minutes before block
  slotMonitored: Record<string, boolean>;  // hashKey → monitoring active
  slotActivatedAt: Record<string, number>; // hashKey → wall-clock start timestamp
  slotsVersion: number;                    // increment to force ScreentimeScreen slot refresh
  reminder: { enabled: boolean; time: string };
  premium?: { paid?: boolean; trial?: boolean; trialStart?: string };
  androidBlockedPackages?: string[];
  androidBlockingActive?: boolean;
  androidAppLimits?: Record<string, number>;
  androidAppMonitored?: Record<string, boolean>;
  androidAppActivatedAt?: Record<string, number>;
}

export const DEFAULT: AppData = {
  sessions: [],
  totalMin: 0,
  earnedMin: 0,
  spentMin: 0,
  appEarned: {},
  appLimits: { instagram: 15, tiktok: 15, youtube: 15, twitter: 15, linkedin: 15, facebook: 15, snapchat: 15, reddit: 15, whatsapp: 15 },
  appEnabled: {},
  appUnlocked: {},
  stShieldEnabled: false,
  lockDate: '',
  nativeAppCount: 0,
  unlockedIndices: [],
  mode: 'normal',
  calibration: 10,
  appIconUrls: {},
  appMonitored: {},
  appActivatedAt: {},
  slots: [],
  slotLimits: {},
  slotMonitored: {},
  slotActivatedAt: {},
  slotsVersion: 0,
  reminder: { enabled: false, time: '08:00' },
  premium: undefined,
};

export async function load(): Promise<AppData> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    // Guard: JSON.parse('null') returns null which crashes Hermes spread
    const parsed = raw ? (JSON.parse(raw) || {}) : {};
    const data = { ...DEFAULT, ...(typeof parsed === 'object' && parsed !== null ? parsed : {}) };
    // Reset shield if lock was from a previous day
    if (data.stShieldEnabled && data.lockDate && data.lockDate !== todayStr()) {
      data.stShieldEnabled = false;
      data.lockDate = '';
      data.unlockedIndices = [];
      data.appUnlocked = {};
    }
    return data;
  } catch {
    return { ...DEFAULT };
  }
}

export async function save(data: AppData): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(data));
  } catch {}
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function calcStreak(sessions: Session[]): number {
  const days = [...new Set(sessions.map(s => s.date))].sort().reverse();
  if (!days.length || days[0] !== todayStr()) return 0;
  let n = 1;
  for (let i = 1; i < days.length; i++) {
    const diff = Math.round((new Date(days[i - 1]).getTime() - new Date(days[i]).getTime()) / 86400000);
    if (diff === 1) n++;
    else break;
  }
  return n;
}

export function last7(sessions: Session[]) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const date = d.toISOString().slice(0, 10);
    const daySessions = sessions.filter(s => s.date === date);
    return {
      date,
      label: d.toLocaleDateString('en', { weekday: 'narrow' }),
      isToday: i === 6,
      count: daySessions.length,
      minutes: daySessions.reduce((sum, s) => sum + (s.duration || 0), 0),
      earned: daySessions.reduce((sum, s) => sum + (s.duration || 0) * 10, 0),
    };
  });
}

export function fmtHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Normal: full unlock for the day (9999 min ≈ no expiry within a day)
// Strict: fixed 30-minute unlock window
export function earnedScreenMin(breathMin: number, mode: AppMode, _calibration?: Calibration): number {
  return mode === 'strict' ? 30 : 9999;
}
