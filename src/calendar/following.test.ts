import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadFollowing, saveFollowing, toggleFollow } from './following';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

beforeEach(async () => {
  jest.restoreAllMocks();
  await AsyncStorage.clear();
});

describe('toggleFollow', () => {
  test('adds a group, takes it away again, and does not change the list it was given', () => {
    const start = ['larg'];
    expect(toggleFollow(start, 'amrl')).toEqual(['larg', 'amrl']);
    expect(toggleFollow(['larg', 'amrl'], 'larg')).toEqual(['amrl']);
    expect(start).toEqual(['larg']);
  });
});

describe('following groups on the phone', () => {
  test('nothing saved yet -> not following anyone', async () => {
    expect(await loadFollowing()).toEqual([]);
  });

  test('what was saved comes back (this is what survives restarting the app)', async () => {
    await saveFollowing(['larg', 'robin']);
    expect(await loadFollowing()).toEqual(['larg', 'robin']);
  });

  test('damaged data is ignored; junk entries are dropped', async () => {
    await AsyncStorage.setItem('amilost.followedGroups', '{nope');
    expect(await loadFollowing()).toEqual([]);
    await AsyncStorage.setItem('amilost.followedGroups', JSON.stringify(['larg', 5, null, 'amrl']));
    expect(await loadFollowing()).toEqual(['larg', 'amrl']);
    await AsyncStorage.setItem('amilost.followedGroups', JSON.stringify({ a: 1 }));
    expect(await loadFollowing()).toEqual([]);
  });

  test('if the phone refuses to read or write, the app still works', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValue(new Error('disk full'));
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValue(new Error('disk full'));
    expect(await loadFollowing()).toEqual([]);
    await expect(saveFollowing(['larg'])).resolves.toBeUndefined();
  });
});
