import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { useUnipileAccount } from './useUnipileAccount';
import { apiFetch } from '../lib/apiFetch';

const emptyForm = { author_name: '', content: '', post_url: '', post_date: '', tags: '' };

export function useLinkedInPosts(account, contacts, { enabled }) {
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [showAddPost, setShowAddPost] = useState(false);
  const [postForm, setPostForm] = useState(emptyForm);
  const [savingPost, setSavingPost] = useState(false);
  const [fetchedPosts, setFetchedPosts] = useState([]);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [hasFetched, setHasFetched] = useState(false);
  const { getAccountId } = useUnipileAccount();

  const loadPosts = useCallback(async () => {
    setPostsLoading(true);
    const { data } = await supabase
      .from('linkedin_posts')
      .select('*')
      .eq('company_id', account.id)
      .order('post_date', { ascending: false, nullsFirst: false });
    setPosts(data || []);
    setPostsLoading(false);
  }, [account.id]);

  useEffect(() => {
    if (enabled) loadPosts();
  }, [enabled, loadPosts]);

  const fetchPosts = useCallback(async () => {
    setFetching(true);
    setFetchError(null);
    try {
      const accountId = await getAccountId();
      if (!accountId) throw new Error('No LinkedIn account connected in Unipile');

      const allPosts = [];

      if (account.linkedin_url) {
        try {
          const resp = await apiFetch(
            `/api/unipile?action=get-posts&account_id=${encodeURIComponent(accountId)}&linkedin_url=${encodeURIComponent(account.linkedin_url)}`
          );
          const data = await resp.json();
          if (data.success) {
            const items = data.data?.items || data.data || [];
            const list = (Array.isArray(items) ? items : []).map((p) => ({
              ...p,
              _contactName: account.name,
              _isCompanyPost: true,
            }));
            allPosts.push(...list);
          }
        } catch {
          /* skip */
        }
      }

      const contactsAtCompany = contacts.filter(
        (c) => c.accountId === account.id && c.linkedin_url
      );
      for (const contact of contactsAtCompany.slice(0, 3)) {
        try {
          const resp = await apiFetch(
            `/api/unipile?action=get-posts&account_id=${encodeURIComponent(accountId)}&linkedin_url=${encodeURIComponent(contact.linkedin_url)}`
          );
          const data = await resp.json();
          if (data.success) {
            const items = data.data?.items || data.data || [];
            const list = (Array.isArray(items) ? items : []).map((p) => ({
              ...p,
              _contactName: contact.name,
              _isCompanyPost: false,
            }));
            allPosts.push(...list);
          }
        } catch {
          /* skip */
        }
      }

      // Keep only original posts from the last 2 months — drops reposts/reshares
      // and old activity that's no longer relevant for outreach.
      const cutoffMs = Date.now() - 60 * 24 * 60 * 60 * 1000;
      const filtered = allPosts.filter((p) => {
        if (p.is_repost) return false;
        const ts = p.parsed_datetime ? new Date(p.parsed_datetime).getTime() : 0;
        return ts >= cutoffMs;
      });
      filtered.sort((a, b) =>
        (b.parsed_datetime || b.date || b.timestamp || b.created_at || '').localeCompare(
          a.parsed_datetime || a.date || a.timestamp || a.created_at || ''
        )
      );
      setFetchedPosts(filtered);
      setHasFetched(true);

      for (const post of filtered) {
        const postUrl = post.share_url || post.url || post.post_url || '';
        const postText = post.text || post.content || '';
        if (!postText) continue;
        try {
          if (postUrl) {
            const { data: existing } = await supabase
              .from('linkedin_posts')
              .select('id')
              .eq('post_url', postUrl)
              .eq('company_id', account.id)
              .limit(1);
            if (existing?.length > 0) continue;
          }
          await supabase.from('linkedin_posts').insert({
            company_id: account.id,
            author_name: post._contactName || post.author?.name || '',
            content: postText,
            post_url: postUrl || null,
            post_date:
              post.date || post.parsed_datetime || new Date().toISOString().split('T')[0],
            tags: null,
            added_by: 'unipile',
          });
        } catch {
          /* skip duplicates */
        }
      }

      const { data: refreshed } = await supabase
        .from('linkedin_posts')
        .select('*')
        .eq('company_id', account.id)
        .order('post_date', { ascending: false, nullsFirst: false });
      setPosts(refreshed || []);

      if (allPosts.length === 0 && contactsAtCompany.length === 0) {
        setFetchError(
          'No contacts with LinkedIn URLs found for this company. Add LinkedIn URLs to contacts first.'
        );
      }
    } catch (e) {
      console.error('LinkedIn fetch error:', e);
      setFetchError(e.message);
    }
    setFetching(false);
  }, [account.id, account.linkedin_url, account.name, contacts, getAccountId]);

  const addPost = useCallback(async () => {
    if (!postForm.content.trim()) return;
    setSavingPost(true);
    await supabase.from('linkedin_posts').insert({
      company_id: account.id,
      author_name: postForm.author_name || null,
      content: postForm.content,
      post_url: postForm.post_url || null,
      post_date: postForm.post_date || new Date().toISOString().split('T')[0],
      tags: postForm.tags || null,
      added_by: 'manual',
    });
    setPostForm(emptyForm);
    setShowAddPost(false);
    setSavingPost(false);
    await loadPosts();
  }, [postForm, account.id, loadPosts]);

  return {
    posts,
    postsLoading,
    fetchedPosts,
    fetching,
    fetchError,
    hasFetched,
    showAddPost,
    setShowAddPost,
    postForm,
    setPostForm,
    savingPost,
    fetchPosts,
    addPost,
  };
}
