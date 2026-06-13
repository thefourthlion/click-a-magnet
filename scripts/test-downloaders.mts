/**
 * Integration smoke test against local Docker stacks.
 * Usage: npx tsx scripts/test-downloaders.mts
 *
 * Patches fetch with a minimal cookie jar — Node fetch does not persist
 * Deluge/KTorrent session cookies; the browser extension does via credentials: 'include'.
 *
 * Optional KTorrent test: KTORRENT_URL=http://host:port KTORRENT_USER=… KTORRENT_PASS=…
 * Optional Synology test: SYNOLOGY_URL=http://nas:5000 SYNOLOGY_USER=… SYNOLOGY_PASS=… [SYNOLOGY_DEST=download]
 */
const cookiesByOrigin = new Map<string, string>();
const nativeFetch = globalThis.fetch.bind(globalThis);

globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const origin = new URL(url).origin;
  const headers = new Headers(init?.headers);
  const stored = cookiesByOrigin.get(origin);
  if (stored) headers.set('Cookie', stored);

  const res = await nativeFetch(input, { ...init, headers });
  const setCookies =
    typeof res.headers.getSetCookie === 'function'
      ? res.headers.getSetCookie()
      : res.headers.get('set-cookie')
        ? [res.headers.get('set-cookie')!]
        : [];

  if (setCookies.length > 0) {
    const pairs = setCookies.map((c) => c.split(';')[0]).filter(Boolean);
    cookiesByOrigin.set(origin, pairs.join('; '));
  }
  return res;
};

const { biglybt } = await import('../utils/downloaders/biglybt.ts');
const { tribler } = await import('../utils/downloaders/tribler.ts');
const { deluge } = await import('../utils/downloaders/deluge.ts');
const { rutorrent } = await import('../utils/downloaders/rutorrent.ts');
const { transmission } = await import('../utils/downloaders/transmission.ts');
const { aria2 } = await import('../utils/downloaders/aria2.ts');
const { utorrent } = await import('../utils/downloaders/utorrent.ts');

const SINTEL =
  'magnet:?xt=urn:btih:08ada5a7ebb2fddfd1925671490621be949cb477&dn=Sintel';
const BBB =
  'magnet:?xt=urn:btih:dd8255ecdc7ca55fb0bbf81323d15162f0f6f493&dn=Big+Buck+Bunny';

async function run(name: string, fn: () => Promise<void>) {
  process.stdout.write(`${name}… `);
  try {
    await fn();
    console.log('ok');
  } catch (err) {
    console.log('FAIL');
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  }
}

await run('Transmission testConnection', async () => {
  const version = await transmission.testConnection({
    type: 'transmission',
    url: 'http://localhost:9091',
    username: 'admin',
    password: 'admin',
  });
  if (!version.startsWith('Transmission')) throw new Error(version);
  process.stdout.write(`(${version.trim()}) `);
});

await run('Transmission addMagnet + label', async () => {
  await transmission.addMagnet(
    { type: 'transmission', url: 'http://localhost:9091', username: 'admin', password: 'admin' },
    BBB,
    { category: 'cam-test-tx' },
  );
});

await run('Deluge testConnection', async () => {
  const version = await deluge.testConnection({
    type: 'deluge',
    url: 'http://localhost:8112',
    username: '',
    password: 'deluge',
  });
  if (!version.startsWith('Deluge')) throw new Error(version);
  process.stdout.write(`(${version.trim()}) `);
});

// Remove test torrent if present so re-runs stay idempotent.
async function delugeRemoveIfPresent(
  config: { type: 'deluge'; url: string; username: string; password: string },
  hash: string,
) {
  cookiesByOrigin.clear();
  try {
    await deluge.testConnection(config);
    await nativeFetch(`${config.url}/json`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookiesByOrigin.get(new URL(config.url).origin) ?? '',
      },
      body: JSON.stringify({
        method: 'core.remove_torrent',
        params: [hash, false],
        id: 99,
      }),
    });
  } catch {
    // Ignore cleanup failures.
  }
  cookiesByOrigin.clear();
}

await delugeRemoveIfPresent(
  { type: 'deluge', url: 'http://localhost:8112', username: '', password: 'deluge' },
  '08ada5a7ebb2fddfd1925671490621be949cb477',
);

await run('Deluge addMagnet + label', async () => {
  await deluge.addMagnet(
    { type: 'deluge', url: 'http://localhost:8112', username: '', password: 'deluge' },
    SINTEL,
    { category: 'cam-test-dl' },
  );
});

await run('ruTorrent testConnection', async () => {
  const version = await rutorrent.testConnection({
    type: 'rutorrent',
    url: 'http://localhost:8081',
    username: '',
    password: '',
  });
  if (!version.startsWith('ruTorrent')) throw new Error(version);
  process.stdout.write(`(${version.trim()}) `);
});

await run('ruTorrent addMagnet + label', async () => {
  await rutorrent.addMagnet(
    { type: 'rutorrent', url: 'http://localhost:8081', username: '', password: '' },
    BBB,
    { category: 'cam-test-rt' },
  );
});

await run('BiglyBT testConnection', async () => {
  const version = await biglybt.testConnection({
    type: 'biglybt',
    url: 'http://localhost:8082',
    username: 'admin',
    password: 'admin',
  });
  if (!version.startsWith('BiglyBT')) throw new Error(version);
  process.stdout.write(`(${version.trim()}) `);
});

await run('BiglyBT addMagnet + tag', async () => {
  await biglybt.addMagnet(
    { type: 'biglybt', url: 'http://localhost:8082', username: 'admin', password: 'admin' },
    BBB,
    { category: 'cam-test-bb' },
  );
});

await run('Tribler testConnection', async () => {
  const version = await tribler.testConnection({
    type: 'tribler',
    url: 'http://localhost:8085',
    username: '',
    password: 'click-a-magnet-test',
  });
  if (!version.startsWith('Tribler')) throw new Error(version);
  process.stdout.write(`(${version.trim()}) `);
});

await run('Tribler addMagnet', async () => {
  await tribler.addMagnet(
    { type: 'tribler', url: 'http://localhost:8085', username: '', password: 'click-a-magnet-test' },
    SINTEL,
  );
});

const ktorrentUrl = process.env.KTORRENT_URL;
if (ktorrentUrl) {
  const ktorrentConfig = {
    type: 'ktorrent' as const,
    url: ktorrentUrl,
    username: process.env.KTORRENT_USER ?? '',
    password: process.env.KTORRENT_PASS ?? '',
  };
  const { ktorrent } = await import('../utils/downloaders/ktorrent.ts');

  await run('KTorrent testConnection', async () => {
    const version = await ktorrent.testConnection(ktorrentConfig);
    if (!version.startsWith('KTorrent')) throw new Error(version);
    process.stdout.write(`(${version.trim()}) `);
  });

  await run('KTorrent addMagnet', async () => {
    await ktorrent.addMagnet(ktorrentConfig, BBB);
  });
} else {
  console.log('KTorrent… skipped (set KTORRENT_URL to test)');
}

await run('aria2 testConnection', async () => {
  const version = await aria2.testConnection({
    type: 'aria2',
    url: 'http://localhost:6800',
    username: '',
    password: 'click-a-magnet-test',
  });
  if (!version.startsWith('aria2')) throw new Error(version);
  process.stdout.write(`(${version.trim()}) `);
});

await run('aria2 addMagnet', async () => {
  await aria2.addMagnet(
    { type: 'aria2', url: 'http://localhost:6800', username: '', password: 'click-a-magnet-test' },
    BBB,
  );
});

await run('µTorrent testConnection', async () => {
  const version = await utorrent.testConnection({
    type: 'utorrent',
    url: 'http://localhost:8087',
    username: 'admin',
    password: '',
  });
  if (!version.startsWith('µTorrent')) throw new Error(version);
  process.stdout.write(`(${version.trim()}) `);
});

await run('µTorrent addMagnet + label', async () => {
  await utorrent.addMagnet(
    { type: 'utorrent', url: 'http://localhost:8087', username: 'admin', password: '' },
    BBB,
    { category: 'cam-test-ut' },
  );
});

await run('BitTorrent testConnection', async () => {
  const { bittorrent } = await import('../utils/downloaders/bittorrent.ts');
  const version = await bittorrent.testConnection({
    type: 'bittorrent',
    url: 'http://localhost:8087',
    username: 'admin',
    password: '',
  });
  if (!version.startsWith('BitTorrent')) throw new Error(version);
  process.stdout.write(`(${version.trim()}) `);
});

await run('BitTorrent addMagnet + label', async () => {
  const { bittorrent } = await import('../utils/downloaders/bittorrent.ts');
  await bittorrent.addMagnet(
    { type: 'bittorrent', url: 'http://localhost:8087', username: 'admin', password: '' },
    SINTEL,
    { category: 'cam-test-bt' },
  );
});

await run('Flood testConnection', async () => {
  const { flood } = await import('../utils/downloaders/flood.ts');
  const version = await flood.testConnection({
    type: 'flood',
    url: 'http://localhost:8088',
    username: '',
    password: '',
  });
  if (!version.startsWith('Flood')) throw new Error(version);
  process.stdout.write(`(${version.trim()}) `);
});

await run('Flood addMagnet + tag', async () => {
  const { flood } = await import('../utils/downloaders/flood.ts');
  await flood.addMagnet(
    { type: 'flood', url: 'http://localhost:8088', username: '', password: '' },
    BBB,
    { category: 'cam-test-fl' },
  );
});

const synologyUrl = process.env.SYNOLOGY_URL?.trim();
if (synologyUrl) {
  const synologyConfig = {
    type: 'synology' as const,
    url: synologyUrl,
    username: process.env.SYNOLOGY_USER ?? '',
    password: process.env.SYNOLOGY_PASS ?? '',
  };
  const synologyDest = process.env.SYNOLOGY_DEST?.trim();

  await run('Synology testConnection', async () => {
    const { synology } = await import('../utils/downloaders/synology.ts');
    const version = await synology.testConnection(synologyConfig);
    if (!version.includes('Download Station') && !version.includes('Synology')) {
      throw new Error(version);
    }
    process.stdout.write(`(${version.trim()}) `);
  });

  await run('Synology addMagnet', async () => {
    const { synology } = await import('../utils/downloaders/synology.ts');
    await synology.addMagnet(synologyConfig, BBB, synologyDest ? { category: synologyDest } : undefined);
  });
}
