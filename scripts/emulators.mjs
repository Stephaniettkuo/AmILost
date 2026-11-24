// npm run emulators: starts the Firebase Auth + Firestore emulators, then fills them with the demo data.
// Needs Java 21 or newer (the emulators run on Java; firebase-tools 15 refuses older ones) and firebase-tools (installed as a dev dependency).
// Leave it running while you use the app with  EXPO_PUBLIC_USE_EMULATOR=1 npx expo start ; Ctrl-C stops it.
import { spawn, spawnSync } from 'node:child_process';
import net from 'node:net';

// Java prints its version on stderr: `openjdk version "17.0.9"` or the old style `java version "1.8.0_421"`.
function javaMajor() {
  const run = spawnSync('java', ['-version'], { encoding: 'utf8' });
  const m = `${run.stderr}${run.stdout}`.match(/version "(\d+)(?:\.(\d+))?/);
  if (!m) return null;
  return m[1] === '1' ? Number(m[2]) : Number(m[1]);
}
const major = javaMajor();
if (major === null || major < 21) {
  console.error(`The emulators need Java 21 or newer, but ${major === null ? 'Java was not found' : `this is Java ${major}`}.\nInstall one (for example: brew install openjdk@21) and try again.`);
  process.exit(1);
}

const waitForPort = (port, tries = 120) => new Promise((resolve, reject) => {
  const attempt = (left) => {
    const socket = net.connect(port, '127.0.0.1');
    socket.on('connect', () => { socket.destroy(); resolve(); });
    socket.on('error', () => { socket.destroy(); left > 0 ? setTimeout(() => attempt(left - 1), 500) : reject(new Error(`port ${port} never opened`)); });
  };
  attempt(tries);
});

const emulators = spawn('npx', ['firebase', 'emulators:start', '--only', 'auth,firestore', '--project', 'amilost'], { stdio: 'inherit' });
const stop = () => { emulators.kill('SIGINT'); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
emulators.on('exit', (code) => process.exit(code ?? 0));

try {
  await waitForPort(8080);
  await waitForPort(9099);
  const seed = spawnSync('node', ['--import', './scripts/register-ts.mjs', 'scripts/seed.mjs', '--emulator'], { stdio: 'inherit' });
  console.log(seed.status === 0 ? '\nEmulators are running and seeded. Press Ctrl-C to stop.' : '\nSeeding failed (see above); the emulators are still running.');
} catch (error) {
  console.error(String(error));
  stop();
}
