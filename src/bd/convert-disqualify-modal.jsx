import { useState } from 'react';
import { I } from './atoms';
import { supabase } from '../supabase';
import { insertRow, updateRow } from '../hooks/useSupabase';

// Convert a lead → opportunity, auto-creating company/contact if missing.
export function ConvertLeadModal({ deal, accounts, rawItems, onClose, onDone }) {
  const rawLead = rawItems?.find(i => i.id === deal.id);
  const acc = accounts.find(a => a.id === deal.accountId);

  const [estRevenue, setEstRevenue] = useState(deal.value || 0);
  const [probability, setProbability] = useState(deal.probability || 50);
  const [closeDate, setCloseDate] = useState(deal.closeDate || '');
  const [productLine, setProductLine] = useState(deal.dealType || '');
  const [saving, setSaving] = useState(false);

  const handleConvert = async () => {
    setSaving(true);
    let companyId = deal.accountId;
    let companyName = acc?.name || rawLead?.company_name || '';
    let contactId = rawLead?.contactIds?.[0] || null;

    // Auto-create company if missing
    if (!companyId && companyName) {
      const { data: newCompany } = await insertRow('companies', {
        name: companyName,
        type: 'Prospect',
        stage: 'Active',
        owner: rawLead?.owner || 'MVG',
      });
      if (newCompany?.id) companyId = newCompany.id;
    }

    // Auto-create contact if missing
    if (!contactId && rawLead?.title) {
      const nameParts = (rawLead.title || '').split(' ');
      const { data: newContact } = await insertRow('contacts', {
        full_name: rawLead.title,
        first_name: nameParts[0] || '',
        last_name: nameParts.slice(1).join(' ') || '',
        company_id: companyId || null,
        company_name: companyName,
        stage: 'Active',
        source: 'Lead conversion',
        owner: rawLead?.owner || 'MVG',
      });
      if (newContact?.id) contactId = newContact.id;
    }

    await insertRow('opportunities', {
      topic: deal.title,
      company_id: companyId,
      company_name: companyName,
      contact_id: contactId,
      stage: 'opportunity',
      sub_status: 'qualify',
      status: 'Open',
      est_revenue: Number(estRevenue) || 0,
      probability: Number(probability) || 0,
      est_close_date: closeDate || null,
      product_line: productLine || null,
      owner: rawLead?.owner || null,
    });
    await updateRow('leads', deal.id, { status: 'Converted', converted: true });
    setSaving(false);
    if (onDone) onDone();
  };

  const fieldStyle = {
    width: '100%', padding: '6px 8px', borderRadius: 6, border: '0.5px solid var(--sep)',
    background: 'var(--fill-1)', color: 'var(--text-1)', fontSize: 12, outline: 'none',
    boxSizing: 'border-box',
  };
  const label = { fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: 5 };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal-title">Convert lead to opportunity</div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="modal-body-strong">{deal.title}</div>
          <div className="modal-body-sub">{acc?.name || 'No account linked'}</div>

          <div>
            <div style={label}>Estimated revenue (€)</div>
            <input type="number" style={fieldStyle} value={estRevenue} onChange={e => setEstRevenue(e.target.value)} />
          </div>
          <div>
            <div style={label}>Probability (%)</div>
            <input type="number" min="0" max="100" style={fieldStyle} value={probability} onChange={e => setProbability(e.target.value)} />
          </div>
          <div>
            <div style={label}>Expected close date</div>
            <input type="date" style={fieldStyle} value={closeDate} onChange={e => setCloseDate(e.target.value)} />
          </div>
          <div>
            <div style={label}>Product line</div>
            <select style={fieldStyle} value={productLine} onChange={e => setProductLine(e.target.value)}>
              <option value="">—</option>
              <option value="Glint">Glint</option>
              <option value="ROI">ROI</option>
              <option value="Seer">Seer</option>
              <option value="Insights">Insights</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleConvert} disabled={saving}>
            {saving ? 'Converting…' : 'Convert'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function DisqualifyLeadModal({ deal, rawItems, onClose, onDone }) {
  const rawLead = rawItems?.find(i => i.id === deal.id);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const handleDisqualify = async () => {
    if (!reason.trim()) return;
    setSaving(true);
    const newNotes = (rawLead?.notes ? rawLead.notes + '\n' : '') + 'Disqualified: ' + reason;
    await updateRow('leads', deal.id, { status: 'Disqualified', sub_status: null, notes: newNotes });
    setSaving(false);
    if (onDone) onDone();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width: 380 }} onClick={e => e.stopPropagation()}>
        <div className="modal-title">Disqualify lead</div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="modal-body-strong">{deal.title}</div>
          <div className="modal-body-sub">This marks the lead as Disqualified with a reason. You can still find it later.</div>
          <textarea rows={4} value={reason} onChange={e => setReason(e.target.value)}
            placeholder="Why is this lead being disqualified?"
            style={{ width: '100%', padding: 8, borderRadius: 6, border: '0.5px solid var(--sep)', background: 'var(--fill-1)', color: 'var(--text-1)', fontSize: 12, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }} />
        </div>
        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleDisqualify} disabled={saving || !reason.trim()}>
            {saving ? 'Disqualifying…' : 'Disqualify'}
          </button>
        </div>
      </div>
    </div>
  );
}
