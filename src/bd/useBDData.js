// Unified data hook: wraps usePipelineData + applies BD adapters.
import { useMemo } from 'react';
import { usePipelineData } from '../hooks/usePipelineData';
import { adaptDeal, adaptAccount, adaptContact, adaptComm, adaptCalEvent, adaptTask, adaptFollowUp } from './adapters';

export function useBDData() {
  const raw = usePipelineData();

  const data = useMemo(() => {
    const accounts  = (raw.accounts || []).map(adaptAccount);
    const contacts  = (raw.contacts || []).map(c => adaptContact(c, accounts));
    const deals     = (raw.allItems || []).map(d => adaptDeal(d, raw.accounts || [], raw.contacts || []));
    const comms     = (raw.comms || []).map(c => adaptComm(c, raw.allItems || [], raw.accounts || []));
    const events    = (raw.calEvents || []).map(e => adaptCalEvent(e, raw.allItems || [], raw.accounts || []));
    const tasks     = (raw.tasks || []).map(t => adaptTask(t, raw.allItems || [], raw.accounts || []));
    const followUps = (raw.followUps || []).map(f => adaptFollowUp(f, raw.allItems || [], raw.accounts || []));
    return { accounts, contacts, deals, comms, events, tasks, followUps };
  }, [raw.accounts, raw.contacts, raw.allItems, raw.comms, raw.calEvents, raw.tasks, raw.followUps]);

  return {
    ...data,
    loading: raw.loading,
    refetch: raw.refetch,
    // also expose raw for mutations that need the original shape
    rawAllItems: raw.allItems,
    rawAccounts: raw.accounts,
    rawContacts: raw.contacts,
  };
}
