// Unified data hook: wraps usePipelineData + applies BD adapters.
import { useMemo } from 'react';
import { usePipelineData } from '../hooks/usePipelineData';
import { adaptDeal, adaptAccount, adaptContact, adaptComm, adaptCalEvent, adaptTask, adaptFollowUp } from './adapters';

export function useBDData() {
  const raw = usePipelineData();

  const data = useMemo(() => {
    // Filter inactive accounts and contacts out of all views
    const isActive = (row) => (row?.stage || '').toLowerCase() !== 'inactive';
    const activeRawAccounts = (raw.accounts || []).filter(isActive);
    const activeRawContacts = (raw.contacts || []).filter(isActive);

    const accounts  = activeRawAccounts.map(adaptAccount);
    const contacts  = activeRawContacts.map(c => adaptContact(c, accounts));
    const deals     = (raw.allItems || []).map(d => adaptDeal(d, activeRawAccounts, activeRawContacts));
    const comms     = (raw.comms || []).map(c => adaptComm(c, raw.allItems || [], activeRawAccounts));
    const events    = (raw.calEvents || []).map(e => adaptCalEvent(e, raw.allItems || [], activeRawAccounts));
    const tasks     = (raw.tasks || []).map(t => adaptTask(t, raw.allItems || [], activeRawAccounts));
    const followUps = (raw.followUps || []).map(f => adaptFollowUp(f, raw.allItems || [], activeRawAccounts));
    return { accounts, contacts, deals, comms, events, tasks, followUps, activeRawAccounts, activeRawContacts };
  }, [raw.accounts, raw.contacts, raw.allItems, raw.comms, raw.calEvents, raw.tasks, raw.followUps]);

  return {
    ...data,
    loading: raw.loading,
    refetch: raw.refetch,
    // also expose raw for mutations that need the original shape
    rawAllItems: raw.allItems,
    rawAccounts: data.activeRawAccounts,
    rawContacts: data.activeRawContacts,
    rawAccountsAll: raw.accounts,
    rawContactsAll: raw.contacts,
    allTags: raw.allTags || [],
  };
}
