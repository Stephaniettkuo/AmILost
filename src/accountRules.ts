// The account rules that need no Firebase: checking the form, and turning Firebase's error codes
// into friendly sentences. Pure functions, so they are easy to test.

export type SignUpForm = { name: string; email: string; password: string };

export const MIN_PASSWORD = 6; // Firebase's own minimum
export const MAX_NAME = 40;

// A problem to show under the form, or null when it is fine to send.
export function checkSignIn(email: string, password: string): string | null {
  if (!looksLikeEmail(email)) return 'That email address doesn\'t look right.';
  if (!password) return 'Type your password.';
  return null;
}

export function checkSignUp(form: SignUpForm): string | null {
  if (!form.name.trim()) return 'What should we call you? Type a name.';
  if (form.name.trim().length > MAX_NAME) return `Please keep your name under ${MAX_NAME + 1} letters.`;
  if (!looksLikeEmail(form.email)) return 'That email address doesn\'t look right.';
  if (form.password.length < MIN_PASSWORD) return `Passwords need at least ${MIN_PASSWORD} characters.`;
  return null;
}

// Just one thing before an @, and a dot somewhere after it. Firebase does the real check.
export function looksLikeEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// Firebase errors look like { code: 'auth/wrong-password' }. Say what happened in plain words.
export function friendlyAuthError(error: unknown): string {
  const code = typeof error === 'object' && error && 'code' in error ? String((error as { code: unknown }).code) : '';
  switch (code) {
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/invalid-login-credentials':
      return 'Wrong email or password. Try again.';
    case 'auth/email-already-in-use':
      return 'There is already an account with that email. Try signing in instead.';
    case 'auth/weak-password':
      return `That password is too easy to guess. Use at least ${MIN_PASSWORD} characters.`;
    case 'auth/invalid-email':
      return 'That email address doesn\'t look right.';
    case 'auth/network-request-failed':
      return 'No internet right now. Maps and directions still work; try again when you\'re online.';
    case 'auth/too-many-requests':
      return 'Too many tries. Wait a minute and try again.';
    case 'auth/user-disabled':
      return 'This account has been turned off.';
    case 'auth/operation-not-allowed':
    case 'auth/configuration-not-found':
      return "Sign-in isn't set up for this app yet.";
    default:
      // An error we have no sentence for: say it plainly, but log the real code for whoever debugs it.
      console.warn('Unhandled sign-in error:', code || error);
      return 'Something went wrong. Please try again.';
  }
}
