import React, { useState, useEffect } from 'react';
import { StatusBar, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { load, save, AppData, DEFAULT } from './src/storage';
import { DARK } from './src/theme';
import HomeScreen from './src/screens/HomeScreen';
import StatsScreen from './src/screens/StatsScreen';
import ScreentimeScreen from './src/screens/ScreentimeScreen';
import SessionScreen from './src/screens/SessionScreen';
import { Technique } from './src/data';

const Tab = createBottomTabNavigator();

export default function App() {
  const [data, setData] = useState<AppData>({ ...DEFAULT });
  const [session, setSession] = useState<{ tech: Technique; targetApp?: string } | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    load().then(d => { setData(d); setLoaded(true); });
  }, []);

  const update = (d: AppData) => { setData(d); save(d); };

  const startSession = (tech: Technique, targetApp?: string) => {
    setSession({ tech, targetApp });
  };

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
        technique: techId,
        duration: minutes,
        cycles,
        hour: now.getHours(),
        ts: Date.now(),
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
        <SessionScreen
          tech={session.tech}
          targetApp={session.targetApp}
          onDone={endSession}
          onBack={() => setSession(null)}
        />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <NavigationContainer theme={{ dark: true, colors: { background: DARK.bg, card: DARK.surf, text: DARK.text, border: DARK.border, primary: DARK.teal, notification: DARK.teal } }}>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarStyle: {
              backgroundColor: 'rgba(7,17,30,0.97)',
              borderTopColor: DARK.border,
              borderTopWidth: 1,
              paddingBottom: 6,
              height: 80,
            },
            tabBarActiveTintColor: DARK.teal,
            tabBarInactiveTintColor: DARK.label,
            tabBarLabelStyle: { fontSize: 10, letterSpacing: 0.6, textTransform: 'lowercase' },
            tabBarIcon: ({ color, focused }) => {
              const icons: Record<string, any> = {
                Home:        focused ? 'home'           : 'home-outline',
                Stats:       focused ? 'bar-chart'      : 'bar-chart-outline',
                Screentime:  focused ? 'shield-checkmark' : 'shield-checkmark-outline',
              };
              return <Ionicons name={icons[route.name]} size={22} color={color} />;
            },
          })}
        >
          <Tab.Screen name="Home">
            {() => <HomeScreen data={data} onUpdate={update} onStartSession={startSession} />}
          </Tab.Screen>
          <Tab.Screen name="Stats">
            {() => <StatsScreen data={data} />}
          </Tab.Screen>
          <Tab.Screen name="Screentime">
            {() => <ScreentimeScreen data={data} onUpdate={update} onStartSession={startSession} />}
          </Tab.Screen>
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
