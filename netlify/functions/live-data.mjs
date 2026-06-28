/**
 * Netlify Function — serves live tournament data from Blob Store.
 * GET /api/live?type=fixtures|standings|knockout
 *
 * Returns 503 with { error } if Blob Store not yet populated (SPA
 * falls back to static data/*.json files in that case).
 */
import { getStore } from '@netlify/blobs';

const VALID_TYPES = new Set(['fixtures', 'standings', 'knockout']);

export default async function (req) {
  const type = new URL(req.url).searchParams.get('type');

  if (!type || !VALID_TYPES.has(type)) {
    return new Response(JSON.stringify({ error: 'Invalid type parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const store = getStore({ name: 'tournament', consistency: 'eventual' });
    const entry = await store.getWithMetadata(type, { type: 'json' });

    if (!entry?.value) {
      console.warn(`live-data: no blob for type="${type}" — returning 503`);
      return new Response(JSON.stringify({ error: 'Not yet available' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const koStatus = type === 'knockout'
      ? entry.value?.data?.flatMap(r => r.matches ?? []).find(m => m.id === 'r32-m1')?.status
      : undefined;
    if (koStatus !== undefined) console.log(`live-data: r32-m1 status="${koStatus}"`);

    return new Response(JSON.stringify(entry.value), {
      headers: {
        'Content-Type':                'application/json',
        'Cache-Control':               'no-store',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    console.error('live-data error:', err.message);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export const config = { path: '/api/live' };
