// #56: Version & Umgebung für die Einstellungen. Die Werte werden von Vite
// beim Build/Dev-Start eingebacken (vite.config.ts, define). typeof-Guards,
// damit das Modul auch ohne die Defines lädt (mobile Bundles, tsx-Tests).
declare const __APP_VERSION__: string;
declare const __BUILD_TIME__: string;

export const APP_VERSION: string =
  typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';
export const BUILD_TIME: string | null =
  typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : null;

export interface ApiEnvironment {
  url: string;
  label: string;
  kind: 'prod' | 'dev' | 'custom';
}

// Which environment the app is talking to, derived from the resolved API base
// (getBaseUrl(): '' in production builds = same origin that served the app).
// Port is the project convention: 3001 = Produktion (data.db), 3002 = Dev/Test
// (dev.db); everything else (vite dev, LAN-IP overrides, …) is custom.
export const apiEnvironment = (base: string, origin: string): ApiEnvironment => {
  const url = base || origin;
  let port = '';
  try {
    port = new URL(url).port;
  } catch {
    /* malformed override — keep 'custom' */
  }
  if (port === '3001') return { url, label: 'Produktion', kind: 'prod' };
  if (port === '3002') return { url, label: 'Dev/Test', kind: 'dev' };
  return { url, label: 'Custom', kind: 'custom' };
};
