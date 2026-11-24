// Tests for the account form checks and the friendly error messages.
// Expected sentences were decided from the spec (wrong password, email in use, weak password,
// no internet) before running the code.
import { describe, expect, jest, test } from '@jest/globals';
import { checkSignIn, checkSignUp, friendlyAuthError, looksLikeEmail } from './accountRules';

describe('looksLikeEmail', () => {
  test('accepts ordinary addresses (spaces around are ignored)', () => {
    expect(looksLikeEmail('a@utexas.edu')).toBe(true);
    expect(looksLikeEmail('  a.b+c@mail.utexas.edu ')).toBe(true);
  });
  test('rejects ones with no @, no dot after it, or spaces inside', () => {
    expect(looksLikeEmail('plain')).toBe(false);
    expect(looksLikeEmail('a@b')).toBe(false);
    expect(looksLikeEmail('a b@c.com')).toBe(false);
    expect(looksLikeEmail('@c.com')).toBe(false);
  });
});

describe('checkSignUp', () => {
  const ok = { name: 'Sam', email: 'sam@utexas.edu', password: 'abcdef' };
  test('a good form has no problem', () => expect(checkSignUp(ok)).toBeNull());
  test('name is needed, and blank spaces do not count', () => {
    expect(checkSignUp({ ...ok, name: '   ' })).toMatch(/name/i);
  });
  test('name over 40 letters is too long, exactly 40 is fine', () => {
    expect(checkSignUp({ ...ok, name: 'x'.repeat(41) })).toMatch(/under 41/);
    expect(checkSignUp({ ...ok, name: 'x'.repeat(40) })).toBeNull();
  });
  test('bad email is caught', () => expect(checkSignUp({ ...ok, email: 'nope' })).toMatch(/email/i));
  test('5-character password is too short, 6 is fine', () => {
    expect(checkSignUp({ ...ok, password: '12345' })).toMatch(/at least 6/);
    expect(checkSignUp({ ...ok, password: '123456' })).toBeNull();
  });
});

describe('checkSignIn', () => {
  test('needs a real-looking email and some password', () => {
    expect(checkSignIn('x', 'pw')).toMatch(/email/i);
    expect(checkSignIn('a@b.co', '')).toMatch(/password/i);
    expect(checkSignIn('a@b.co', 'pw')).toBeNull();
  });
});

describe('friendlyAuthError', () => {
  test.each([
    ['auth/wrong-password', /wrong email or password/i],
    ['auth/invalid-credential', /wrong email or password/i],
    ['auth/user-not-found', /wrong email or password/i],
    ['auth/email-already-in-use', /already an account/i],
    ['auth/weak-password', /too easy/i],
    ['auth/network-request-failed', /no internet/i],
    ['auth/too-many-requests', /too many/i],
    ['auth/operation-not-allowed', /isn't set up for this app yet/i],
    ['auth/configuration-not-found', /isn't set up for this app yet/i],
  ])('%s', (code, words) => {
    expect(friendlyAuthError({ code })).toMatch(words);
  });
  test('the no-internet message tells people navigation still works', () => {
    expect(friendlyAuthError({ code: 'auth/network-request-failed' })).toMatch(/directions still work/i);
  });
  test('an unknown code is logged with console.warn (so we can find out what it was); known codes are not', () => {
    // Worked out by hand: one unknown error -> exactly one warning that contains the code.
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    friendlyAuthError({ code: 'auth/wrong-password' });
    expect(warn).not.toHaveBeenCalled();
    friendlyAuthError({ code: 'auth/brand-new-thing' });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0].join(' ')).toContain('auth/brand-new-thing');
    warn.mockRestore();
  });
  test('anything unknown (or not an error object) gets a general message', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(friendlyAuthError({ code: 'auth/something-new' })).toMatch(/something went wrong/i);
    expect(friendlyAuthError(null)).toMatch(/something went wrong/i);
    expect(friendlyAuthError('boom')).toMatch(/something went wrong/i);
    warn.mockRestore();
  });
});
