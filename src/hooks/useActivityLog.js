import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { insertRow } from './useSupabase';

export function useActivityLog(contact, { enabled }) {
  const [activities, setActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  const fetchActivities = useCallback(async () => {
    setActivitiesLoading(true);
    const { data } = await supabase
      .from('activity')
      .select('*')
      .eq('contact_id', contact.id)
      .order('created_at', { ascending: false });
    setActivities(data || []);
    setActivitiesLoading(false);
  }, [contact.id]);

  useEffect(() => {
    if (enabled) fetchActivities();
  }, [enabled, fetchActivities]);

  const handleAddNote = useCallback(async () => {
    if (!newNote.trim()) return;
    setAddingNote(true);
    await insertRow('activity', { contact_id: contact.id, type: 'note', note: newNote.trim() });
    setNewNote('');
    setAddingNote(false);
    fetchActivities();
  }, [newNote, contact.id, fetchActivities]);

  return {
    activities,
    activitiesLoading,
    newNote,
    setNewNote,
    addingNote,
    fetchActivities,
    handleAddNote,
  };
}
