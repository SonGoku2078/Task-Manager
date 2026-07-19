import os from 'node:os';
import type { Request } from 'express';

export const PORT = Number(process.env.PORT ?? 3001);

// Erstes Element einer moeglichen Kommaliste (Proxys haengen Werte an).
const first = (v: unknown): string => String(v ?? '').split(',')[0].trim();

// Kam die Anfrage von der Maschine selbst? Dann taugt der Anfrage-Host nicht
// als Adresse fuer andere Geraete (Handy) und die Interface-IPs sind die
// bessere Auskunft.
export const isLoopback = (hostname: string): boolean =>
  hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1';

export interface PublicAddress {
  /** z.B. "http" */
  proto: string;
  /** z.B. "192.168.8.50:3001" (mit Port, wenn angegeben) */
  host: string;
  /** z.B. "192.168.8.50" (ohne Port) */
  hostname: string;
  /** z.B. "http://192.168.8.50:3001" */
  baseUrl: string;
}

// Die Adresse, ueber die der Client uns TATSAECHLICH erreicht hat (#79).
// os.networkInterfaces() liefert im Docker-Container nur das Bridge-Netz
// (172.x) — das erreicht von aussen niemand. Der Host-Header dagegen ist per
// Definition erreichbar: die aktuelle Anfrage kam ja darueber herein.
// X-Forwarded-* wird beruecksichtigt, damit es hinter einem Reverse-Proxy
// (NetBird, #61) die extern sichtbare Adresse bleibt.
export function publicAddress(req: Request): PublicAddress {
  const proto = first(req.headers['x-forwarded-proto']) || req.protocol || 'http';
  const host = first(req.headers['x-forwarded-host']) || first(req.headers.host) || `localhost:${PORT}`;
  // IPv6-Literale kommen als [::1]:3001 — die Klammern gehoeren zum Hostnamen.
  const hostname = host.startsWith('[')
    ? host.slice(0, host.indexOf(']') + 1)
    : host.split(':')[0];
  return { proto, host, hostname, baseUrl: `${proto}://${host}` };
}

// Private LAN IPv4 addresses of this machine (for mobile access over Wi-Fi).
export function lanIPv4(): string[] {
  const out: string[] = [];
  for (const addrs of Object.values(os.networkInterfaces())) {
    for (const a of addrs ?? []) {
      if (a.family === 'IPv4' && !a.internal && /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(a.address)) {
        out.push(a.address);
      }
    }
  }
  return out;
}
