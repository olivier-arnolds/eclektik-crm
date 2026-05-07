import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import CampaignDetail from './marketing-campaign-detail';

export default function MarketingCampaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [statsByCampaign, setStatsByCampaign] = useState(new Map());

  const reload = async () => {
    setLoading(true);
    const { data: camps } = await supabase
      .from('campaigns')
      .select('id, name, subject, sent_at, status, recipient_count, created_at')
      .order('sent_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(200);
    setCampaigns(camps || []);

    // For each campaign, count opens and clicks (anyone with first_opened_at / first_clicked_at)
    if (camps && camps.length > 0) {
      const ids = camps.map(c => c.id);
      const { data: sends } = await supabase
        .from('campaign_sends')
        .select('campaign_id, first_opened_at, first_clicked_at, status')
        .in('campaign_id', ids);
      const map = new Map();
      for (const id of ids) map.set(id, { sent: 0, opened: 0, clicked: 0, bounced: 0 });
      for (const s of (sends || [])) {
        const m = map.get(s.campaign_id);
        if (!m) continue;
        if (s.status === 'sent' || s.status === 'delivered') m.sent++;
        if (s.status === 'bounced') m.bounced++;
        if (s.first_opened_at) m.opened++;
        if (s.first_clicked_at) m.clicked++;
      }
      setStatsByCampaign(map);
    }
    setLoading(false);
  };

  useEffect(() => { reload(); }, []);

  if (openId) {
    return <CampaignDetail campaignId={openId} onBack={() => { setOpenId(null); reload(); }} />;
  }

  if (loading) return <div style={{ padding: 24, color: 'var(--text-3)' }}>Loading…</div>;

  if (campaigns.length === 0) {
    return (
      <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-3)' }}>
        <div style={{ fontSize: 28, marginBottom: 12, opacity: 0.5 }}>✉</div>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-1)', marginBottom: 6 }}>No campaigns yet</div>
        <div style={{ fontSize: 12, maxWidth: 380, margin: '0 auto', lineHeight: 1.5 }}>
          Pick contacts in the Contacts tab and click "Send campaign" to compose your first newsletter.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {campaigns.map(c => {
        const s = statsByCampaign.get(c.id) || { sent: 0, opened: 0, clicked: 0, bounced: 0 };
        const openRate = s.sent > 0 ? Math.round(100 * s.opened / s.sent) : 0;
        const clickRate = s.sent > 0 ? Math.round(100 * s.clicked / s.sent) : 0;
        return (
          <div key={c.id} onClick={() => setOpenId(c.id)}
            style={{ background: 'var(--bg-1)', border: '0.5px solid var(--sep)', borderRadius: 8, padding: '12px 16px', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{c.name || c.subject}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                  {c.subject}
                  {c.sent_at && ` · sent ${new Date(c.sent_at).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                  {!c.sent_at && c.status === 'draft' && ' · draft'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--text-2)' }}>
                <span>{c.recipient_count} recipients</span>
                <span>{openRate}% opened</span>
                <span>{clickRate}% clicked</span>
                {s.bounced > 0 && <span style={{ color: 'var(--danger)' }}>{s.bounced} bounced</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
