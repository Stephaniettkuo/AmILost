// Design tokens: every color, size, radius, shadow and font comes from here.
// (Vibe: an old, tea-stained map and postal ephemera. See "Design system" in CLAUDE.md.)

export const colors = {
  paper: '#E8D8B8',     // app background (tea-stained paper)
  parchment: '#F2E6CC', // cards, sheets
  wash: '#DCC59A',      // soft fills: selected chips, highlights
  brass: '#B8893A',     // secondary accents, route casing
  rust: '#9A5B2E',      // primary buttons, route line, arrows
  rustDark: '#6E3E1C',  // pressed state, button border
  ink: '#3B2A1E',       // main text and drawn lines
  fadedInk: '#6B5439',  // secondary text, hints
  line: '#A68A5E',      // thin borders on cards and chips
  light: '#FBF5E6',     // text on rust, highlights
  sage: '#8A9A78',      // start pin, success accents (sparingly)
  seal: '#8E3B2E',      // wax-seal red: destination pin, the arrival seal
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };

// Small corners, like cut paper and tickets (not pills).
export const radii = { card: 10, pill: 8, small: 6 };

// A soft sepia shadow, like paper resting on a table. (Spread into a style object.)
export const shadow = {
  shadowColor: '#4A2F14',
  shadowOpacity: 0.22,
  shadowOffset: { width: 0, height: 3 },
  shadowRadius: 7,
  elevation: 3, // Android
};

// Names match what expo-font loads (see src/fonts.ts): a Garamond-style serif for titles and
// reading, a typewriter face for small labels, buttons and stamps.
export const fonts = {
  title: 'CormorantGaramond_700Bold',
  body: 'CormorantGaramond_600SemiBold',
  bodyBold: 'CormorantGaramond_700Bold',
  label: 'SpecialElite_400Regular',
};

export const minTouch = 48; // smallest tappable height

// Screens are a phone-width column, centered on wider windows (web).
export const MAX_WIDTH = 480;
