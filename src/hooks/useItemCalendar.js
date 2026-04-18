import { useState, useEffect, useCallback, useMemo } from 'react';
import { getCalendarEvents, createCalendarEvent } from '../lib/graph';
import { insertRow } from './useSupabase';

const emptyForm = (attendees = '') => ({
  subject: '',
  date: '',
  startTime: '09:00',
  endTime: '09:30',
  attendees,
  isOnline: true,
});

export function useItemCalendar(item, refetch, contactEmailPrefill, { enabled }) {
  const [graphEvents, setGraphEvents] = useState([]);
  const [graphCalLoading, setGraphCalLoading] = useState(false);
  const [graphCalError, setGraphCalError] = useState(null);
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [meetingForm, setMeetingForm] = useState(emptyForm());
  const [savingMeeting, setSavingMeeting] = useState(false);

  useEffect(() => {
    setMeetingForm((f) => ({ ...f, attendees: contactEmailPrefill }));
  }, [contactEmailPrefill]);

  const fetchGraphCal = useCallback(async () => {
    setGraphCalLoading(true);
    setGraphCalError(null);
    try {
      const evs = await getCalendarEvents(30);
      setGraphEvents(evs);
    } catch (e) {
      setGraphCalError(e.message);
    }
    setGraphCalLoading(false);
  }, []);

  useEffect(() => {
    if (enabled) fetchGraphCal();
  }, [enabled, fetchGraphCal]);

  const createMeeting = useCallback(async () => {
    if (!meetingForm.subject.trim() || !meetingForm.date) return;
    setSavingMeeting(true);
    const startDT = meetingForm.date + 'T' + meetingForm.startTime + ':00';
    const endDT = meetingForm.date + 'T' + meetingForm.endTime + ':00';
    const emails = meetingForm.attendees.split(',').map((s) => s.trim()).filter(Boolean);
    const result = await createCalendarEvent({
      subject: meetingForm.subject.trim(),
      startTime: startDT,
      endTime: endDT,
      attendeeEmails: emails,
      isOnline: meetingForm.isOnline,
    });
    if (result.success) {
      await insertRow('calendar_events', {
        title: meetingForm.subject.trim(),
        start_at: startDT,
        end_at: endDT,
        location: meetingForm.isOnline ? 'Teams meeting' : '',
        attendees: meetingForm.attendees,
        opportunity_id: item.funnelStage !== 'lead' ? item.id : null,
        lead_id: item.funnelStage === 'lead' ? item.id : null,
        contact_id: item?.contactIds?.[0] || null,
      });
      setMeetingForm(emptyForm(contactEmailPrefill));
      setShowMeetingForm(false);
      await fetchGraphCal();
      refetch();
    } else {
      setGraphCalError(result.error);
    }
    setSavingMeeting(false);
  }, [meetingForm, item, contactEmailPrefill, fetchGraphCal, refetch]);

  const groupedGraphEvents = useMemo(() => {
    const groups = {};
    graphEvents.forEach((ev) => {
      const dateKey = ev.startAt ? ev.startAt.slice(0, 10) : 'unknown';
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(ev);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [graphEvents]);

  return {
    graphEvents,
    graphCalLoading,
    graphCalError,
    showMeetingForm,
    setShowMeetingForm,
    meetingForm,
    setMeetingForm,
    savingMeeting,
    fetchGraphCal,
    createMeeting,
    groupedGraphEvents,
  };
}
