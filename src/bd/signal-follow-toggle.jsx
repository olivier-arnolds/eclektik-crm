import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export default function SignalFollowToggle({ contactId, companyId }) {
  const [subject, setSubject] = useState(null);
  const [loading, setLoading] = useState(true);

  const sourceType = contactId ? 'linkedin_user_post' : 'linkedin_company_post';
  const idField = contactId ? 'contact_id' : 'company_id';
  const idValue = contactId || companyId;

  useEffect(() => {
    if (!idValue) return;
    supabase.from('signal_subjects')
      .select('*')
      .eq(idField, idValue)
      .eq('source_type', sourceType)
      .maybeSingle()
      .then(({ data }) => { setSubject(data); setLoading(false); });
  }, [idValue]);

  async function toggle() {
    setLoading(true);
    if (subject) {
      const newEnabled = !subject.enabled;
      await supabase.from('signal_subjects')
        .update({ enabled: newEnabled })
        .eq('id', subject.id);
      setSubject({ ...subject, enabled: newEnabled });
    } else {
      const { data } = await supabase.from('signal_subjects')
        .insert({ [idField]: idValue, source_type: sourceType, enabled: true, auto_added: false })
        .select()
        .single();
      setSubject(data);
    }
    setLoading(false);
  }

  if (!idValue) return null;
  const isFollowing = subject?.enabled === true;
  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={isFollowing ? 'LinkedIn-activiteit volgen - klik om uit te zetten' : 'LinkedIn-activiteit niet gevolgd - klik om aan te zetten'}
      style={{
        background:'transparent',
        border:'none',
        cursor:'pointer',
        fontSize:14,
        padding:'4px 6px',
        color: isFollowing ? '#ec4899' : '#888780',
        opacity: loading ? 0.5 : 1,
      }}>
      {isFollowing ? '🔔' : '🔕'}
    </button>
  );
}
