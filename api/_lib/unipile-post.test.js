import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchImageForPost, createLinkedInPost } from './unipile-post.js';

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4]);

function fakeResponse({ ok = true, status = 200, type = 'image/png', body = PNG } = {}) {
  return {
    ok, status,
    headers: { get: (k) => (k.toLowerCase() === 'content-type' ? type : null) },
    arrayBuffer: async () => body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength),
    text: async () => '',
  };
}

afterEach(() => { vi.unstubAllGlobals(); });

describe('fetchImageForPost', () => {
  it('haalt een PNG op en houdt de bestandsnaam uit de URL', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => fakeResponse()));
    const r = await fetchImageForPost('https://x.supabase.co/storage/v1/object/public/content-images/abc/1757400000.png');
    expect(r.filename).toBe('1757400000.png');
    expect(r.blob.type).toBe('image/png');
    expect(r.blob.size).toBe(PNG.byteLength);
  });

  it('valt terug op een generieke naam als de URL geen extensie heeft', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => fakeResponse({ type: 'image/jpeg' })));
    const r = await fetchImageForPost('https://example.com/img');
    expect(r.filename).toBe('image.jpg');
  });

  it('weigert een niet-http URL zonder te fetchen', async () => {
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    await expect(fetchImageForPost('ftp://example.com/a.png')).rejects.toThrow(/geldige http/);
    expect(f).not.toHaveBeenCalled();
  });

  it('weigert een mislukte download en een niet-afbeelding', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => fakeResponse({ ok: false, status: 404 })));
    await expect(fetchImageForPost('https://example.com/a.png')).rejects.toThrow(/HTTP 404/);
    vi.stubGlobal('fetch', vi.fn(async () => fakeResponse({ type: 'text/html' })));
    await expect(fetchImageForPost('https://example.com/a.png')).rejects.toThrow(/content-type/);
  });

  it('weigert een lege of te grote afbeelding', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => fakeResponse({ body: new Uint8Array(0) })));
    await expect(fetchImageForPost('https://example.com/a.png')).rejects.toThrow(/leeg/);
    vi.stubGlobal('fetch', vi.fn(async () => fakeResponse({ body: new Uint8Array(8 * 1024 * 1024 + 1) })));
    await expect(fetchImageForPost('https://example.com/a.png')).rejects.toThrow(/te groot/);
  });
});

describe('createLinkedInPost met afbeelding', () => {
  it('plaatst NIET zonder afbeelding als de afbeelding niet op te halen is', async () => {
    // DSN/TOKEN ontbreken in de test-omgeving? Dan stopt de functie eerder; zet ze
    // hier zodat het afbeeldingspad wordt bereikt.
    process.env.UNIPILE_BASE_URL = process.env.UNIPILE_BASE_URL || 'test.unipile.local';
    process.env.UNIPILE_API_KEY = process.env.UNIPILE_API_KEY || 'test-token';
    // De module leest env bij import; herlaad hem zodat de test-waarden gelden.
    vi.resetModules();
    const mod = await import('./unipile-post.js');
    const f = vi.fn(async (url) => {
      if (String(url).includes('/api/v1/posts')) throw new Error('mag Unipile niet bereiken zonder afbeelding');
      return fakeResponse({ ok: false, status: 403 });
    });
    vi.stubGlobal('fetch', f);
    const r = await mod.createLinkedInPost({ accountId: 'acc', text: 'hallo', imageUrl: 'https://example.com/a.png' });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/afbeelding/);
    expect(f.mock.calls.some(c => String(c[0]).includes('/api/v1/posts'))).toBe(false);
  });

  it('stuurt de afbeelding als attachments-veld mee naar Unipile', async () => {
    process.env.UNIPILE_BASE_URL = process.env.UNIPILE_BASE_URL || 'test.unipile.local';
    process.env.UNIPILE_API_KEY = process.env.UNIPILE_API_KEY || 'test-token';
    vi.resetModules();
    const mod = await import('./unipile-post.js');
    let sentForm = null;
    const f = vi.fn(async (url, opts) => {
      if (String(url).includes('/api/v1/posts')) {
        sentForm = opts.body;
        return { ok: true, status: 200, text: async () => JSON.stringify({ post_id: 'p1' }) };
      }
      return fakeResponse();
    });
    vi.stubGlobal('fetch', f);
    const r = await mod.createLinkedInPost({ accountId: 'acc', text: 'hallo', imageUrl: 'https://example.com/card.png' });
    expect(r.ok).toBe(true);
    expect(r.postId).toBe('p1');
    expect(sentForm).toBeInstanceOf(FormData);
    expect(sentForm.get('text')).toBe('hallo');
    const att = sentForm.get('attachments');
    expect(att).toBeTruthy();
    expect(att.name).toBe('card.png');
    expect(att.size).toBe(PNG.byteLength);
  });

  it('zonder imageUrl gaat er geen attachments-veld mee', async () => {
    process.env.UNIPILE_BASE_URL = process.env.UNIPILE_BASE_URL || 'test.unipile.local';
    process.env.UNIPILE_API_KEY = process.env.UNIPILE_API_KEY || 'test-token';
    vi.resetModules();
    const mod = await import('./unipile-post.js');
    let sentForm = null;
    vi.stubGlobal('fetch', vi.fn(async (url, opts) => { sentForm = opts.body; return { ok: true, status: 200, text: async () => '{"post_id":"p2"}' }; }));
    const r = await mod.createLinkedInPost({ accountId: 'acc', text: 'hallo' });
    expect(r.ok).toBe(true);
    expect(sentForm.get('attachments')).toBeNull();
  });
});
