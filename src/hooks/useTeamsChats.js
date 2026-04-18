import { useState, useEffect, useCallback } from 'react';
import { getMyChats, getChatMessages } from '../lib/graph';

export function useTeamsChats(contact, { enabled }) {
  const [chats, setChats] = useState([]);
  const [chatsLoading, setChatsLoading] = useState(false);
  const [chatsError, setChatsError] = useState(null);
  const [selectedChat, setSelectedChat] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatMessagesLoading, setChatMessagesLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    if (!localStorage.getItem('graph_token')) {
      setChatsError('auth');
      setChats([]);
      return;
    }
    setChatsLoading(true);
    setChatsError(null);
    setSelectedChat(null);
    setChatMessages([]);
    getMyChats(50).then((result) => {
      if (!localStorage.getItem('graph_token')) {
        setChatsError('auth');
        setChats([]);
      } else {
        const contactName = (contact.name || '').toLowerCase();
        const contactFirst = contactName.split(' ')[0];
        const filtered = (result || []).filter((c) =>
          (c.members || []).some((m) => {
            const mn = (m || '').toLowerCase();
            return (
              mn === contactName ||
              mn.includes(contactName) ||
              contactName.includes(mn) ||
              mn.includes(contactFirst)
            );
          })
        );
        setChats(filtered);
      }
      setChatsLoading(false);
    });
  }, [enabled, contact.name]);

  useEffect(() => {
    if (!selectedChat) return;
    setChatMessagesLoading(true);
    getChatMessages(selectedChat.id, 20).then((result) => {
      setChatMessages(result || []);
      setChatMessagesLoading(false);
    });
  }, [selectedChat]);

  const backToChats = useCallback(() => {
    setSelectedChat(null);
    setChatMessages([]);
  }, []);

  return {
    chats,
    chatsLoading,
    chatsError,
    selectedChat,
    setSelectedChat,
    chatMessages,
    chatMessagesLoading,
    backToChats,
  };
}
