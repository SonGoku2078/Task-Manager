import { registerPlugin } from '@capacitor/core';

// Native bridge to the device notification-sound picker + reminder channel
// config (#30). No-op object in the browser (methods just reject/throw and
// are caught by callers).
export const Ringtone = registerPlugin<{
  // Opens the system picker; resolves { uri, title } (uri null if cancelled).
  pick(opts: { current?: string | null }): Promise<{ uri?: string | null; title?: string }>;
  // (Re)creates the "rem_custom" channel with the chosen sound + vibration.
  configureChannel(opts: { uri: string | null; vibrate: boolean; sound: boolean }): Promise<void>;
}>('Ringtone');
