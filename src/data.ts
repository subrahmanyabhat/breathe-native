export const TECHNIQUES = [
  {
    id: 'box',
    name: 'box',
    tag: '4·4·4·4',
    desc: 'Navy SEALs use this to stay sharp under pressure.',
    accent: '#5ec4e0',
    bgColors: ['#0a1e40', '#0b2955'],
    tagBg: 'rgba(94,196,224,0.15)',
    phases: [
      { label: 'Inhale', dur: 4 },
      { label: 'Hold',   dur: 4 },
      { label: 'Exhale', dur: 4 },
      { label: 'Hold',   dur: 4 },
    ],
  },
  {
    id: '478',
    name: '4·7·8',
    tag: '4·7·8',
    desc: 'Extended exhale calms the nervous system for deep rest.',
    accent: '#a48ee8',
    bgColors: ['#150e3a', '#1f1350'],
    tagBg: 'rgba(164,142,232,0.15)',
    phases: [
      { label: 'Inhale', dur: 4 },
      { label: 'Hold',   dur: 7 },
      { label: 'Exhale', dur: 8 },
    ],
  },
  {
    id: 'calm',
    name: 'calm',
    tag: '2·1·4·1',
    desc: 'Longer exhale activates the vagus nerve instantly.',
    accent: '#4dbfae',
    bgColors: ['#082624', '#0e3432'],
    tagBg: 'rgba(77,191,174,0.15)',
    phases: [
      { label: 'Inhale', dur: 2 },
      { label: 'Hold',   dur: 1 },
      { label: 'Exhale', dur: 4 },
      { label: 'Hold',   dur: 1 },
    ],
  },
  {
    id: 'energize',
    name: 'energize',
    tag: '6·2',
    desc: 'Floods the brain with oxygen for instant clarity.',
    accent: '#e8a23c',
    bgColors: ['#281600', '#3c2000'],
    tagBg: 'rgba(232,162,60,0.15)',
    phases: [
      { label: 'Inhale', dur: 6 },
      { label: 'Exhale', dur: 2 },
    ],
  },
];

export const APPS = [
  { id: 'instagram', name: 'Instagram', bundleId: 'com.burbn.instagram',   initials: 'in', color: '#d63e74', limit: 30 },
  { id: 'tiktok',    name: 'TikTok',    bundleId: 'com.zhiliaoapp.musically', initials: 'tt', color: '#222222', limit: 30 },
  { id: 'youtube',   name: 'YouTube',   bundleId: 'com.google.ios.youtube',   initials: 'yt', color: '#cc2200', limit: 60 },
  { id: 'twitter',   name: 'X',         bundleId: 'com.atebits.Tweetie2',     initials: 'x',  color: '#1a8cd8', limit: 30 },
];

export const TECHNIQUE_INFO: Record<string, {
  aka: string; usedBy: string; cycle: string; science: string;
  benefits: string[]; bestFor: string; steps: string[];
}> = {
  box: {
    aka: 'Square Breathing',
    usedBy: 'Navy SEALs, ER doctors, athletes',
    cycle: '16 sec / cycle',
    science: 'Equal-length phases reset the autonomic nervous system — balancing sympathetic and parasympathetic responses within minutes.',
    benefits: ['Lowers cortisol', 'Sharpens focus', 'Regulates blood pressure', 'Builds stress resilience'],
    bestFor: 'Pre-meeting nerves · exam anxiety · sport performance',
    steps: ['Exhale fully to start.', 'Inhale through the nose for 4 counts.', 'Hold — lungs full — for 4 counts.', 'Exhale evenly for 4 counts.', 'Hold empty for 4 counts. Repeat.'],
  },
  '478': {
    aka: 'Relaxing Breath (Dr. Andrew Weil)',
    usedBy: 'Insomnia sufferers, meditators',
    cycle: '19 sec / cycle',
    science: 'The 4:8 inhale-to-exhale ratio triggers a strong parasympathetic response — slowing the heart and signalling the brain that the threat is over.',
    benefits: ['Falls asleep faster', 'Reduces acute anxiety', 'Lowers heart rate', 'Interrupts panic attacks'],
    bestFor: 'Falling asleep · anxiety attacks · post-stress recovery',
    steps: ['Exhale completely through your mouth.', 'Close mouth, inhale for 4 counts.', 'Hold your breath for 7 counts.', 'Exhale fully for 8 counts. One cycle done.', 'Repeat 3–4 times.'],
  },
  calm: {
    aka: 'Extended Exhale / Vagal Breathing',
    usedBy: 'Yogis, therapists, mindfulness practitioners',
    cycle: '8 sec / cycle',
    science: 'A 2:1 exhale-to-inhale ratio increases vagal tone — directly stimulating the vagus nerve to switch off fight-or-flight.',
    benefits: ['Instant calm', 'Reduces anger', 'Improves HRV', 'Lowers blood pressure'],
    bestFor: 'Stress spikes · anger management · midday reset',
    steps: ['Take one natural breath.', 'Inhale gently for 2 counts.', 'Hold briefly for 1 count.', 'Exhale slowly for 4 counts.', 'Hold empty for 1 count. Repeat.'],
  },
  energize: {
    aka: 'Power Breathing / Stimulating Breath',
    usedBy: 'Athletes, entrepreneurs, biohackers',
    cycle: '8 sec / cycle',
    science: 'Rapid deep inhalation floods the bloodstream with oxygen and activates the sympathetic nervous system — a natural energy surge without caffeine.',
    benefits: ['Boosts alertness', 'Clears brain fog', 'Increases oxygen to brain', 'Natural pre-workout'],
    bestFor: 'Morning start · pre-workout · afternoon slump',
    steps: ['Sit upright with tall spine.', 'Inhale deeply for 6 full counts — fill chest and belly.', 'Exhale briskly for 2 counts — release fast.', 'Repeat immediately without pausing.', 'Start 5 cycles, build to 10.'],
  },
};

export type Technique = typeof TECHNIQUES[0];
export type App = typeof APPS[0];
