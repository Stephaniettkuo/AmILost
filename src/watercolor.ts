// The watercolor pictures from our asset kit (assets/watercolor/). Each `require` must be a
// fixed path so the app bundler can find the file; this one file lists them all.
export const wc = {
  paper: require('../assets/watercolor/paper-background.jpg'),   // full-screen page background
  mascot: require('../assets/watercolor/mascot-portrait.png'),   // longhorn portrait, for empty space
  logo: require('../assets/watercolor/logo-keyhole-compass.png'),
  divider: require('../assets/watercolor/brush-divider.png'),
  compassRose: require('../assets/watercolor/compass-rose.png'),
  icons: {
    search: require('../assets/watercolor/icon-search.png'),
    pin: require('../assets/watercolor/icon-pin.png'),
    compass: require('../assets/watercolor/icon-compass.png'),
    room: require('../assets/watercolor/icon-room.png'),
    hourglass: require('../assets/watercolor/icon-hourglass.png'),
    xMarks: require('../assets/watercolor/icon-x-marks-it.png'),
    floorPlan: require('../assets/watercolor/icon-floor-plan.png'),
  },
};

export type WcIconName = keyof typeof wc.icons;
