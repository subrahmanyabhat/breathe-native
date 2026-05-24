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
  // Social Media
  { id: 'instagram',   name: 'Instagram',     bundleId: 'com.burbn.instagram',            initials: 'In', color: '#d63e74', limit: 30, urlScheme: 'instagram://' },
  { id: 'tiktok',      name: 'TikTok',        bundleId: 'com.zhiliaoapp.musically',       initials: 'Tt', color: '#010101', limit: 30, urlScheme: 'tiktok://' },
  { id: 'youtube',     name: 'YouTube',       bundleId: 'com.google.ios.youtube',         initials: 'Yt', color: '#cc2200', limit: 60, urlScheme: 'youtube://' },
  { id: 'twitter',     name: 'X',             bundleId: 'com.atebits.Tweetie2',           initials: 'X',  color: '#1a8cd8', limit: 30, urlScheme: 'twitter://' },
  { id: 'facebook',    name: 'Facebook',      bundleId: 'com.facebook.Facebook',          initials: 'Fb', color: '#1877f2', limit: 30, urlScheme: 'fb://' },
  { id: 'snapchat',    name: 'Snapchat',      bundleId: 'com.toyopagroup.picaboo',        initials: 'Sc', color: '#ffcc00', limit: 30, urlScheme: 'snapchat://' },
  { id: 'whatsapp',    name: 'WhatsApp',      bundleId: 'net.whatsapp.WhatsApp',          initials: 'Wa', color: '#25d366', limit: 60, urlScheme: 'whatsapp://' },
  { id: 'telegram',    name: 'Telegram',      bundleId: 'ph.telegra.Telegraph',           initials: 'Tg', color: '#26a5e4', limit: 60, urlScheme: 'tg://' },
  { id: 'linkedin',    name: 'LinkedIn',      bundleId: 'com.linkedin.LinkedIn',          initials: 'Li', color: '#0a66c2', limit: 30, urlScheme: 'linkedin://' },
  { id: 'reddit',      name: 'Reddit',        bundleId: 'com.reddit.Reddit',              initials: 'Rd', color: '#ff4500', limit: 30, urlScheme: 'reddit://' },
  { id: 'discord',     name: 'Discord',       bundleId: 'com.hammerandchisel.discord',    initials: 'Di', color: '#5865f2', limit: 45, urlScheme: 'discord://' },
  { id: 'threads',     name: 'Threads',       bundleId: 'com.burbn.barcelona',            initials: 'Th', color: '#101010', limit: 30, urlScheme: 'barcelona://' },
  { id: 'pinterest',   name: 'Pinterest',     bundleId: 'pinterest',                      initials: 'Pi', color: '#e60023', limit: 30, urlScheme: 'pinterest://' },
  { id: 'bereal',      name: 'BeReal',        bundleId: 'AlexisBarreyat.BeReal',          initials: 'Br', color: '#333333', limit: 20, urlScheme: 'bereal://' },
  { id: 'sharechat',   name: 'ShareChat',     bundleId: 'in.sharechat.app',               initials: 'Sh', color: '#f7a200', limit: 30, urlScheme: 'sharechat://' },
  { id: 'moj',         name: 'Moj',           bundleId: 'com.mohalla.tech',               initials: 'Mj', color: '#ff3b5c', limit: 30, urlScheme: 'moj://' },
  // Entertainment / Streaming
  { id: 'netflix',     name: 'Netflix',       bundleId: 'com.netflix.Netflix',            initials: 'Nf', color: '#e50914', limit: 60, urlScheme: 'nflx://' },
  { id: 'spotify',     name: 'Spotify',       bundleId: 'com.spotify.client',             initials: 'Sp', color: '#1db954', limit: 60, urlScheme: 'spotify://' },
  { id: 'hotstar',     name: 'Disney+Hotstar',bundleId: 'in.startv.hotstar',              initials: 'Hs', color: '#1f80e0', limit: 60, urlScheme: 'hotstar://' },
  { id: 'prime',       name: 'Prime Video',   bundleId: 'com.amazon.aiv.AIVApp',          initials: 'Pv', color: '#00a8e0', limit: 60, urlScheme: 'aiv://' },
  { id: 'twitch',      name: 'Twitch',        bundleId: 'tv.twitch',                      initials: 'Tw', color: '#9146ff', limit: 60, urlScheme: 'twitch://' },
  { id: 'youtube_music',name:'YT Music',      bundleId: 'com.google.ios.youtubemusic',    initials: 'Ym', color: '#ff0000', limit: 60, urlScheme: 'youtubemusic://' },
  { id: 'jio_cinema',  name: 'JioCinema',     bundleId: 'com.jio.media.jiocinema',        initials: 'Jc', color: '#5c35b3', limit: 60, urlScheme: 'jiocinema://' },
  // Gaming
  { id: 'pubg',        name: 'BGMI',          bundleId: 'com.pubg.imobile',               initials: 'Bg', color: '#f7931a', limit: 45, urlScheme: 'bgmi://' },
  { id: 'freefire',    name: 'Free Fire',      bundleId: 'com.dts.freefireth',             initials: 'Ff', color: '#ff6600', limit: 45, urlScheme: 'freefire://' },
  { id: 'roblox',      name: 'Roblox',         bundleId: 'com.roblox.robloxmobile',        initials: 'Ro', color: '#e53935', limit: 45, urlScheme: 'roblox://' },
  { id: 'subway',      name: 'Subway Surfers', bundleId: 'com.sybo.subwaysurf',            initials: 'Su', color: '#ff9500', limit: 30, urlScheme: 'subwaysurfers://' },
  { id: 'candy_crush', name: 'Candy Crush',    bundleId: 'com.king.candycrushsaga',        initials: 'Cc', color: '#f4a200', limit: 30, urlScheme: 'candycrush://' },
  { id: 'clash_royale',name: 'Clash Royale',   bundleId: 'com.supercell.clashroyale',      initials: 'Cr', color: '#0080ff', limit: 45, urlScheme: 'clashroyale://' },
  { id: 'clash_of_clans',name:'Clash of Clans',bundleId: 'com.supercell.magic',            initials: 'Co', color: '#4a90d9', limit: 45, urlScheme: 'clashofclans://' },
  { id: 'pokemon_go',  name: 'Pokémon GO',     bundleId: 'com.nianticlabs.pokemongo',      initials: 'Pk', color: '#ffcb05', limit: 45, urlScheme: 'pokemongo://' },
  { id: 'ludo',        name: 'Ludo King',       bundleId: 'com.gameloot.ludoking',          initials: 'Lk', color: '#5c35b3', limit: 30, urlScheme: 'ludoking://' },
  { id: 'coc_mobile',  name: 'COD Mobile',      bundleId: 'com.activision.callofduty',      initials: 'Cd', color: '#00b050', limit: 45, urlScheme: 'cod://' },
  { id: 'minecraft',   name: 'Minecraft',       bundleId: 'com.mojang.minecraftpe',         initials: 'Mc', color: '#55a630', limit: 60, urlScheme: 'minecraft://' },
  // Shopping
  { id: 'amazon',      name: 'Amazon',          bundleId: 'com.amazon.mobile.shopping.wood',initials: 'Am', color: '#ff9900', limit: 30, urlScheme: 'amazon://' },
  { id: 'flipkart',    name: 'Flipkart',         bundleId: 'com.flipkart.iphone',            initials: 'Fk', color: '#2874f0', limit: 30, urlScheme: 'flipkart://' },
  { id: 'meesho',      name: 'Meesho',           bundleId: 'com.meesho.supply',              initials: 'Me', color: '#f43397', limit: 30, urlScheme: 'meesho://' },
  { id: 'myntra',      name: 'Myntra',           bundleId: 'com.myntra.retailapp',           initials: 'My', color: '#ff3f6c', limit: 30, urlScheme: 'myntra://' },
  { id: 'ajio',        name: 'AJIO',             bundleId: 'com.ril.ajio',                   initials: 'Aj', color: '#fc4100', limit: 30, urlScheme: 'ajio://' },
  // Food
  { id: 'swiggy',      name: 'Swiggy',           bundleId: 'in.swiggy.consumer',             initials: 'Sw', color: '#fc8019', limit: 30, urlScheme: 'swiggy://' },
  { id: 'zomato',      name: 'Zomato',            bundleId: 'com.application.zomato',         initials: 'Zo', color: '#e23744', limit: 30, urlScheme: 'zomato://' },
  { id: 'blinkit',     name: 'Blinkit',           bundleId: 'com.grofers.customerApp',        initials: 'Bl', color: '#f8c200', limit: 20, urlScheme: 'blinkit://' },
  // Payments
  { id: 'phonepe',     name: 'PhonePe',            bundleId: 'com.phonepe.app',                initials: 'Pp', color: '#5f259f', limit: 20, urlScheme: 'phonepe://' },
  // Productivity / Others
  { id: 'chrome',      name: 'Chrome',            bundleId: 'com.google.chrome.ios',          initials: 'Ch', color: '#4285f4', limit: 60, urlScheme: 'googlechrome://' },
  { id: 'safari',      name: 'Safari',            bundleId: 'com.apple.mobilesafari',         initials: 'Sa', color: '#0071e3', limit: 60, urlScheme: 'x-web-search://' },
];

// URL scheme lookup (lazy, safe)
export function getAppUrlScheme(bundleId: string): string {
  return APPS.find(a => a.bundleId === bundleId)?.urlScheme || '';
}

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
