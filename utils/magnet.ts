/** Extracts a human-readable name from a magnet URI (dn param or info hash). */
export function parseMagnetName(magnet: string): string {
  try {
    const dn = new URL(magnet).searchParams.get('dn');
    if (dn) return dn;
  } catch {
    // fall through to hash extraction
  }
  const hash = /urn:btih:([a-z0-9]+)/i.exec(magnet)?.[1];
  return hash ? `magnet ${hash.slice(0, 12)}…` : 'magnet link';
}
