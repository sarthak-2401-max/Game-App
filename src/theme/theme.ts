// Design tokens. Gameplay-critical colours (danger red, interactable amber, cyan accent) are
// fixed and not themable, so cosmetics can never hide hazards. Every hazard also has a
// distinct shape/icon so colour is never the only signal.
export const colors = {
  bg: '#07090F',
  surface: '#0F1420',
  surfaceHi: '#171E2E',
  border: '#26304A',
  text: '#E8EEF9',
  textDim: '#9AA6BF',
  textMuted: '#6B7690',
  cyan: '#3BE8FF',
  cyanDim: '#1C7F95',
  amber: '#FFB547',
  amberDim: '#8A5A16',
  danger: '#FF4D5E',
  dangerDim: '#7A1F2A',
  success: '#4CF2A0',
  blue: '#5A8CFF',
  gold: '#FFD36E',
  violet: '#B38CFF',
  /** WITNESS, the Observer: clinical white with a red recording light. */
  witness: '#DDE3F0',
  rec: '#FF5468',
  overlay: 'rgba(3,5,10,0.82)',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 6, md: 10, lg: 16, xl: 24, pill: 999 } as const;

export const type = {
  title: { fontSize: 34, fontWeight: '900' as const, letterSpacing: 2 },
  h1: { fontSize: 24, fontWeight: '800' as const, letterSpacing: 0.5 },
  h2: { fontSize: 19, fontWeight: '700' as const },
  body: { fontSize: 15, fontWeight: '500' as const },
  small: { fontSize: 13, fontWeight: '500' as const },
  tiny: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.6 },
};

/** Minimum comfortable touch target. */
export const TOUCH = 48;
