import { useState, useCallback } from 'react';
import { supabase } from '../supabase';
import { useUnipileAccount } from './useUnipileAccount';

export function useContactSearch(account, refetch) {
  const [showContactSearch, setShowContactSearch] = useState(false);
  const [keywords, setKeywords] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);
  const [savingContact, setSavingContact] = useState(null);
  const [savedContacts, setSavedContacts] = useState({});
  const [cursor, setCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const { getAccountId } = useUnipileAccount();

  const search = useCallback(
    async (loadMore = false) => {
      if (loadMore) setLoadingMore(true);
      else {
        setSearching(true);
        setResults([]);
        setCursor(null);
      }
      setError(null);
      try {
        const accountId = await getAccountId();
        if (!accountId) throw new Error('No LinkedIn account connected');
        const body = {
          account_id: accountId,
          company: account.name,
          keywords,
          linkedin_url: account.linkedin_url,
        };
        if (loadMore && cursor) body.cursor = cursor;
        const resp = await fetch('/api/unipile?action=search-people', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await resp.json();
        if (data.success) {
          const items = data.data?.items || data.data || [];
          const newItems = Array.isArray(items) ? items : [];
          setResults((prev) => (loadMore ? [...prev, ...newItems] : newItems));
          setCursor(data.data?.cursor || null);
        } else {
          setError(data.error || 'Search failed');
        }
      } catch (e) {
        setError(e.message);
      }
      setSearching(false);
      setLoadingMore(false);
    },
    [account.name, account.linkedin_url, keywords, cursor, getAccountId]
  );

  const addToCRM = useCallback(
    async (person) => {
      const personId = person.id || person.provider_id || Math.random().toString();
      setSavingContact(personId);
      try {
        const rawUrl =
          person.public_profile_url ||
          person.linkedin_url ||
          (person.public_identifier
            ? `https://www.linkedin.com/in/${person.public_identifier}`
            : '');
        const linkedinUrl = rawUrl.split('?')[0].replace(/\/$/, '');
        const fullName =
          person.name || `${person.first_name || ''} ${person.last_name || ''}`.trim();
        const firstName = person.first_name || fullName.split(' ')[0] || '';
        const lastName = person.last_name || fullName.split(' ').slice(1).join(' ') || '';
        await supabase.from('contacts').insert({
          full_name: fullName,
          first_name: firstName,
          last_name: lastName,
          title: person.headline || person.title || '',
          company_id: account.id,
          company_name: account.name,
          linkedin_url: linkedinUrl,
          source: 'LinkedIn Search',
          stage: 'Active',
          owner: 'MVG',
        });
        setSavedContacts((prev) => ({ ...prev, [personId]: true }));
        if (refetch) refetch();
      } catch (e) {
        console.error('Save contact error:', e);
      }
      setSavingContact(null);
    },
    [account.id, account.name, refetch]
  );

  return {
    showContactSearch,
    setShowContactSearch,
    keywords,
    setKeywords,
    results,
    searching,
    error,
    savingContact,
    savedContacts,
    cursor,
    loadingMore,
    search,
    addToCRM,
  };
}
