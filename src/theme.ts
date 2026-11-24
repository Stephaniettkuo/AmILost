// Design tokens: every color, size, radius, shadow and font comes from here.
// (Vibe: white torn paper, burnt orange, brown ink and small watercolor pictures. See CLAUDE.md.)

export const colors = {
  paper: '#FFFFFF',     // app background and torn-paper panels
  map: '#EADBBB',       // behind every floor plan (tan, so the plan and route stand out)
  mapInk: '#2E1D10',    // floor plan lines
  wash: '#FBE0CC',      // selected chips, soft fills
  orange: '#BF5700',    // the thin line at the very top, small accents
  rust: '#AE4600',      // route line, route dots, switches
  rustDark: '#8A3D10',  // text links ("Change", "Back"), the selected floor
  ink: '#4A3322',       // main text
  fadedInk: '#5F564F',  // secondary text, hints
  line: '#CFCAC6',      // thin borders and dividers
  light: '#FFFBF0',     // text on the painted button
  sage: '#8A9A78',      // editor and small success accents
  seal: '#8A3D20',      // arrival stamp, selected floor
  shade: '#33281E',     // shadows
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };

export const radii = { card: 10, pill: 8, small: 6 };

// A soft shadow, like paper resting on a table. (Spread into a style object.)
export const shadow = {
  shadowColor: colors.shade,
  shadowOpacity: 0.22,
  shadowOffset: { width: 0, height: 2 },
  shadowRadius: 5,
  elevation: 3, // Android
};

// Names match what expo-font loads (see src/fonts.ts).
export const fonts = {
  title: 'IMFellEnglish_400Regular',     // titles, place names, buttons
  body: 'LibreFranklin_400Regular',      // reading text
  bodyBold: 'LibreFranklin_600SemiBold',
  label: 'LibreFranklin_500Medium',
  script: 'PinyonScript_400Regular',     // one short handwritten line per screen at most
};

export const minTouch = 48; // smallest tappable height

// Screens are a phone-width column, centered on wider windows (web).
export const MAX_WIDTH = 480;
