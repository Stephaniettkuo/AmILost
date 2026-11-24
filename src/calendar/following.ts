// Which groups this phone follows, saved on the phone (no account, no server).
// Every read and write is in try/catch: if storage fails the app still works, it just forgets on restart.
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'amilost.followedGroups';

// Add the group if it isn't followed yet, take it away if it is.
export function toggleFollow(followed: string[], groupId: string): string[] {
  return followed.includes(groupId) ? followed.filter((id) => id !== groupId) : [...followed, groupId];
}

export async function loadFollowing(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const data: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export async function saveFollowing(followed: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(followed));
  } catch {
    // Not saved this time: the app keeps working with what it has in memory.
  }
}
