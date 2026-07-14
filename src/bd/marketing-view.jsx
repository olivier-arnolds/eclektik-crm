import { useState, useEffect } from 'react';
import { I } from './atoms';
import { apiFetch } from '../lib/apiFetch';
import MarketingContacts from './marketing-contacts';
import MarketingCampaigns from './marketing-campaigns';
import TagManager from './marketing-tag-manager';
import MarketingComposer from './marketing-composer';
import MarketingLeads from './marketing-leads';

export default function MarketingView({ contacts, accounts, deals, allTags, refetch, onFilteredAccountsChange }) {
  const [tab, setTab] = useState('contacts');
  const [showTagManager, setShowTagManager] = useState(false);
  const [composer, setComposer] = useState(null); // null | { recipients: [...] }
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  // Afmeldingen uit Resend ophalen en do_not_email in de CRM bijwerken. Resend
  // stuurt geen betrouwbare unsubscribe-webhook, dus pullen we de status hier.
  const syncUnsubscribes = async ({ silent } = {}) => {
    setSyncing(true);
    if (!silent) setSyncMsg('');
    try {
      const resp = await apiFetch('/api/resend-sync-unsubscribes', { method: 'POST' });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || `HTTP ${resp.status}`);
      if (data.newly_blocked > 0 && refetch) refetch();
      setSyncMsg(
        data.newly_blocked > 0
          ? `${data.newly_blocked} nieuwe afmelding${data.newly_blocked === 1 ? '' : 'en'} verwerkt`
          : 'Afmeldingen up-to-date'
      );
    } catch (e) {
      setSyncMsg(`Sync mislukt: ${e.message}`);
    }
    setSyncing(false);
  };

  // Auto-sync bij het openen van de marketing-tab.
  useEffect(() => { syncUnsubscribes({ silent: true }); }, []);

  return (
    <div style={{ padding: '16px 24px', maxWidth: 1400, margin: '0 auto' }}>
      {composer ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <button className="btn-ghost tiny" onClick={() => setComposer(null)}>← Back</button>
            <span style={{ fontSize: 14, fontWeight: 500 }}>New campaign</span>
          </div>
          <MarketingComposer
            recipients={composer.recipients}
            onCancel={() => setComposer(null)}
            onSent={() => { setComposer(null); if (refetch) refetch(); }}
          />
        </>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, borderBottom: '0.5px solid var(--sep)', paddingBottom: 8 }}>
            <button
              className={tab === 'contacts' ? 'btn-primary tiny' : 'btn-ghost tiny'}
              onClick={() => setTab('contacts')}>
              Contacts
            </button>
            <button
              className={tab === 'campaigns' ? 'btn-primary tiny' : 'btn-ghost tiny'}
              onClick={() => setTab('campaigns')}>
              Campaigns
            </button>
            <button
              className={tab === 'leads' ? 'btn-primary tiny' : 'btn-ghost tiny'}
              onClick={() => setTab('leads')}>
              Leads
            </button>
            {syncMsg && (
              <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-3)' }}>{syncMsg}</span>
            )}
            <button
              className="btn-ghost tiny"
              style={syncMsg ? undefined : { marginLeft: 'auto' }}
              disabled={syncing}
              onClick={() => syncUnsubscribes()}
              title="Haal afmeldingen op uit Resend en werk het verzendstatus-icoon bij">
              {syncing ? 'Synced…' : '↻ Sync afmeldingen'}
            </button>
            <button
              className="btn-ghost tiny"
              onClick={() => setShowTagManager(true)}>
              Manage tags
            </button>
          </div>

          {tab === 'contacts' && (
            <MarketingContacts
              contacts={contacts}
              accounts={accounts}
              deals={deals}
              allTags={allTags}
              refetch={refetch}
              onComposeCampaign={(recipients) => setComposer({ recipients })}
              onFilteredAccountsChange={onFilteredAccountsChange}
            />
          )}
          {tab === 'campaigns' && <MarketingCampaigns />}
          {tab === 'leads' && <MarketingLeads />}

          {showTagManager && (
            <TagManager
              allTags={allTags}
              onClose={() => setShowTagManager(false)}
              onChange={refetch}
            />
          )}
        </>
      )}
    </div>
  );
}
