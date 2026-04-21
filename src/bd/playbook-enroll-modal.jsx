import { useState, useEffect } from 'react';
import { I } from './atoms';
import { supabase } from '../supabase';

export default function PlaybookEnrollModal({ contact, deal, onClose, onEnrolled }) {
  const [playbooks, setPlaybooks] = useState(null);
  const [enrolling, setEnrolling] = useState(null);
  const [result, setResult] = useState(null);
  const [startDate, setStartDate] = useState('');

  useEffect(() => {
    supabase.from('playbooks').select('*, playbook_steps(id)').in('status', ['active', 'draft'])
      .then(({ data }) => {
        setPlaybooks((data || []).map(pb => ({ ...pb, step_count: pb.playbook_steps?.length || 0 })));
      });
  }, []);

  const enroll = async (pb) => {
    setEnrolling(pb.id);
    const contactId = contact?.id;
    if (!contactId) {
      setResult('error');
      setEnrolling(null);
      return;
    }
    const { error } = await supabase.from('playbook_enrollments').insert({
      playbook_id: pb.id,
      contact_id: contactId,
      lead_id: deal?.table === 'leads' ? deal?.id : null,
      opportunity_id: deal?.table === 'opportunities' ? deal?.id : null,
      status: 'active',
      start_date: startDate || new Date().toISOString().split('T')[0],
      current_step: 0,
    });
    setEnrolling(null);
    if (error) {
      setResult('error');
      console.error('Enrollment failed:', error);
    } else {
      setResult('enrolled');
      if (onEnrolled) onEnrolled(pb);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width: 480 }} onClick={e => e.stopPropagation()}>
        <div className="modal-title">Enroll in playbook</div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="modal-body-strong">{contact?.name || deal?.title}</div>
          {!contact?.id && (
            <div style={{ color: 'var(--warn)', fontSize: 11 }}>
              No contact linked. Playbook steps that need a contact will fail.
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>Start date</span>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              style={{ padding: '4px 8px', borderRadius: 6, border: '0.5px solid var(--sep)', background: 'var(--fill-1)', color: 'var(--text-1)', fontSize: 11 }} />
            <span style={{ fontSize: 10, color: 'var(--text-3)' }}>(leave empty = today)</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflowY: 'auto' }}>
            {playbooks === null && <div className="empty">Loading playbooks…</div>}
            {playbooks?.length === 0 && <div className="empty">No playbooks yet. Create one in the Playbooks section.</div>}
            {playbooks?.map(pb => (
              <div key={pb.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, border: '0.5px solid var(--sep)', borderRadius: 6 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{pb.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{pb.step_count} step{pb.step_count !== 1 ? 's' : ''} · {pb.status}</div>
                </div>
                <button className="btn-primary tiny" onClick={() => enroll(pb)} disabled={enrolling === pb.id}>
                  {enrolling === pb.id ? 'Enrolling…' : result === 'enrolled' ? '✓ Enrolled' : 'Enroll'}
                </button>
              </div>
            ))}
          </div>

          {result === 'error' && <div style={{ color: 'var(--danger)', fontSize: 11 }}>Enrollment failed. Contact may already be enrolled.</div>}
        </div>
        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
