import { useState } from 'react';
import { I } from './atoms';
import MarketingContacts from './marketing-contacts';
import MarketingCampaigns from './marketing-campaigns';
import TagManager from './marketing-tag-manager';
import MarketingComposer from './marketing-composer';

export default function MarketingView({ contacts, accounts, deals, allTags, refetch }) {
  const [tab, setTab] = useState('contacts');
  const [showTagManager, setShowTagManager] = useState(false);
  const [composer, setComposer] = useState(null); // null | { recipients: [...] }

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
              className="btn-ghost tiny"
              style={{ marginLeft: 'auto' }}
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
            />
          )}
          {tab === 'campaigns' && <MarketingCampaigns />}

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
