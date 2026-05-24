import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

interface Props { onDone: () => void; }

const SLIDES = [
  {
    id: 'orb',
    title: 'Breathe',
    titleItalic: true,
    sub: 'your breath is more valuable\nthan you think.',
    detail: null,
    steps: null,
    accentColor: '#5b8fb9',
  },
  {
    id: 'problem',
    title: '38 days',
    titleItalic: false,
    sub: 'of your year is spent scrolling social media.\nThat\'s 912 hours. Every single year.',
    detail: 'your attention is the product.',
    steps: null,
    accentColor: '#dc5a5a',
  },
  {
    id: 'solution',
    title: 'earn it back.',
    titleItalic: true,
    sub: 'Breathe first.\nThen unlock.',
    detail: 'Block Instagram. Breathe. Unlock it.',
    steps: null,
    accentColor: '#4fcdd8',
  },
  {
    id: 'how',
    title: 'how it works',
    titleItalic: false,
    sub: null,
    detail: null,
    steps: [
      { icon: '🔒', label: 'Block', desc: 'choose apps to block daily' },
      { icon: '🌬️', label: 'Breathe', desc: 'do a 5-minute session' },
      { icon: '📱', label: 'Unlock', desc: 'Breathe to unlock your apps' },
    ],
    accentColor: '#a48ee8',
  },
];

function BreathingOrb() {
  const scale = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    const breathe = () => {
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.12, duration: 3500, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.85, duration: 3500, useNativeDriver: true }),
      ]).start(() => breathe());
    };
    breathe();
    return () => scale.stopAnimation();
  }, []);

  return (
    <View style={orb.wrap}>
      {/* Dashed outer ring */}
      <View style={orb.dashRing} />
      {/* Bloom */}
      <Animated.View style={[orb.bloom, { transform: [{ scale }] }]} />
      {/* Solid ring */}
      <Animated.View style={[orb.solidRing, { transform: [{ scale }] }]} />
      {/* Inner glow */}
      <Animated.View style={[orb.inner, { transform: [{ scale }] }]} />
    </View>
  );
}

const orb = StyleSheet.create({
  wrap: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 36 },
  dashRing: { position: 'absolute', width: 260, height: 260, borderRadius: 130, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(91,143,185,0.35)' },
  bloom: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'transparent', shadowColor: '#5b8fb9', shadowOpacity: 0.55, shadowRadius: 60, shadowOffset: { width: 0, height: 0 } },
  solidRing: { position: 'absolute', width: 200, height: 200, borderRadius: 100, borderWidth: 1.5, borderColor: 'rgba(91,143,185,0.70)' },
  inner: { width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(61,111,153,0.22)' },
});

export default function OnboardingScreen({ onDone }: Props) {
  const [slide, setSlide] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const s = SLIDES[slide];
  const isLast = slide === SLIDES.length - 1;

  const goNext = () => {
    if (isLast) { onDone(); return; }
    Animated.timing(fadeAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => {
      setSlide(i => i + 1);
      Animated.timing(fadeAnim, { toValue: 1, duration: 320, useNativeDriver: true }).start();
    });
  };

  return (
    <SafeAreaView style={ss.root} edges={['top', 'bottom']}>
      {/* Background glow */}
      <View style={[ss.bgGlow, { backgroundColor: s.accentColor + '18' }]} />

      {/* Dot indicators */}
      <View style={ss.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[ss.dot, { width: i === slide ? 22 : 6, backgroundColor: i === slide ? 'rgba(91,143,185,0.9)' : 'rgba(255,255,255,0.15)' }]} />
        ))}
      </View>

      {/* Content */}
      <Animated.View style={[ss.content, { opacity: fadeAnim }]}>

        {/* Orb on first slide */}
        {s.id === 'orb' && <BreathingOrb />}

        {/* Problem: app icons */}
        {s.id === 'problem' && (
          <View style={ss.appIcons}>
            {['📸', '🎵', '▶️', '✕'].map((e, i) => (
              <View key={i} style={ss.appIcon}>
                <Text style={{ fontSize: 22 }}>{e}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Solution: earn visual */}
        {s.id === 'solution' && (
          <View style={ss.earnRow}>
            <View style={ss.earnItem}>
              <Text style={{ fontSize: 36, marginBottom: 4 }}>🌬️</Text>
              <Text style={ss.earnLabel}>Breathe</Text>
            </View>
            <View style={ss.earnArrow}>
              <View style={ss.earnLine} />
              <Text style={ss.earnMult}>10×</Text>
              <View style={ss.earnLine} />
            </View>
            <View style={ss.earnItem}>
              <Text style={{ fontSize: 36, marginBottom: 4 }}>📱</Text>
              <Text style={ss.earnLabel}>screen</Text>
            </View>
          </View>
        )}

        {/* Steps */}
        {s.id === 'how' && s.steps && (
          <View style={ss.steps}>
            {s.steps.map((step, i) => (
              <View key={i} style={ss.step}>
                <Text style={{ fontSize: 26, flexShrink: 0 }}>{step.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={ss.stepLabel}>{step.label}</Text>
                  <Text style={ss.stepDesc}>{step.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Title */}
        <Text style={[ss.title, {
          fontSize: s.id === 'problem' ? 52 : s.id === 'orb' ? 42 : 32,
          fontStyle: s.titleItalic ? 'italic' : 'normal',
          fontWeight: s.id === 'problem' ? '300' : s.id === 'how' ? '700' : '400',
          letterSpacing: s.id === 'problem' ? -2 : -0.5,
        }]}>
          {s.title}
        </Text>

        {s.sub && (
          <Text style={ss.sub}>{s.sub}</Text>
        )}
        {s.detail && (
          <Text style={ss.detail}>{s.detail}</Text>
        )}
      </Animated.View>

      {/* Bottom CTA */}
      <View style={ss.bottom}>
        <TouchableOpacity style={[ss.cta, isLast && ss.ctaPrimary]} onPress={goNext}>
          <Text style={[ss.ctaTxt, isLast && ss.ctaTxtPrimary]}>
            {isLast ? 'Start Breathing — Free Trial' : 'Continue →'}
          </Text>
        </TouchableOpacity>
        {!isLast && (
          <TouchableOpacity onPress={onDone} style={ss.skipBtn}>
            <Text style={ss.skipTxt}>skip</Text>
          </TouchableOpacity>
        )}
        {isLast && (
          <Text style={ss.finePrint}>7-day free trial · ₹99/month · cancel anytime</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const ss = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#06101e' },
  bgGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: '60%', opacity: 0.8 },
  dots: { flexDirection: 'row', gap: 6, alignSelf: 'center', marginTop: 16, marginBottom: 0 },
  dot: { height: 6, borderRadius: 3 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  title: { color: 'rgba(255,255,255,0.92)', lineHeight: 54, textAlign: 'center', marginBottom: 16, fontFamily: 'Georgia' },
  sub: { color: 'rgba(255,255,255,0.48)', fontSize: 16, lineHeight: 26, textAlign: 'center', marginBottom: 10 },
  detail: { color: 'rgba(255,255,255,0.28)', fontSize: 14, fontStyle: 'italic', textAlign: 'center' },
  appIcons: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  appIcon: { width: 52, height: 52, borderRadius: 14, backgroundColor: 'rgba(220,90,90,0.12)', borderWidth: 1, borderColor: 'rgba(220,90,90,0.25)', alignItems: 'center', justifyContent: 'center' },
  earnRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 32 },
  earnItem: { alignItems: 'center' },
  earnLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  earnArrow: { alignItems: 'center', gap: 4 },
  earnLine: { width: 36, height: 1, backgroundColor: 'rgba(79,205,216,0.6)' },
  earnMult: { color: '#4fcdd8', fontSize: 11, fontWeight: '600' },
  steps: { width: '100%', gap: 12, marginBottom: 32 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', borderRadius: 14, padding: 14 },
  stepLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 15, fontWeight: '600', marginBottom: 2 },
  stepDesc: { color: 'rgba(255,255,255,0.42)', fontSize: 13 },
  bottom: { paddingHorizontal: 24, paddingBottom: 20, alignItems: 'center', gap: 10 },
  cta: { width: '100%', backgroundColor: 'rgba(91,143,185,0.18)', borderWidth: 1, borderColor: 'rgba(91,143,185,0.35)', borderRadius: 50, paddingVertical: 17, alignItems: 'center' },
  ctaPrimary: { backgroundColor: '#a48ee8', borderWidth: 0, shadowColor: '#a48ee8', shadowOpacity: 0.4, shadowRadius: 20, shadowOffset: { width: 0, height: 6 } },
  ctaTxt: { color: 'rgba(255,255,255,0.80)', fontSize: 16, fontWeight: '500', letterSpacing: -0.3 },
  ctaTxtPrimary: { color: '#fff', fontWeight: '700' },
  skipBtn: { paddingVertical: 4, paddingHorizontal: 16 },
  skipTxt: { color: 'rgba(255,255,255,0.25)', fontSize: 13 },
  finePrint: { color: 'rgba(255,255,255,0.22)', fontSize: 11, textAlign: 'center' },
});
