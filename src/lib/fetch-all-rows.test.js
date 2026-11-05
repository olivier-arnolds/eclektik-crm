import { describe, it, expect } from 'vitest';
import { fetchAllRows } from '../hooks/usePipelineData.js';

// fetchAllRows pagineert met .range() omdat PostgREST elk antwoord stil
// afkapt op 1000 rijen. De helper bestond al en had geen tests; die staan
// hier, want aan deze functie hangt of een lijst compleet is.
const PAGINA = 1000;

// Een nepquerybuilder die zich gedraagt als PostgREST: nooit meer dan PAGINA
// rijen, ook niet als je er meer vraagt.
function nepTabel(aantalRijen) {
  const rijen = Array.from({ length: aantalRijen }, (_, i) => ({ id: i }));
  const aanroepen = [];
  const maakQuery = () => ({
    range(van, tot) {
      aanroepen.push([van, tot]);
      return Promise.resolve({ data: rijen.slice(van, Math.min(tot + 1, van + PAGINA)), error: null });
    },
  });
  return { maakQuery, aanroepen };
}

describe('fetchAllRows', () => {
  it('KRITIEK: haalt meer dan 1000 rijen op', () => {
    // Dit is de hele reden: een .limit(5000) levert er stil 1000 op.
    const { maakQuery } = nepTabel(2754);
    return fetchAllRows(maakQuery).then(uit => {
      expect(uit).toHaveLength(2754);
      expect(uit[2753].id).toBe(2753);
    });
  });

  it('vraagt net zoveel pagina\'s als nodig', async () => {
    const { maakQuery, aanroepen } = nepTabel(2754);
    await fetchAllRows(maakQuery);
    expect(aanroepen).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
  });

  it('stopt na één ronde bij een kleine tabel', async () => {
    const { maakQuery, aanroepen } = nepTabel(12);
    expect(await fetchAllRows(maakQuery)).toHaveLength(12);
    expect(aanroepen).toHaveLength(1);
  });

  it('vraagt een extra pagina bij een exact volle laatste pagina', async () => {
    // Bij precies 2000 rijen weet je pas na de derde vraag dat je klaar bent.
    const { maakQuery, aanroepen } = nepTabel(2000);
    expect(await fetchAllRows(maakQuery)).toHaveLength(2000);
    expect(aanroepen).toHaveLength(3);
  });

  it('gaat om met een lege tabel', async () => {
    const { maakQuery } = nepTabel(0);
    expect(await fetchAllRows(maakQuery)).toEqual([]);
  });

  it('gooit de fout door in plaats van stil minder terug te geven', async () => {
    const maakQuery = () => ({ range: () => Promise.resolve({ data: null, error: new Error('kapot') }) });
    await expect(fetchAllRows(maakQuery)).rejects.toThrow('kapot');
  });

  it('houdt op bij maxRijen, zodat een fout nooit eindeloos doorloopt', async () => {
    const { maakQuery, aanroepen } = nepTabel(10000);
    const uit = await fetchAllRows(maakQuery, 2000);
    expect(uit).toHaveLength(2000);
    expect(aanroepen).toHaveLength(2);
  });
});
