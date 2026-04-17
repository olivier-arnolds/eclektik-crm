import { useState, useEffect, useCallback } from 'react';
import { getEmailsForContact, sendEmail } from '../lib/graph';

const emptyForm = { subject: '', body: '', cc: '' };

export function useEmailComms(contact, { enabled }) {
  const [emails, setEmails] = useState([]);
  const [emailLoading, setEmailLoading] = useState(false);
  const [expandedEmail, setExpandedEmail] = useState(null);
  const [showCompose, setShowCompose] = useState(false);
  const [composeForm, setComposeForm] = useState(emptyForm);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);

  const fetchEmails = useCallback(() => {
    if (!contact.email) return;
    const token = localStorage.getItem('graph_token');
    if (!token) {
      setEmails([]);
      return;
    }
    setEmailLoading(true);
    getEmailsForContact(contact.email, 50)
      .then((result) => {
        setEmails(result || []);
      })
      .catch(() => {
        setEmails([]);
      })
      .finally(() => {
        setEmailLoading(false);
      });
  }, [contact.email]);

  useEffect(() => {
    if (enabled) fetchEmails();
  }, [enabled, fetchEmails]);

  const handleSendEmail = useCallback(async () => {
    if (!composeForm.subject || !composeForm.body) return;
    setSending(true);
    const result = await sendEmail({
      to: contact.email,
      subject: composeForm.subject,
      body: composeForm.body,
      cc: composeForm.cc || undefined,
    });
    setSending(false);
    if (result.success) {
      setSendResult('sent');
      setTimeout(() => {
        setSendResult(null);
        setShowCompose(false);
        setComposeForm(emptyForm);
      }, 1500);
    } else {
      setSendResult(result.error || 'Sending failed');
    }
  }, [composeForm, contact.email]);

  const cancelCompose = useCallback(() => {
    setShowCompose(false);
    setSendResult(null);
  }, []);

  return {
    emails,
    emailLoading,
    expandedEmail,
    setExpandedEmail,
    showCompose,
    setShowCompose,
    composeForm,
    setComposeForm,
    sending,
    sendResult,
    fetchEmails,
    handleSendEmail,
    cancelCompose,
  };
}
