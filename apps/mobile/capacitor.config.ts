import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.selfmanaged.mobile',
  appName: 'SelfManaged',
  // Built web assets (vite build:mobile → repo-root dist/mobile).
  webDir: '../../dist/mobile',
  server: {
    androidScheme: 'http',
    // Allow plain-HTTP requests to the LAN backend (dev). For a future hosted
    // HTTPS server this can be tightened.
    cleartext: true,
  },
};

export default config;
