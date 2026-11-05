import { describe, it, expect, vi } from 'vitest';
import { scanBatch, BATCH } from './outreach-linkedin-scan-lib.js';

// Een nepclient die alleen doet wat scanBatch van hem vraagt. Geen Unipile en
// geen Claude: die worden pas aangeroepen als er contacten zijn, en de tests
// hieronder gaan over het contract dat de knop en de cron allebei gebruiken.
function nepSupabase({ aantal = 0, contacten = [], selErr = null } = {}) {
  const upserts = [];
  const client = {
    upserts,
    from(tabel) {
      const q = {
        _tabel: tabel,
        select() { return q; },
        eq() { return q; },
        in() { return q; },
        not() { return q; },
        order() { return q; },
        upsert(rij) { upserts.push({ tabel, rij }); return Promise.resolve({ error: null }); },
        range() {
          return Promise.resolve({ data: contacten, error: selErr });
        },
        then(res) {
          // De tellende query (select met head:true) en de losse ophaalacties.
          return Promise.resolve({ count: aantal, data: [], error: null }).then(res);
        },
      };
      return q;
    },
  };
  return client;
}

describe('scanBatch', () => {
  it('geeft een leeg resultaat terug als de campagne geen chats heeft', async () => {
    const { fout, payload } = await scanBatch(nepSupabase({ aantal: 0 }), {
      campaign_id: 'c1', offset: 0, dryRun: true,
    });
    expect(fout).toBeUndefined();
    expect(payload).toMatchObject({
      totaal: 0, verwerkt: 0, met_antwoord: 0, geschreven: 0, fouten: 0,
      volgende_offset: null, dry_run: true,
    });
  });

  it('wijst naar de volgende portie zolang er meer contacten zijn', async () => {
    const { payload } = await scanBatch(nepSupabase({ aantal: 151 }), {
      campaign_id: 'c1', offset: 0, dryRun: true,
    });
    expect(payload.volgende_offset).toBe(BATCH);

    const laatste = await scanBatch(nepSupabase({ aantal: 151 }), {
      campaign_id: 'c1', offset: 120, dryRun: true,
    });
    expect(laatste.payload.volgende_offset).toBeNull();
  });

  it('KRITIEK: een droge run legt de scantijd niet vast', async () => {
    // Anders zou een controleronde de campagne als vers bestempelen terwijl er
    // niets gecontroleerd is wat blijft staan.
    const db = nepSupabase({ aantal: 10 });
    await scanBatch(db, { campaign_id: 'c1', offset: 0, dryRun: true });
    expect(db.upserts).toHaveLength(0);
  });

  it('KRITIEK: de scantijd gaat pas bij de LAATSTE portie naar de database', async () => {
    // Een halve ronde mag de hele campagne niet als gescand markeren: dan zou
    // er een herinnering uitgaan naar iemand wiens antwoord nog niet gelezen is.
    const halverwege = nepSupabase({ aantal: 151 });
    await scanBatch(halverwege, { campaign_id: 'c1', offset: 0, dryRun: false });
    expect(halverwege.upserts).toHaveLength(0);

    const eind = nepSupabase({ aantal: 151 });
    await scanBatch(eind, { campaign_id: 'c1', offset: 120, dryRun: false });
    expect(eind.upserts).toHaveLength(1);
    expect(eind.upserts[0].tabel).toBe('outreach_sync_state');
    expect(eind.upserts[0].rij.id).toBe('inbox:c1');
  });

  it('geeft een fout terug in plaats van hem te gooien', async () => {
    const { fout, payload } = await scanBatch(
      nepSupabase({ aantal: 5, selErr: { message: 'kapot' } }),
      { campaign_id: 'c1', offset: 0, dryRun: true });
    expect(payload).toBeUndefined();
    expect(fout).toEqual({ status: 500, error: 'kapot' });
  });
});
