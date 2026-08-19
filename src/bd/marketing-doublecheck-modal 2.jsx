import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';

// Side-by-side LinkedIn-doublecheck modal.
// Props:
//   contactIds: array van contact-ids om te checken (in volgorde)
//   onClose: sluit modal
//   refetch: parent refetch na wijzigingen
export default function DoubleCheckLinkedInModal({ contactIds, onClose, refetch }) {
  const [index, setIndex] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [decisions, setDecisions] = useState({}); // { [contactId]: 'kept' | 'cleared' | 'skipped' }

  const currentId = contactIds[index];
  const total = contactIds.length;
  const done = index >= total;

  useEffect(() => {
    if (done || !currentId) return;
    setLoading(true);
    setError(null);
    setData(null);
    fetch('/api/unipile?action=doublecheck-contact-linkedin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact_id: currentId }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.success) { setData(d); }
        else { setError(d.error || d.message || 'Onbekende fout'); }
        setLoading(false);
      })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [currentId, done]);

  function advance(decisionKey) {
    setDecisions(prev => ({ ...prev, [currentId]: decisionKey }));
    setIndex(i => i + 1);
  }

  async function decideCorrect() {
    advance('kept');
  }

  async function decideIncorrect() {
    const { error } = await supabase.from('contacts').update({ linkedin_url: null }).eq('id', currentId);
    if (error) { alert('Wissen mislukt: ' + error.message); return; }
    advance('cleared');
  }

  async function skip() {
    advance('skipped');
  }

  // Final summary
  if (done) {
    const kept = Object.values(decisions).filter(v => v === 'kept').length;
    const cleared = Object.values(decisions).filter(v => v === 'cleared').length;
    const skipped = Object.values(decisions).filter(v => v === 'skipped').length;
    return (
      <Modal onClose={onClose}>
        <h2 style={{ fontSize: 16, marginBottom: 12 }}>Doublecheck klaar</h2>
        <div style={{ fontSize: 13, lineHeight: 1.6 }}>
          ✓ {kept} juist (LinkedIn-URL behouden)<br/>
          ✗ {cleared} onjuist (LinkedIn-URL gewist)<br/>
          ⊘ {skipped} overgeslagen
        </div>
        <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={() => { if (refetch) refetch(); onClose(); }}
            style={{ padding: '6px 14px', fontSize: 12, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
            Sluit
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ fontSize: 14, margin: 0 }}>Doublecheck LinkedIn ({index + 1} / {total})</h2>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text-3)' }}>×</button>
      </div>

      {loading && <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-3)' }}>Loading…</div>}
      {error && (
        <div>
          <div style={{ padding: 14, background: '#fef2f2', color: '#991b1b', borderRadius: 4, fontSize: 12, marginBottom: 12 }}>
            ⚠ {error}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={skip} style={{ padding: '6px 12px', fontSize: 12, background: '#fff', border: '0.5px solid var(--sep)', borderRadius: 4, cursor: 'pointer' }}>Overslaan →</button>
          </div>
        </div>
      )}
      {data && !loading && !error && (
        <div>
          {/* Match-score banner */}
          <div style={{
            padding: '10px 14px',
            background: data.match_score >= 70 ? '#dcfce7' : data.match_score >= 40 ? '#fef9c3' : '#fee2e2',
            color: data.match_score >= 70 ? '#166534' : data.match_score >= 40 ? '#92400e' : '#991b1b',
            borderRadius: 4,
            fontSize: 12,
            fontWeight: 600,
            marginBottom: 14,
            display: 'flex',
            justifyContent: 'space-between',
          }}>
            <span>Match score: {data.match_score} / 100</span>
            <span style={{ fontSize: 11, fontWeight: 400 }}>
              {data.match_score >= 70 ? 'Sterke match' : data.match_score >= 40 ? 'Twijfel' : 'Mogelijke mismatch'}
            </span>
          </div>

          {/* Side-by-side */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <SidePanel title="In onze database" data={data.db} accent="#3b82f6" />
            <SidePanel title="Op LinkedIn" data={data.linkedin} accent="#0a66c2" link={data.linkedin.profile_url} />
          </div>

          {/* Actions */}
          <div style={{ marginTop: 18, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={skip}
              style={{ padding: '6px 14px', fontSize: 12, background: '#fff', color: 'var(--text-3)', border: '0.5px solid var(--sep)', borderRadius: 4, cursor: 'pointer' }}>
              Overslaan
            </button>
            <button onClick={decideIncorrect}
              style={{ padding: '6px 14px', fontSize: 12, background: '#fff', color: '#dc2626', border: '0.5px solid #dc2626', borderRadius: 4, cursor: 'pointer' }}>
              ✗ Onjuist (wis LinkedIn-URL)
            </button>
            <button onClick={decideCorrect}
              style={{ padding: '6px 14px', fontSize: 12, background: '#16a34a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}>
              ✓ Juiste match
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function SidePanel({ title, data, accent, link }) {
  return (
    <div style={{ border: '0.5px solid var(--sep)', borderTop: `3px solid ${accent}`, borderRadius: 4, padding: 12, background: '#fff' }}>
      <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', fontWeight: 700, marginBottom: 10 }}>
        {title}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{data.name || <em style={{ color: '#9ca3af' }}>—</em>}</div>
      <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 8 }}>{data.title || <em style={{ color: '#9ca3af' }}>—</em>}</div>
      <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{data.company || <em style={{ color: '#9ca3af' }}>—</em>}</div>
      {link && (
        <a href={link} target="_blank" rel="noreferrer"
          style={{ display: 'inline-block', marginTop: 10, fontSize: 11, color: accent }}>
          Open profiel ↗
        </a>
      )}
    </div>
  );
}

function Modal({ children, onClose }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 8, padding: 20, width: 700, maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }}>
        {children}
      </div>
    </div>
  );
}
