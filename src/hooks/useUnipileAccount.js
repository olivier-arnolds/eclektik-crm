import { useCallback, useRef } from 'react';
import { apiFetch } from '../lib/apiFetch';

export function useUnipileAccount() {
  const cachedId = useRef(null);
  const inflight = useRef(null);

  const getAccountId = useCallback(async () => {
    if (cachedId.current) return cachedId.current;
    if (inflight.current) return inflight.current;

    inflight.current = (async () => {
      const resp = await apiFetch('/api/unipile?action=list-accounts');
      const data = await resp.json();
      if (!data.success || !data.data?.items?.length) return null;
      const liAcc =
        data.data.items.find((a) =>
          (a.account_type || a.type || '').toUpperCase().includes('LINKEDIN')
        ) || data.data.items[0];
      cachedId.current = liAcc?.id || null;
      return cachedId.current;
    })();

    try {
      return await inflight.current;
    } finally {
      inflight.current = null;
    }
  }, []);

  return { getAccountId };
}
