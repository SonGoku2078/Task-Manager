import { registerPlugin, type PluginListenerHandle } from '@capacitor/core';

export interface SharedPayload {
  text?: string;
  subject?: string;
}

interface ShareTargetPlugin {
  consume(): Promise<SharedPayload>;
  addListener(
    eventName: 'shareReceived',
    cb: (data: SharedPayload) => void,
  ): Promise<PluginListenerHandle>;
}

// Native impl lives in ShareTargetPlugin.java; no web impl → calls reject on web.
const ShareTarget = registerPlugin<ShareTargetPlugin>('ShareTarget');

// Pull (and clear) any content shared into the app. Empty on web / nothing shared.
export async function consumeSharedIntent(): Promise<SharedPayload> {
  try {
    return await ShareTarget.consume();
  } catch {
    return {};
  }
}

// Ping when a share arrives while the app is already running (warm start).
// Returns an unsubscribe fn. No-op on web.
export function onShareReceived(cb: () => void): () => void {
  let handle: PluginListenerHandle | undefined;
  try {
    ShareTarget.addListener('shareReceived', () => cb())
      .then((h) => { handle = h; })
      .catch(() => {});
  } catch {
    /* not available (web) */
  }
  return () => { try { handle?.remove(); } catch { /* ignore */ } };
}
