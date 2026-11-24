// The painted pictures (cut from our team's watercolor asset kit) and the GDC photos.
export const art = {
  horns: require('../assets/kit/horns.png'),
  guide: require('../assets/kit/guide.png'),       // longhorn reading a map
  calf: require('../assets/kit/calf.png'),         // lost calf: nothing found
  cheer: require('../assets/kit/cheer.png'),       // celebrating longhorn: arrived
  seal: require('../assets/kit/seal.png'),
  button: require('../assets/kit/button.png'),
  search: require('../assets/kit/search.png'),
  settings: require('../assets/kit/settings.png'),
  door: require('../assets/kit/door.png'),
  elevator: require('../assets/kit/elevator.png'),
  stairs: require('../assets/kit/stairs.png'),
  entrance: require('../assets/kit/entrance.png'),
  pin: require('../assets/kit/pin.png'),
  you: require('../assets/kit/you.png'),
  arrowUp: require('../assets/kit/arrow-up.png'),
  arrowLeft: require('../assets/kit/arrow-left.png'),
} as const;

// Painted flecks for the arrival confetti.
export const confetti = [
  require('../assets/kit/confetti-1.png'),
  require('../assets/kit/confetti-2.png'),
  require('../assets/kit/confetti-3.png'),
  require('../assets/kit/confetti-4.png'),
  require('../assets/kit/confetti-5.png'),
  require('../assets/kit/confetti-6.png'),
  require('../assets/kit/confetti-7.png'),
  require('../assets/kit/confetti-8.png'),
];

export const photos = [
  { source: require('../assets/photos/gdc-corner.jpg'), label: 'Corner of the Gates Dell Complex' },
  { source: require('../assets/photos/gdc-atrium.jpg'), label: 'The GDC atrium' },
  { source: require('../assets/photos/gdc-entrance.jpg'), label: 'GDC entrance behind an orange tree' },
];
