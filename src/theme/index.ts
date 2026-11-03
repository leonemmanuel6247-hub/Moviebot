export type ThemeMode = 'light' | 'dark' | 'auto';

export interface Theme {
  mode: 'light' | 'dark';
  // fonds & surfaces
  bg: string;
  surface: string;
  surfaceSecondary: string;
  border: string;
  // textes
  text: string;
  textSecondary: string;
  textMuted: string;
  // accent or
  accent: string;
  accentHover: string;
  accentSoft: string;
  // sémantique
  success: string;
  warning: string;
  error: string;
  info: string;
  // signature
  signature: [string, string];
  sendIcon: string;
  // fil / bulles
  threadBg: string;
  bubbleUserBg: string;
  bubbleUserBorder: string;
  bubbleUserText: string;
  bubbleAIBg: string;
  bubbleAIBorder: [string, string];
  bubbleAIText: string;
  authorLabel: string;
  metaText: string;
  // avatars
  avatarUserGrad: [string, string];
  avatarUserText: string;
  avatarAIBg: string;
  avatarAIMono: string;
  // zone de saisie
  inputBg: string;
  inputBorder: string;
  inputBorderFocus: [string, string];
  inputPlaceholder: string;
  actionIcon: string;
  actionIconHoverBg: string;
  actionIconHover: string;
  // markdown enrichi
  mdHeading: string;
  mdLink: string;
  mdCodeBg: string;
  mdCodeText: string;
  mdCodeBlockBg: string;
  mdCodeBlockHeader: string;
  mdCodeBlockBorder: string;
  mdCodeBlockText: string;
  mdQuoteBar: string;
  mdQuoteText: string;
  mdTableHeaderBg: string;
  mdTableAltRow: string;
  mdTableBorder: string;
  selection: string;
  // divers
  scrollbar: string;
  topbar: string;
  halo: string;
  grid: string;
}

export const palettes: Record<'light' | 'dark', Theme> = {
  light: {
    mode: 'light',
    bg: '#FAF7F2',
    surface: '#FFFFFF',
    surfaceSecondary: '#F3EEE6',
    border: '#E6DFD3',
    text: '#1C1A17',
    textSecondary: '#5C564D',
    textMuted: '#8C857A',
    accent: '#8A6A3B',
    accentHover: '#735829',
    accentSoft: '#F1E8D8',
    success: '#3F7D5C',
    warning: '#B7791F',
    error: '#A63D40',
    info: '#3D6A8A',
    signature: ['#9A7845', '#8A6A3B'],
    sendIcon: '#FFFFFF',
    threadBg: '#FAF7F2',
    bubbleUserBg: '#F3EEE6',
    bubbleUserBorder: '#E6DFD3',
    bubbleUserText: '#1C1A17',
    bubbleAIBg: '#FFFFFF',
    bubbleAIBorder: ['#E6DFD3', 'rgba(138,106,59,0.35)'],
    bubbleAIText: '#1C1A17',
    authorLabel: '#5C564D',
    metaText: '#8C857A',
    avatarUserGrad: ['#EADFCB', '#D9C9AC'],
    avatarUserText: '#5C564D',
    avatarAIBg: '#1C1A17',
    avatarAIMono: '#E8D5B0',
    inputBg: '#FFFFFF',
    inputBorder: '#E6DFD3',
    inputBorderFocus: ['#8A6A3B', 'rgba(138,106,59,0.2)'],
    inputPlaceholder: '#8C857A',
    actionIcon: '#8C857A',
    actionIconHoverBg: '#F3EEE6',
    actionIconHover: '#1C1A17',
    mdHeading: '#1C1A17',
    mdLink: '#8A6A3B',
    mdCodeBg: '#F1E8D8',
    mdCodeText: '#735829',
    mdCodeBlockBg: '#14161A',
    mdCodeBlockHeader: '#1B1E24',
    mdCodeBlockBorder: '#2A2D35',
    mdCodeBlockText: '#E8E3DA',
    mdQuoteBar: '#8A6A3B',
    mdQuoteText: '#5C564D',
    mdTableHeaderBg: '#F3EEE6',
    mdTableAltRow: 'rgba(243,238,230,0.5)',
    mdTableBorder: '#E6DFD3',
    selection: 'rgba(138,106,59,0.22)',
    scrollbar: '#E6DFD3',
    topbar: 'rgba(250,247,242,0.82)',
    halo: 'rgba(138,106,59,0.08)',
    grid: 'rgba(28,26,23,0.05)',
  },
  dark: {
    mode: 'dark',
    bg: '#0E0F12',
    surface: '#15171B',
    surfaceSecondary: '#1C1F25',
    border: '#2A2D35',
    text: '#ECE8E1',
    textSecondary: '#A8A39A',
    textMuted: '#6F6B64',
    accent: '#D4B483',
    accentHover: '#E3C79B',
    accentSoft: '#2A2418',
    success: '#6FBF98',
    warning: '#E0B04F',
    error: '#E07A7D',
    info: '#7FA9C9',
    signature: ['#E3C79B', '#D4B483'],
    sendIcon: '#0E0F12',
    threadBg: '#0E0F12',
    bubbleUserBg: '#1F232A',
    bubbleUserBorder: '#2F333C',
    bubbleUserText: '#ECE8E1',
    bubbleAIBg: '#16181D',
    bubbleAIBorder: ['rgba(212,180,131,0.35)', 'rgba(212,180,131,0.06)'],
    bubbleAIText: '#ECE8E1',
    authorLabel: '#A8A39A',
    metaText: '#6F6B64',
    avatarUserGrad: ['#2F333C', '#23262D'],
    avatarUserText: '#ECE8E1',
    avatarAIBg: '#1C1F25',
    avatarAIMono: '#D4B483',
    inputBg: '#15171B',
    inputBorder: '#2A2D35',
    inputBorderFocus: ['#D4B483', 'rgba(212,180,131,0.2)'],
    inputPlaceholder: '#6F6B64',
    actionIcon: '#6F6B64',
    actionIconHoverBg: '#1C1F25',
    actionIconHover: '#ECE8E1',
    mdHeading: '#ECE8E1',
    mdLink: '#D4B483',
    mdCodeBg: '#2A2418',
    mdCodeText: '#E3C79B',
    mdCodeBlockBg: '#0B0C0F',
    mdCodeBlockHeader: '#15171B',
    mdCodeBlockBorder: '#2A2D35',
    mdCodeBlockText: '#E8E3DA',
    mdQuoteBar: '#D4B483',
    mdQuoteText: '#A8A39A',
    mdTableHeaderBg: '#1C1F25',
    mdTableAltRow: 'rgba(28,31,37,0.5)',
    mdTableBorder: '#2A2D35',
    selection: 'rgba(212,180,131,0.28)',
    scrollbar: '#2A2D35',
    topbar: 'rgba(14,15,18,0.82)',
    halo: 'rgba(212,180,131,0.06)',
    grid: 'rgba(236,232,225,0.04)',
  },
};

// Échelle d'espacement (unité 4px)
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, huge: 48, giant: 64, mega: 96 };
// Rayons
export const radius = { chip: 10, field: 14, card: 20, sheet: 28, pill: 999 };
// Durées
export const motion = { press: 150, transition: 220, sheet: 320 };

export function getTheme(mode: ThemeMode, systemDark: boolean): Theme {
  const resolved: 'light' | 'dark' = mode === 'auto' ? (systemDark ? 'dark' : 'light') : mode;
  return palettes[resolved];
}
