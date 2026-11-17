// Design tokens: every color, size, radius, shadow and font comes from here.
// (Vibe: a soft cream pastry with orange icing. See "Design system" in CLAUDE.md.)

export const colors = {
  cream: '#FFF8EE',      // app background
  vanilla: '#FFF1DE',    // cards, sheets
  peach: '#FFD9B5',      // soft fills, chips, selected states
  apricot: '#FFB877',    // secondary buttons, route casing
  orange: '#FF8A3D',     // primary buttons, route line, arrows
  deepOrange: '#E8661A', // pressed state, button "bottom edge"
  cocoa: '#5B3A29',      // main text
  latte: '#9C7A66',      // secondary text, hints
  white: '#FFFFFF',      // text on orange, highlights
  mint: '#9ED6A8',       // start pin / success accents (sparingly)
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };

export const radii = { card: 28, pill: 999, small: 16 };

// Soft warm shadow. (Spread into a style object.)
export const shadow = {
  shadowColor: '#C07A4A',
  shadowOpacity: 0.18,
  shadowOffset: { width: 0, height: 6 },
  shadowRadius: 14,
  elevation: 4, // Android
};

// Names match what expo-font loads in App.tsx (Fredoka for titles/buttons, Nunito for body).
export const fonts = {
  title: 'Fredoka_600SemiBold',
  button: 'Fredoka_500Medium',
  body: 'Nunito_400Regular',
  bodyBold: 'Nunito_700Bold',
};

export const minTouch = 48; // smallest tappable height

// How tall the puffy button's darker "bottom edge" is.
export const buttonEdge = 4;
