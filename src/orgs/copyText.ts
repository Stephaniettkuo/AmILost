// "Copy" for invite codes without a new package: the browser's clipboard on the web, the share sheet
// on phones (the share sheet has a Copy button). Returns what happened so the screen can say it.
import { Platform, Share } from 'react-native';

export async function copyText(text: string): Promise<'copied' | 'shared' | 'failed'> {
  try {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return 'copied';
    }
    await Share.share({ message: text });
    return 'shared';
  } catch {
    return 'failed';
  }
}
