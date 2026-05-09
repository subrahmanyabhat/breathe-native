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

export interface AppData {
  sessions: Session[];
  totalMin: number;
  earnedMin: number;
  spentMin: number;
  appEarned: Record<string, number>;
  appLimits: Record<string, number>;
  appEnabled: Record<string, boolean>;
  stShieldEnabled: boolean;
  reminder: { enabled: boolean; time: string };
}

export const DEFAULT: AppData = {
  sessions: [],
  totalMin: 0,
  earnedMin: 0,
  spentMin: 0,
  appEarned: {},
  appLimits: { instagram: 30, tiktok: 30, youtube: 60, twitter: 30 },
  appEnabled: { instagram: true, tiktok: true, youtube: false, twitter: false },
  stShieldEnabled: false,
  reminder: { enabled: false, time: '08:00' },
};

export async function load(): Promise<AppData> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? { ...DEFAULT, ...JSON.parse(raw) } : { ...DEFAULT };
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
    return {
      date,
      label: d.toLocaleDateString('en', { weekday: 'narrow' }),
      isToday: i === 6,
      count: sessions.filter(s => s.date === date).length,
    };
  });
}

export function fmtHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
