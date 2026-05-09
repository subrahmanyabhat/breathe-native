import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, Easing, TouchableOpacity,
  SafeAreaView, Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { DARK } from '../theme';
import { Technique, APPS } from '../data';

interface Props {
  tech: Technique;
  targetApp?: string;
  onDone: (techId: string, minutes: number, cycles: number, targetApp?: string) => void;
  onBack: () => void;
}

export default function SessionScreen({ tech, targetApp, onDone, onBack }: Props) {
  const [running, setRunning] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [count, setCount] = useState(tech.phases[0].dur);
  const [cycles, setCycles] = useState(0);
  const [lastDir, setLastDir] = useState<'in' | 'out' | 'neutral'>('neutral');
  const [showComplete, setShowComplete] = useState(false);
  const [sessMin, setSessMin] = useState(1);
  const [countKey, setCountKey] = useState(0);

  const scale = useRef(new Animated.Value(0.82)).current;
  const glow  = useRef(new Animated.Value(0.14)).current;
  const startRef = useRef<number>(0);

  const phase = tech.phases[phaseIdx];
  const earned = sessMin * 10;
  const targetAppObj = targetApp ? APPS.find(a => a.id === targetApp) : null;

  const animateOrb = (targetScale: number, targetGlow: number, duration: number, easing = Easing.inOut(Easing.ease)) => {
    Animated.parallel([
      Animated.timing(scale, { toValue: targetScale, duration, easing, useNativeDriver: true }),
      Animated.timing(glow, { toValue: targetGlow,  duration, easing, useNativeDriver: false }),
    ]).start();
  };

  useEffect(() => {
    if (!running) return;
    const p = tech.phases[phaseIdx];

    // Haptic on phase change
    if (p.label === 'Inhale') {
      setLastDir('in');
      animateOrb(1.26, 0.72, p.dur * 1000);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else if (p.label === 'Exhale') {
      setLastDir('out');
      animateOrb(0.68, 0.10, p.dur * 1000);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      // Hold — keep position
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    }

    setCount(p.dur);
    setCountKey(k => k + 1);

    let c = p.dur;
    const iv = setInterval(() => { c--; setCount(c); if (c <= 0) clearInterval(iv); }, 1000);
    const tm = setTimeout(() => {
      const next = (phaseIdx + 1) % tech.phases.length;
      if (next === 0) setCycles(n => n + 1);
      setPhaseIdx(next);
    }, p.dur * 1000);

    return () => { clearInterval(iv); clearTimeout(tm); };
  }, [phaseIdx, running]);

  const handleStart = () => {
    startRef.current = Date.now();
    setRunning(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleEnd = () => {
    const m = Math.max(1, Math.round((Date.now() - startRef.current) / 60000));
    setSessMin(m);
    setRunning(false);
    setShowComplete(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  if (showComplete) {
    return (
      <SafeAreaView style={[ss.root, { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <View style={[ss.completeCard, { borderColor: tech.accent }]}>
          <Text style={[ss.completeTick, { color: tech.accent }]}>✦</Text>
          <Text style={ss.completeTitle}>session complete</Text>
          <Text style={[ss.completeSub, { color: 'rgba(255,255,255,0.5)' }]}>{tech.name}</Text>
          <View style={ss.completeRow}>
            {[{ l: 'cycles', v: String(cycles) }, { l: 'minutes', v: String(sessMin) }, { l: 'earned', v: `+${earned}m`, hi: true }].map(s => (
              <View key={s.l} style={[ss.completeStat, { borderColor: DARK.border }]}>
                <Text style={ss.completeStatL}>{s.l}</Text>
                <Text style={[ss.completeStatV, { color: s.hi ? tech.accent : DARK.text }]}>{s.v}</Text>
              </View>
            ))}
          </View>
          {targetAppObj && (
            <Text style={[ss.completeSub, { color: tech.accent, marginBottom: 12 }]}>
              {earned}m unlocked for {targetAppObj.name}
            </Text>
          )}
          <TouchableOpacity style={[ss.btn, { backgroundColor: tech.accent }]} onPress={() => onDone(tech.id, sessMin, cycles, targetApp)}>
            <Text style={[ss.btnTxt, { color: '#07111e' }]}>continue</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const glowColor = glow.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(0,0,0,0)', tech.accent + '80'],
  });

  return (
    <SafeAreaView style={ss.root}>
      {/* Top bar */}
      <View style={ss.topBar}>
        <TouchableOpacity style={ss.backBtn} onPress={onBack}>
          <Text style={ss.backTxt}>← back</Text>
        </TouchableOpacity>
        <Text style={[ss.techName, { color: tech.accent }]}>{tech.name}</Text>
        <View style={ss.cycleBadge}>
          {running ? (
            <Text style={ss.cycleTxt}>
              <Text style={{ color: tech.accent, fontWeight: '700' }}>{cycles + 1}</Text>
              <Text style={{ opacity: 0.5 }}> cyc</Text>
            </Text>
          ) : <Text style={ss.cycleTxt}>—</Text>}
        </View>
      </View>

      {/* Orb */}
      <View style={ss.orbContainer}>
        {/* Bloom */}
        <Animated.View style={[ss.bloom, { transform: [{ scale }] }]} />

        {/* Ring */}
        <Animated.View style={[ss.ring, { borderColor: tech.accent, opacity: glow }]} />

        {/* Main orb */}
        <Animated.View style={[ss.orb, {
          borderColor: running ? tech.accent + 'cc' : tech.accent + '44',
          transform: [{ scale }],
          shadowColor: tech.accent,
          shadowOpacity: 0.7,
          shadowRadius: 30,
          shadowOffset: { width: 0, height: 0 },
        }]}>
          <Text style={ss.phaseLabel}>{running ? phase.label.toLowerCase() : 'ready'}</Text>
          {running && (
            <Text key={countKey} style={[ss.countNum, { color: tech.accent }]}>{count}</Text>
          )}
        </Animated.View>

        {/* Phase dots */}
        {running && (
          <View style={ss.dotsRow}>
            {tech.phases.map((p, i) => (
              <View key={i} style={[ss.dot, {
                width: i === phaseIdx ? 28 : 7,
                backgroundColor: i === phaseIdx ? tech.accent : 'rgba(255,255,255,0.12)',
              }]} />
            ))}
          </View>
        )}

        {/* Phase labels */}
        {running && (
          <View style={ss.phaseLabels}>
            {tech.phases.map((p, i) => (
              <View key={i} style={{ alignItems: 'center', opacity: i === phaseIdx ? 1 : 0.22 }}>
                <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11 }}>{p.label}</Text>
                <Text style={{ color: tech.accent, fontSize: 10 }}>{p.dur}s</Text>
              </View>
            ))}
          </View>
        )}

        {/* Cycles badge */}
        {running && cycles > 0 && (
          <View style={[ss.cyclesDone, { borderColor: tech.accent + '40', backgroundColor: tech.accent + '18' }]}>
            <Text style={[ss.cyclesDoneTxt, { color: tech.accent }]}>✦ {cycles} cycle{cycles !== 1 ? 's' : ''} complete</Text>
          </View>
        )}
      </View>

      {/* Bottom */}
      <View style={ss.bottom}>
        {!running ? (
          <TouchableOpacity style={[ss.beginBtn, { backgroundColor: tech.accent, shadowColor: tech.accent }]} onPress={handleStart}>
            <Text style={ss.beginTxt}>begin</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={ss.endBtn} onPress={handleEnd}>
            <Text style={ss.endTxt}>end session</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const ss = StyleSheet.create({
  root: { flex: 1, backgroundColor: DARK.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  backBtn: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: DARK.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  backTxt: { color: DARK.text2, fontSize: 13 },
  techName: { fontSize: 12, fontWeight: '600', letterSpacing: 1 },
  cycleBadge: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: DARK.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, minWidth: 52, alignItems: 'center' },
  cycleTxt: { color: DARK.text2, fontSize: 12 },
  orbContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bloom: { position: 'absolute', width: 360, height: 360, borderRadius: 180, backgroundColor: 'rgba(79,205,216,0.04)' },
  ring: { position: 'absolute', width: 250, height: 250, borderRadius: 125, borderWidth: 1 },
  orb: { width: 200, height: 200, borderRadius: 100, borderWidth: 1.5, backgroundColor: 'rgba(79,205,216,0.08)', alignItems: 'center', justifyContent: 'center', ...Platform.select({ ios: { shadowOpacity: 0.6, shadowRadius: 30, shadowOffset: { width: 0, height: 0 } } }) },
  phaseLabel: { color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: '500', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 },
  countNum: { fontSize: 46, fontWeight: '300', letterSpacing: -2 },
  dotsRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 28 },
  dot: { height: 7, borderRadius: 4 },
  phaseLabels: { flexDirection: 'row', gap: 20, marginTop: 18 },
  cyclesDone: { marginTop: 16, borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5 },
  cyclesDoneTxt: { fontSize: 12, fontWeight: '600' },
  bottom: { paddingHorizontal: 24, paddingBottom: 52, alignItems: 'center' },
  beginBtn: { borderRadius: 50, paddingVertical: 17, paddingHorizontal: 56, shadowOpacity: 0.45, shadowRadius: 20, shadowOffset: { width: 0, height: 6 } },
  beginTxt: { color: '#07111e', fontSize: 16, fontWeight: '700', letterSpacing: -0.3 },
  endBtn: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: DARK.border, borderRadius: 50, paddingVertical: 13, paddingHorizontal: 36 },
  endTxt: { color: DARK.text2, fontSize: 14 },
  completeCard: { backgroundColor: '#0d1b36', borderRadius: 24, padding: 28, width: '100%', borderWidth: 1, alignItems: 'center' },
  completeTick: { fontSize: 28, marginBottom: 14 },
  completeTitle: { color: DARK.text, fontSize: 20, fontWeight: '700', marginBottom: 4 },
  completeSub: { fontSize: 13, marginBottom: 20 },
  completeRow: { flexDirection: 'row', gap: 10, marginBottom: 16, width: '100%' },
  completeStat: { flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 13, padding: 13, alignItems: 'center', borderWidth: 1 },
  completeStatL: { color: DARK.label, fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 },
  completeStatV: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
  btn: { width: '100%', borderRadius: 13, paddingVertical: 14, alignItems: 'center' },
  btnTxt: { fontSize: 15, fontWeight: '700' },
});
