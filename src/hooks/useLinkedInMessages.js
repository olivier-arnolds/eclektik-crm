import { useState, useEffect } from 'react';
import { useUnipileAccount } from './useUnipileAccount';

export function useLinkedInMessages(contact, { enabled }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const { getAccountId } = useUnipileAccount();

  useEffect(() => {
    if (!enabled || !contact.linkedin_url) return;
    setLoading(true);
    (async () => {
      try {
        const accountId = await getAccountId();
        if (!accountId) {
          setLoading(false);
          return;
        }

        const resolveResp = await fetch(
          `/api/unipile?action=resolve-user&account_id=${accountId}&linkedin_url=${encodeURIComponent(contact.linkedin_url)}`
        );
        const resolveData = await resolveResp.json();
        const providerId = resolveData.provider_id;
        if (!providerId) {
          setLoading(false);
          return;
        }

        const chatsResp = await fetch(
          `/api/unipile?action=get-chats&account_id=${accountId}&limit=50`
        );
        const chatsData = await chatsResp.json();
        const chats = chatsData.data?.items || [];
        const matchedChat = chats.find((c) => c.attendee_provider_id === providerId);

        if (matchedChat) {
          const msgsResp = await fetch(
            `/api/unipile?action=get-messages&chat_id=${matchedChat.id}`
          );
          const msgsData = await msgsResp.json();
          setMessages(msgsData.data?.items || msgsData.data || []);
        }
      } catch (e) {
        console.error('LinkedIn messages error:', e);
      }
      setLoading(false);
    })();
  }, [enabled, contact.linkedin_url, getAccountId]);

  return { messages, loading };
}
