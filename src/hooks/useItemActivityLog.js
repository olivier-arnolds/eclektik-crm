import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { getEmailsForContact } from '../lib/graph';

export function useItemActivityLog(item, contacts, comms, { enabled }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const firstContact = (item.contactIds || [])
      .map((id) => contacts.find((c) => c.id === id))
      .filter(Boolean)[0];
    const itemComms = comms.filter((c) => (c.itemIds || []).includes(item.id));
    const results = [];

    if (firstContact?.email) {
      try {
        const emails = await getEmailsForContact(firstContact.email, 30);
        (emails || []).forEach((e) => {
          const myEmail = e.fromAddress?.toLowerCase() || '';
          const contactEmail = firstContact.email?.toLowerCase() || '';
          const isOutbound = myEmail !== contactEmail;
          results.push({
            _type: 'email',
            _icon: '\u2709',
            _channel: 'Email',
            _direction: isOutbound ? 'outbound' : 'inbound',
            _from: e.from || e.fromAddress || '',
            _subject: e.subject || '',
            _preview: e.bodyPreview || '',
            _body: e.bodyHtml || e.bodyPreview || '',
            _date: e.date || '',
            _id: 'email-' + e.id,
          });
        });
      } catch {
        /* skip */
      }
    }

    const linkedinComms = itemComms.filter((c) => (c.channel || '').toLowerCase() === 'linkedin');
    linkedinComms.forEach((c) => {
      results.push({
        _type: 'linkedin',
        _icon: 'in',
        _channel: 'LinkedIn',
        _direction: c.direction || 'outbound',
        _from: c.from || '',
        _subject: c.sub || '',
        _preview: c.sub || '',
        _body: c.body || c.sub || '',
        _date: c.date || '',
        _id: 'li-' + c.id,
      });
    });

    if (firstContact) {
      try {
        const { data: activities } = await supabase
          .from('activity')
          .select('*')
          .eq('contact_id', firstContact.id)
          .order('created_at', { ascending: false })
          .limit(30);
        (activities || []).forEach((a) => {
          results.push({
            _type: 'note',
            _icon: '\uD83D\uDCDD',
            _channel: 'Note',
            _direction: 'outbound',
            _from: a.owner || a.created_by || '',
            _subject: a.type || 'Activity',
            _preview: a.note || a.description || '',
            _body: a.note || a.description || '',
            _date: a.created_at || '',
            _id: 'act-' + a.id,
          });
        });
      } catch {
        /* skip */
      }
    }

    const otherComms = itemComms.filter((c) => (c.channel || '').toLowerCase() !== 'linkedin');
    otherComms.forEach((c) => {
      const ch = (c.channel || '').toLowerCase();
      results.push({
        _type: ch === 'teams' ? 'teams' : ch === 'email' ? 'email' : 'other',
        _icon: ch === 'teams' ? '\u25CE' : ch === 'email' ? '\u2709' : c.icon || '\u25CE',
        _channel: c.channel || 'Other',
        _direction: c.direction || 'outbound',
        _from: c.from || '',
        _subject: c.sub || '',
        _preview: c.sub || '',
        _body: c.body || c.sub || '',
        _date: c.date || '',
        _id: 'comm-' + c.id,
      });
    });

    results.sort((a, b) => (b._date || '').localeCompare(a._date || ''));
    setItems(results);
    setLoading(false);
  }, [item.id, item.contactIds, contacts, comms]);

  useEffect(() => {
    if (enabled) load();
  }, [enabled, load]);

  return {
    items,
    loading,
    expanded,
    setExpanded,
    refresh: load,
  };
}
