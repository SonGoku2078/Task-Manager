import os from 'node:os';

export const PORT = Number(process.env.PORT ?? 3001);

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
