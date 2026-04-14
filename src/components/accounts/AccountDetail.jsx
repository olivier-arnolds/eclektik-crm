import { useState, useEffect } from 'react';
import { typeColors, fmt } from '../../lib/constants';
import { updateRow } from '../../hooks/useSupabase';
import { supabase } from '../../supabase';
import { getMyTeams, getTeamChannels, getChannelMessages } from '../../lib/graph';
import Chip from '../atoms/Chip';
import Avatar from '../atoms/Avatar';
import Btn from '../atoms/Btn';
import Empty from '../atoms/Empty';
import ItemCard from '../cards/ItemCard';

// Compact inline row editor
function PostText({ text }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > 300;
  return (
    <div>
      <div style={{ fontSize: 12, color: "#2C2C2A", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
        {isLong && !expanded ? text.substring(0, 300) + '...' : text}
      </div>
      {isLong && (
        <button onClick={() => setExpanded(!expanded)}
          style={{ background: "none", border: "none", color: "#378ADD", fontSize: 11, cursor: "pointer", padding: "4px 0", fontFamily: "inherit" }}>
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
}

function FieldRow({ label, value, field, accountId, refetch, companyName, dropdown }) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');
  const [displayValue, setDisplayValue] = useState(value);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setDisplayValue(editValue);
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
    await updateRow('companies', accountId, { [field]: editValue || null });
  };

  const isLinkedIn = field === 'linkedin_url';
  const labelClick = isLinkedIn && companyName ? () => {
    const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
    window.open(`https://www.linkedin.com/company/${slug}`, '_blank');
  } : undefined;

  return (
    <div style={{ display:"flex", alignItems:"center", padding:"5px 0", borderBottom:"0.5px solid #F1EFE8" }}>
      <div onClick={labelClick}
        style={{ width:130, flexShrink:0, fontSize:11, fontWeight:500, color:isLinkedIn?"#378ADD":"#888780", cursor:isLinkedIn?"pointer":"default" }}>
        {label}{isLinkedIn ? ' ↗' : ''}
      </div>
      <div style={{ flex:1 }}>
        {editing ? (
          <div style={{ display:"flex", gap:4 }}>
            {dropdown ? (
              <select autoFocus value={editValue} onChange={e => setEditValue(e.target.value)}
                onBlur={save} onKeyDown={e => { if (e.key==='Escape') { setEditing(false); setEditValue(displayValue||''); } }}
                style={{ flex:1, padding:"3px 6px", borderRadius:4, border:"0.5px solid #378ADD", fontSize:12, fontFamily:"inherit", outline:"none", background:"#fff" }}>
                {dropdown.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)}
                onKeyDown={e => { if (e.key==='Enter') save(); if (e.key==='Escape') { setEditing(false); setEditValue(displayValue||''); } }}
                onBlur={save}
                style={{ flex:1, padding:"3px 6px", borderRadius:4, border:"0.5px solid #378ADD", fontSize:12, fontFamily:"inherit", outline:"none" }} />
            )}
          </div>
        ) : (
          <div onClick={() => { setEditing(true); setEditValue(displayValue||''); }}
            style={{ fontSize:12, cursor:"pointer", color:(displayValue && displayValue !== 'null') ? "#2C2C2A" : "#B4B2A9", minHeight:18 }}
            onMouseEnter={e => e.currentTarget.style.background="#FAFAF8"}
            onMouseLeave={e => e.currentTarget.style.background="transparent"}>
            {saved ? <span style={{ color:"#1D9E75", fontSize:11 }}>✓</span> : ((displayValue && displayValue !== 'null') ? String(displayValue) : '—')}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AccountDetail({ account, onBack, onSelectItem, onSelectContact, allItems, accounts, contacts, followUps, refetch }) {
  const [tab, setTab] = useState("details");
  const tc = typeColors[account.type]||typeColors.Klant;
  const accC = contacts.filter(c => c.accountId===account.id).sort((a,b)=>a.name.localeCompare(b.name));
  const accL = allItems.filter(i => i.funnelStage==='lead' && (i.accountId===account.id||(i.partnerIds||[]).includes(account.id)));
  const accO = allItems.filter(i => i.funnelStage==='opportunity' && (i.accountId===account.id||(i.partnerIds||[]).includes(account.id)));
  const accP = allItems.filter(i => ['onboarding','active','inactive','past'].includes(i.funnelStage) && (i.accountId===account.id||(i.partnerIds||[]).includes(account.id)));

  // Teams state
  const [teams, setTeams] = useState([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [teamsError, setTeamsError] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [channels, setChannels] = useState([]);
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  // Pinned channels state
  const [pinnedChannels, setPinnedChannels] = useState([]);
  const [pinnedLoading, setPinnedLoading] = useState(false);
  const [showAddChannel, setShowAddChannel] = useState(false);
  const [addStep, setAddStep] = useState('teams'); // 'teams' | 'channels'
  const [viewingPinnedMessages, setViewingPinnedMessages] = useState(null); // pinned channel being viewed

  const fetchPinnedChannels = async () => {
    setPinnedLoading(true);
    const { data } = await supabase.from('company_channels').select('*').eq('company_id', account.id).eq('pinned', true);
    setPinnedChannels(data || []);
    setPinnedLoading(false);
  };

  useEffect(() => {
    if (tab === 'teams') {
      fetchPinnedChannels();
    }
  }, [tab, account.id]);

  const unpinChannel = async (channelRecord) => {
    await supabase.from('company_channels').update({ pinned: false }).eq('id', channelRecord.id);
    setPinnedChannels(prev => prev.filter(c => c.id !== channelRecord.id));
  };

  const startAddChannel = async () => {
    setShowAddChannel(true);
    setAddStep('teams');
    setSelectedTeam(null);
    setChannels([]);
    setTeamsLoading(true);
    setTeamsError(null);
    const result = await getMyTeams();
    if (result === null && !localStorage.getItem('graph_token')) {
      setTeamsError('auth');
    }
    setTeams(result || []);
    setTeamsLoading(false);
  };

  const selectTeamForAdd = async (team) => {
    setSelectedTeam(team);
    setAddStep('channels');
    setChannelsLoading(true);
    const result = await getTeamChannels(team.id);
    setChannels(result || []);
    setChannelsLoading(false);
  };

  const addChannelToCompany = async (channel) => {
    await supabase.from('company_channels').insert({
      company_id: account.id,
      channel_id: channel.id,
      channel_name: channel.displayName,
      team_name: selectedTeam.displayName,
      channel_type: 'teams',
      pinned: true,
    });
    setShowAddChannel(false);
    setSelectedTeam(null);
    setChannels([]);
    fetchPinnedChannels();
  };

  const viewPinnedMessages = async (pinnedChannel) => {
    setViewingPinnedMessages(pinnedChannel);
    setMessagesLoading(true);
    // We need the team id to fetch messages; find the team or use a stored reference
    // getChannelMessages needs (teamId, channelId) — fetch teams to find the right one
    const allTeams = await getMyTeams();
    const team = (allTeams || []).find(t => t.displayName === pinnedChannel.team_name);
    if (team) {
      const result = await getChannelMessages(team.id, pinnedChannel.channel_id, 20);
      setMessages(result || []);
    } else {
      setMessages([]);
    }
    setMessagesLoading(false);
  };

  // Insights state
  const [insights, setInsights] = useState([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedModel, setSelectedModel] = useState('sonnet');

  useEffect(() => {
    if (tab === 'insights') {
      setInsightsLoading(true);
      supabase.from('company_insights')
        .select('*')
        .eq('company_id', account.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          setInsights(data || []);
          setInsightsLoading(false);
        });
    }
  }, [tab, account.id]);

  const generateInsight = async () => {
    setGenerating(true);
    try {
      const resp = await fetch('/api/company-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: account.id, model: selectedModel }),
      });
      const data = await resp.json();
      if (data.success && data.insight) {
        setInsights(prev => [data.insight, ...prev]);
      }
    } catch (e) {
      console.error('Insight generation error:', e);
    }
    setGenerating(false);
  };

  // LinkedIn contact search state
  const [showContactSearch, setShowContactSearch] = useState(false);
  const [contactSearchKeywords, setContactSearchKeywords] = useState('');
  const [contactSearchResults, setContactSearchResults] = useState([]);
  const [contactSearching, setContactSearching] = useState(false);
  const [contactSearchError, setContactSearchError] = useState(null);
  const [savingContact, setSavingContact] = useState(null);
  const [savedContacts, setSavedContacts] = useState({});
  const [searchCursor, setSearchCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cachedAccountId, setCachedAccountId] = useState(null);

  const getUnipileAccountId = async () => {
    if (cachedAccountId) return cachedAccountId;
    const accResp = await fetch('/api/unipile?action=list-accounts');
    const accData = await accResp.json();
    if (!accData.success || !accData.data?.items?.length) throw new Error('No LinkedIn account connected');
    const liAcc = accData.data.items.find(a => (a.account_type || a.type || '').toUpperCase().includes('LINKEDIN')) || accData.data.items[0];
    setCachedAccountId(liAcc.id);
    return liAcc.id;
  };

  const searchLinkedInContacts = async (loadMore = false) => {
    if (loadMore) setLoadingMore(true);
    else { setContactSearching(true); setContactSearchResults([]); setSearchCursor(null); }
    setContactSearchError(null);
    try {
      const accountId = await getUnipileAccountId();
      const body = { account_id: accountId, company: account.name, keywords: contactSearchKeywords, linkedin_url: account.linkedin_url };
      if (loadMore && searchCursor) body.cursor = searchCursor;
      const resp = await fetch('/api/unipile?action=search-people', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await resp.json();
      if (data.success) {
        const items = data.data?.items || data.data || [];
        const newItems = Array.isArray(items) ? items : [];
        setContactSearchResults(prev => loadMore ? [...prev, ...newItems] : newItems);
        setSearchCursor(data.data?.cursor || null);
      } else {
        setContactSearchError(data.error || 'Search failed');
      }
    } catch (e) {
      setContactSearchError(e.message);
    }
    setContactSearching(false);
    setLoadingMore(false);
  };

  const addContactToCRM = async (person) => {
    const personId = person.id || person.provider_id || Math.random().toString();
    setSavingContact(personId);
    try {
      const rawUrl = person.public_profile_url || person.linkedin_url || (person.public_identifier ? `https://www.linkedin.com/in/${person.public_identifier}` : '');
      // Clean LinkedIn URL: remove everything after ? (tracking params)
      const linkedinUrl = rawUrl.split('?')[0].replace(/\/$/, '');
      const fullName = person.name || `${person.first_name || ''} ${person.last_name || ''}`.trim();
      const firstName = person.first_name || fullName.split(' ')[0] || '';
      const lastName = person.last_name || fullName.split(' ').slice(1).join(' ') || '';
      await supabase.from('contacts').insert({
        full_name: fullName,
        first_name: firstName,
        last_name: lastName,
        title: person.headline || person.title || '',
        company_id: account.id,
        company_name: account.name,
        linkedin_url: linkedinUrl,
        source: 'LinkedIn Search',
        stage: 'Active',
        owner: 'MVG',
      });
      setSavedContacts(prev => ({ ...prev, [personId]: true }));
      if (refetch) refetch();
    } catch (e) {
      console.error('Save contact error:', e);
    }
    setSavingContact(null);
  };

  // LinkedIn posts state
  const [liPosts, setLiPosts] = useState([]);
  const [liPostsLoading, setLiPostsLoading] = useState(false);
  const [showAddPost, setShowAddPost] = useState(false);
  const [postForm, setPostForm] = useState({ author_name:'', content:'', post_url:'', post_date:'', tags:'' });
  const [savingPost, setSavingPost] = useState(false);

  // Fetched LinkedIn posts (from Unipile API)
  const [fetchedPosts, setFetchedPosts] = useState([]);
  const [fetchingPosts, setFetchingPosts] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [hasFetched, setHasFetched] = useState(false);

  // Comments & reactions state
  const [expandedComments, setExpandedComments] = useState({});
  const [expandedReactions, setExpandedReactions] = useState({});
  const [postComments, setPostComments] = useState({});
  const [postReactions, setPostReactions] = useState({});
  const [loadingComments, setLoadingComments] = useState({});
  const [loadingReactions, setLoadingReactions] = useState({});

  const toggleComments = async (postId) => {
    if (expandedComments[postId]) {
      setExpandedComments(prev => ({ ...prev, [postId]: false }));
      return;
    }
    setExpandedComments(prev => ({ ...prev, [postId]: true }));
    if (postComments[postId]) return;
    setLoadingComments(prev => ({ ...prev, [postId]: true }));
    try {
      const accountId = await getUnipileAccountId();
      const resp = await fetch(`/api/unipile?action=get-comments&post_id=${encodeURIComponent(postId)}&account_id=${encodeURIComponent(accountId)}`);
      const data = await resp.json();
      const items = data.data?.items || data.data || [];
      setPostComments(prev => ({ ...prev, [postId]: Array.isArray(items) ? items : [] }));
    } catch (e) {
      setPostComments(prev => ({ ...prev, [postId]: [] }));
    }
    setLoadingComments(prev => ({ ...prev, [postId]: false }));
  };

  const toggleReactions = async (postId) => {
    if (expandedReactions[postId]) {
      setExpandedReactions(prev => ({ ...prev, [postId]: false }));
      return;
    }
    setExpandedReactions(prev => ({ ...prev, [postId]: true }));
    if (postReactions[postId]) return;
    setLoadingReactions(prev => ({ ...prev, [postId]: true }));
    try {
      const accountId = await getUnipileAccountId();
      const resp = await fetch(`/api/unipile?action=get-reactions&post_id=${encodeURIComponent(postId)}&account_id=${encodeURIComponent(accountId)}`);
      const data = await resp.json();
      const items = data.data?.items || data.data || [];
      setPostReactions(prev => ({ ...prev, [postId]: Array.isArray(items) ? items : [] }));
    } catch (e) {
      setPostReactions(prev => ({ ...prev, [postId]: [] }));
    }
    setLoadingReactions(prev => ({ ...prev, [postId]: false }));
  };

  const fetchLinkedInPosts = async () => {
    setFetchingPosts(true);
    setFetchError(null);
    try {
      // Step 1: Get the Unipile LinkedIn account ID
      const accResp = await fetch('/api/unipile?action=list-accounts');
      const accData = await accResp.json();
      if (!accData.success || !accData.data?.items?.length) {
        throw new Error('No LinkedIn account connected in Unipile');
      }
      const linkedinAcc = accData.data.items.find(a => a.account_type === 'LINKEDIN' || a.type === 'LINKEDIN') || accData.data.items[0];
      const accountId = linkedinAcc.id;

      const allPosts = [];

      // Step 2a: Fetch company page posts (if LinkedIn URL available)
      if (account.linkedin_url) {
        try {
          const postsResp = await fetch(`/api/unipile?action=get-posts&account_id=${encodeURIComponent(accountId)}&linkedin_url=${encodeURIComponent(account.linkedin_url)}`);
          const postsData = await postsResp.json();
          if (postsData.success) {
            const items = postsData.data?.items || postsData.data || [];
            const posts = (Array.isArray(items) ? items : []).map(p => ({ ...p, _contactName: account.name, _isCompanyPost: true }));
            allPosts.push(...posts);
          }
        } catch (e) { /* skip */ }
      }

      // Step 2b: Also fetch posts from key contacts at this company
      const contactsAtCompany = contacts.filter(c => c.accountId === account.id && c.linkedin_url);
      for (const contact of contactsAtCompany.slice(0, 3)) {
        try {
          const postsResp = await fetch(`/api/unipile?action=get-posts&account_id=${encodeURIComponent(accountId)}&linkedin_url=${encodeURIComponent(contact.linkedin_url)}`);
          const postsData = await postsResp.json();
          if (postsData.success) {
            const items = postsData.data?.items || postsData.data || [];
            const posts = (Array.isArray(items) ? items : []).map(p => ({ ...p, _contactName: contact.name, _isCompanyPost: false }));
            allPosts.push(...posts);
          }
        } catch (e) { /* skip */ }
      }

      // Sort by date, newest first
      allPosts.sort((a, b) => (b.date || b.timestamp || b.created_at || '').localeCompare(a.date || a.timestamp || a.created_at || ''));
      setFetchedPosts(allPosts);
      setHasFetched(true);

      // Save fetched posts to Supabase (upsert by share_url to avoid duplicates)
      for (const post of allPosts) {
        const postUrl = post.share_url || post.url || post.post_url || '';
        const postText = post.text || post.content || '';
        if (!postText) continue;
        try {
          // Check if post already exists (by post_url)
          if (postUrl) {
            const { data: existing } = await supabase.from('linkedin_posts').select('id').eq('post_url', postUrl).eq('company_id', account.id).limit(1);
            if (existing?.length > 0) continue;
          }
          await supabase.from('linkedin_posts').insert({
            company_id: account.id,
            author_name: post._contactName || post.author?.name || '',
            content: postText,
            post_url: postUrl || null,
            post_date: post.date || post.parsed_datetime || new Date().toISOString().split('T')[0],
            tags: null,
            added_by: 'unipile',
          });
        } catch (e) { /* skip duplicates */ }
      }

      // Refresh manual posts list to include newly saved ones
      const { data: refreshed } = await supabase.from('linkedin_posts').select('*').eq('company_id', account.id).order('post_date', { ascending: false, nullsFirst: false });
      setLiPosts(refreshed || []);

      if (allPosts.length === 0 && contactsAtCompany.length === 0) {
        setFetchError('No contacts with LinkedIn URLs found for this company. Add LinkedIn URLs to contacts first.');
      }
    } catch (e) {
      console.error('LinkedIn fetch error:', e);
      setFetchError(e.message);
    }
    setFetchingPosts(false);
  };

  useEffect(() => {
    if (tab === 'linkedin') {
      setLiPostsLoading(true);
      supabase.from('linkedin_posts')
        .select('*')
        .eq('company_id', account.id)
        .order('post_date', { ascending: false, nullsFirst: false })
        .then(({ data }) => {
          setLiPosts(data || []);
          setLiPostsLoading(false);
        });
    }
  }, [tab, account.id]);

  const addPost = async () => {
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
    setPostForm({ author_name:'', content:'', post_url:'', post_date:'', tags:'' });
    setShowAddPost(false);
    setSavingPost(false);
    // Refetch
    const { data } = await supabase.from('linkedin_posts').select('*').eq('company_id', account.id).order('post_date', { ascending: false, nullsFirst: false });
    setLiPosts(data || []);
  };

  const tabs = [{key:"details",label:"Details"},{key:"leads",label:`Leads${accL.length?` (${accL.length})`:""}`},{key:"opps",label:`Opps${accO.length?` (${accO.length})`:""}`},{key:"projects",label:`Projects${accP.length?` (${accP.length})`:""}`},{key:"contacts",label:`Contacts${accC.length?` (${accC.length})`:""}`},{key:"linkedin",label:`LinkedIn${liPosts.length?` (${liPosts.length})`:""}`},{key:"insights",label:"Insights"},{key:"teams",label:"Teams"}];

  const fieldGroups = [
    { title: "General", fields: [
      { label:"Company name", field:"name", value:account.name },
      { label:"Type", field:"type", value:account.type, dropdown:["Customer","Prospect","Partner","Friend","Klant","Big Four"] },
      { label:"Industry", field:"industry", value:account.industry },
      { label:"Sub Industry", field:"sub_industry", value:account.sub_industry },
      { label:"Specialities", field:"specialities", value:account.specialities },
      { label:"Website", field:"website", value:account.website },
      { label:"LinkedIn", field:"linkedin_url", value:account.linkedin_url },
      { label:"Owner", field:"owner", value:account.owner },
    ]},
    { title: "Contact", fields: [
      { label:"Phone", field:"phone", value:account.phone },
      { label:"Email", field:"email", value:account.email },
      { label:"Primary contact", field:"primary_contact", value:account.primary_contact, dropdown: ['', ...accC.map(c => c.name)] },
      { label:"Address", field:"address", value:account.address },
      { label:"Country", field:"country", value:account.country },
    ]},
    { title: "Financial", fields: [
      { label:"Employees", field:"employee_count", value:account.employee_count },
      { label:"Employee Range", field:"size", value:account.size },
      { label:"Annual revenue", field:"annual_revenue", value:account.annual_revenue },
      { label:"Currency", field:"currency", value:account.currency },
    ]},
    { title: "Other", fields: [
      { label:"Parent company", field:"parent_account", value:account.parent_account },
      { label:"Founded", field:"founded_year", value:account.founded_year },
      { label:"Description", field:"description", value:account.description },
    ]},
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      <div style={{ background:"#FFFFFF", borderBottom:"0.5px solid #D3D1C7", padding:"12px 18px 0", flexShrink:0 }}>
        <button onClick={onBack} style={{ background:"none", border:"none", cursor:"pointer", fontSize:12, color:"#888780", fontFamily:"inherit", padding:0, marginBottom:10 }}>← all accounts</button>
        <div style={{ display:"flex", gap:12, paddingBottom:12 }}>
          <div style={{ width:44, height:44, borderRadius:10, background:account.avatarBg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>{account.flag}</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:16, fontWeight:500 }}>{account.name}</div>
            <div style={{ display:"flex", gap:5, marginTop:5, flexWrap:"wrap" }}>
              <Chip bg={tc.bg} color={tc.color}>{account.type}</Chip>
              {account.country && <Chip>{account.country}</Chip>}
              {account.industry && <Chip>{account.industry}</Chip>}
              <Chip>Since {account.since}</Chip>
            </div>
          </div>
          {account.linkedin_url && (
            <Btn small onClick={() => window.open(account.linkedin_url, '_blank')}>in LinkedIn</Btn>
          )}
        </div>
        <div style={{ display:"flex", borderTop:"0.5px solid #D3D1C7", marginLeft:-18, marginRight:-18, paddingLeft:18 }}>
          {tabs.map(t => <button key={t.key} onClick={() => setTab(t.key)} style={{ padding:"8px 12px", fontSize:12, cursor:"pointer", background:"transparent", border:"none", borderBottom:tab===t.key?"2px solid #378ADD":"2px solid transparent", color:tab===t.key?"#2C2C2A":"#888780", fontWeight:tab===t.key?500:400, fontFamily:"inherit", whiteSpace:"nowrap" }}>{t.label}</button>)}
        </div>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"16px 18px" }}>
        {tab==="details" && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            {fieldGroups.map(group => (
              <div key={group.title} style={{ background:"#FFFFFF", borderRadius:8, border:"0.5px solid #D3D1C7", padding:"10px 14px" }}>
                <div style={{ fontSize:10, fontWeight:600, color:"#5F5E5A", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6, paddingBottom:4, borderBottom:"0.5px solid #D3D1C7" }}>{group.title}</div>
                {group.fields.map(f => (
                  <FieldRow key={f.field} label={f.label} value={f.value} field={f.field} accountId={account.id} refetch={refetch} companyName={account.name} dropdown={f.dropdown} />
                ))}
              </div>
            ))}
          </div>
        )}
        {tab==="leads"    && (accL.length===0?<Empty text="No leads."/>:accL.map(i=><ItemCard key={i.id} item={i} onClick={onSelectItem} accounts={accounts} contacts={contacts} followUps={followUps}/>))}
        {tab==="opps"     && (accO.length===0?<Empty text="No opportunities."/>:accO.map(i=><ItemCard key={i.id} item={i} onClick={onSelectItem} accounts={accounts} contacts={contacts} followUps={followUps}/>))}
        {tab==="projects" && (accP.length===0?<Empty text="No projects."/>:accP.map(i=><ItemCard key={i.id} item={i} onClick={onSelectItem} accounts={accounts} contacts={contacts} followUps={followUps}/>))}
        {tab==="contacts" && (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <div style={{ fontSize:12, color:"#888780" }}>{accC.length} contact{accC.length !== 1 ? 's' : ''}</div>
              <button onClick={() => setShowContactSearch(!showContactSearch)}
                style={{ padding:"6px 14px", borderRadius:7, border:"0.5px solid #0A66C2", fontSize:11, cursor:"pointer", background:"#fff", color:"#0A66C2", fontFamily:"inherit", fontWeight:500 }}>
                {showContactSearch ? 'Close search' : 'Find contacts on LinkedIn'}
              </button>
            </div>

            {showContactSearch && (
              <div style={{ background:"#FFFFFF", borderRadius:9, border:"0.5px solid #0A66C2", padding:14, marginBottom:12 }}>
                <div style={{ fontSize:12, fontWeight:500, marginBottom:4 }}>Search LinkedIn for contacts at {account.name}</div>
                <div style={{ fontSize:10, color:"#888780", marginBottom:8 }}>Company name is automatically included in the search</div>
                <div style={{ display:"flex", gap:8, marginBottom:10 }}>
                  <input value={contactSearchKeywords} onChange={e => setContactSearchKeywords(e.target.value)}
                    placeholder="Role filter (e.g. CTO, HR Director)"
                    onKeyDown={e => { if (e.key === 'Enter') searchLinkedInContacts(); }}
                    style={{ flex:1, padding:"7px 11px", borderRadius:7, border:"0.5px solid #D3D1C7", fontSize:12, fontFamily:"inherit", outline:"none" }} />
                  <button onClick={searchLinkedInContacts} disabled={contactSearching}
                    style={{ padding:"7px 16px", borderRadius:7, border:"none", fontSize:12, cursor:contactSearching?"wait":"pointer", background:"#042C53", color:"#B5D4F4", fontFamily:"inherit", fontWeight:500 }}>
                    {contactSearching ? 'Searching...' : 'Search'}
                  </button>
                </div>
                {contactSearchError && (
                  <div style={{ background:"#FFF5F5", border:"0.5px solid #E8A0A0", borderRadius:8, padding:"8px 12px", marginBottom:10, fontSize:11, color:"#A04040" }}>
                    {contactSearchError}
                  </div>
                )}
                {contactSearchResults.length > 0 && (
                  <div>
                    <div style={{ fontSize:10, fontWeight:600, color:"#5F5E5A", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>
                      {contactSearchResults.length} result{contactSearchResults.length !== 1 ? 's' : ''}
                    </div>
                    {contactSearchResults.map((person, idx) => {
                      const personId = person.id || person.provider_id || idx;
                      const fullName = person.name || `${person.first_name || ''} ${person.last_name || ''}`.trim();
                      const profileUrl = person.public_profile_url || person.linkedin_url || (person.public_identifier ? `https://www.linkedin.com/in/${person.public_identifier}` : '');
                      return (
                        <div key={personId} style={{ background:"#FAFAF8", borderRadius:8, border:"0.5px solid #D3D1C7", padding:"10px 14px", marginBottom:6, display:"flex", alignItems:"center", gap:12 }}>
                          <div style={{ width:36, height:36, borderRadius:8, background:"#E6F1FB", color:"#0C447C", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:500, flexShrink:0 }}>
                            {fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:13, fontWeight:500 }}>{fullName}</div>
                            {(person.headline || person.title) && <div style={{ fontSize:11, color:"#888780", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{person.headline || person.title}</div>}
                            {profileUrl && (
                              <a href={profileUrl} target="_blank" rel="noopener noreferrer"
                                style={{ fontSize:10, color:"#378ADD", textDecoration:"none" }}>View profile</a>
                            )}
                          </div>
                          {savedContacts[personId] ? (
                            <span style={{ fontSize:11, color:"#1D9E75", fontWeight:500 }}>Added</span>
                          ) : (
                            <button onClick={() => addContactToCRM(person)} disabled={savingContact === personId}
                              style={{ padding:"5px 12px", borderRadius:6, border:"none", fontSize:11, cursor:savingContact === personId?"wait":"pointer", background:"#042C53", color:"#B5D4F4", fontFamily:"inherit", fontWeight:500, whiteSpace:"nowrap" }}>
                              {savingContact === personId ? 'Adding...' : 'Add to CRM'}
                            </button>
                          )}
                        </div>
                      );
                    })}
                    {searchCursor && (
                      <button onClick={() => searchLinkedInContacts(true)} disabled={loadingMore}
                        style={{ width:"100%", padding:"8px", borderRadius:7, border:"0.5px solid #D3D1C7", fontSize:11, cursor:loadingMore?"wait":"pointer", background:"#fff", color:"#378ADD", fontFamily:"inherit", marginTop:8 }}>
                        {loadingMore ? 'Loading...' : 'Load more results'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {accC.length === 0 && !showContactSearch && <Empty text="No contacts." />}
            {accC.map(c => (
              <div key={c.id} onClick={() => onSelectContact && onSelectContact(c)}
                style={{ background:"#FFFFFF", borderRadius:8, border:"0.5px solid #D3D1C7", padding:"12px 14px", marginBottom:6, display:"flex", alignItems:"center", gap:12, cursor:"pointer" }}
                onMouseEnter={e => e.currentTarget.style.borderColor="#888780"}
                onMouseLeave={e => e.currentTarget.style.borderColor="#D3D1C7"}>
                <Avatar initials={c.initials} bg={c.avatarBg} color={c.avatarColor} size={36} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:500 }}>{c.name}</div>
                  <div style={{ fontSize:11, color:"#888780" }}>{c.role} · {c.email}</div>
                  {c.source && <div style={{ fontSize:10, color:"#378ADD", marginTop:2 }}>Met at: {c.source}</div>}
                </div>
                <div style={{ color:"#B4B2A9", fontSize:16 }}>›</div>
              </div>
            ))}
          </div>
        )}

        {tab==="linkedin" && (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <div style={{ fontSize:12, color:"#888780" }}>
                {liPosts.length} post{liPosts.length !== 1 ? 's' : ''} saved
                {fetchedPosts.length > 0 && ` · ${fetchedPosts.length} fetched from LinkedIn`}
              </div>
              <div style={{ display:"flex", gap:6 }}>
                {account.linkedin_url && (
                  <button onClick={() => { const url = account.linkedin_url.replace(/\/$/, ''); window.open(url + '/posts/?feedView=all', '_blank'); }}
                    style={{ padding:"6px 12px", borderRadius:7, border:"0.5px solid #D3D1C7", fontSize:11, cursor:"pointer", background:"#fff", color:"#0C447C", fontFamily:"inherit" }}>
                    Open LinkedIn posts
                  </button>
                )}
                <button onClick={fetchLinkedInPosts} disabled={fetchingPosts}
                  style={{ padding:"6px 12px", borderRadius:7, border:"0.5px solid #0A66C2", fontSize:11, cursor:fetchingPosts?"wait":"pointer", background:"#fff", color:"#0A66C2", fontFamily:"inherit", fontWeight:500 }}>
                  {fetchingPosts ? 'Fetching...' : hasFetched ? 'Refresh' : 'Fetch contact posts'}
                </button>
                <button onClick={() => setShowAddPost(true)}
                  style={{ padding:"6px 12px", borderRadius:7, border:"none", fontSize:11, cursor:"pointer", background:"#042C53", color:"#B5D4F4", fontFamily:"inherit", fontWeight:500 }}>
                  + Add post
                </button>
              </div>
            </div>

            {fetchError && (
              <div style={{ background:"#FFF5F5", border:"0.5px solid #E8A0A0", borderRadius:8, padding:"8px 12px", marginBottom:10, fontSize:11, color:"#A04040" }}>
                Failed to fetch posts: {fetchError}
              </div>
            )}

            {showAddPost && (
              <div style={{ background:"#FFFFFF", borderRadius:9, border:"0.5px solid #378ADD", padding:14, marginBottom:12 }}>
                <div style={{ fontSize:12, fontWeight:500, marginBottom:10 }}>New LinkedIn post</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
                  <input value={postForm.author_name} onChange={e => setPostForm(p => ({...p, author_name:e.target.value}))}
                    placeholder="Author (name)" style={{ padding:"6px 10px", borderRadius:6, border:"0.5px solid #D3D1C7", fontSize:12, fontFamily:"inherit", outline:"none" }} />
                  <input type="date" value={postForm.post_date} onChange={e => setPostForm(p => ({...p, post_date:e.target.value}))}
                    style={{ padding:"6px 10px", borderRadius:6, border:"0.5px solid #D3D1C7", fontSize:12, fontFamily:"inherit", outline:"none" }} />
                </div>
                <textarea value={postForm.content} onChange={e => setPostForm(p => ({...p, content:e.target.value}))}
                  placeholder="Post content / summary..." rows={4}
                  style={{ width:"100%", padding:"6px 10px", borderRadius:6, border:"0.5px solid #D3D1C7", fontSize:12, fontFamily:"inherit", outline:"none", resize:"vertical", marginBottom:8, boxSizing:"border-box" }} />
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:10 }}>
                  <input value={postForm.post_url} onChange={e => setPostForm(p => ({...p, post_url:e.target.value}))}
                    placeholder="LinkedIn URL (optional)" style={{ padding:"6px 10px", borderRadius:6, border:"0.5px solid #D3D1C7", fontSize:12, fontFamily:"inherit", outline:"none" }} />
                  <input value={postForm.tags} onChange={e => setPostForm(p => ({...p, tags:e.target.value}))}
                    placeholder="Tags: e.g. AI, hiring, partnership" style={{ padding:"6px 10px", borderRadius:6, border:"0.5px solid #D3D1C7", fontSize:12, fontFamily:"inherit", outline:"none" }} />
                </div>
                <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
                  <button onClick={() => { setShowAddPost(false); setPostForm({ author_name:'', content:'', post_url:'', post_date:'', tags:'' }); }}
                    style={{ padding:"6px 14px", borderRadius:6, border:"0.5px solid #D3D1C7", fontSize:11, cursor:"pointer", background:"#fff", color:"#888780", fontFamily:"inherit" }}>Cancel</button>
                  <button onClick={addPost} disabled={savingPost || !postForm.content.trim()}
                    style={{ padding:"6px 14px", borderRadius:6, border:"none", fontSize:11, cursor:postForm.content.trim()?"pointer":"not-allowed", background:postForm.content.trim()?"#042C53":"#D3D1C7", color:postForm.content.trim()?"#B5D4F4":"#888780", fontFamily:"inherit", fontWeight:500 }}>
                    {savingPost ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            )}

            {/* Fetched LinkedIn posts (from Unipile API) */}
            {fetchedPosts.length > 0 && (
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:10, fontWeight:600, color:"#5F5E5A", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>Fetched from LinkedIn</div>
                {fetchedPosts.map((post, idx) => {
                  const text = post.text || post.content || post.commentary || '';
                  const authorName = post._contactName || post.author?.name || post.author_name || (post.author?.first_name ? `${post.author?.first_name || ''} ${post.author?.last_name || ''}`.trim() : '');
                  const postDate = post.created_at || post.date || post.published_at;
                  const likes = post.likes_count ?? post.reactions_count ?? post.num_likes;
                  const comments = post.comments_count ?? post.num_comments;
                  const postUrl = post.url || post.post_url || post.share_url;
                  return (
                    <div key={post.id || idx} style={{ background:"#FFFFFF", borderRadius:9, border:"0.5px solid #D3D1C7", padding:"12px 14px", marginBottom:8 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <span style={{ fontSize:9, padding:"2px 7px", borderRadius:10, background: post._isCompanyPost ? "#FAEEDA" : "#E6F1FB", color: post._isCompanyPost ? "#633806" : "#0A66C2", border:`0.5px solid ${post._isCompanyPost ? "#FAC775" : "#85B7EB"}`, fontWeight:600 }}>{post._isCompanyPost ? 'Company' : 'Contact'}</span>
                          {authorName && <span style={{ fontSize:12, fontWeight:500 }}>{authorName}</span>}
                          {postDate && <span style={{ fontSize:11, color:"#888780" }}>{new Date(postDate).toLocaleDateString('en', { day:'numeric', month:'short', year:'numeric' })}</span>}
                        </div>
                        {postUrl && (
                          <a href={postUrl} target="_blank" rel="noopener noreferrer"
                            style={{ fontSize:10, color:"#378ADD", textDecoration:"none" }}>Open ↗</a>
                        )}
                      </div>
                      {text && <PostText text={text} />}
                      {(likes != null || comments != null) && (
                        <div style={{ display:"flex", gap:12, marginTop:8, fontSize:11, color:"#888780" }}>
                          {likes != null && <span>{likes} like{likes !== 1 ? 's' : ''}</span>}
                          {comments != null && <span>{comments} comment{comments !== 1 ? 's' : ''}</span>}
                        </div>
                      )}
                      {/* Comments & Reactions links */}
                      {post.id && (
                        <div style={{ display:"flex", gap:12, marginTop:6, fontSize:11 }}>
                          <span onClick={() => toggleComments(post.id)}
                            style={{ cursor:"pointer", color:"#378ADD", userSelect:"none" }}>
                            {expandedComments[post.id] ? 'Hide comments' : '\uD83D\uDCAC Comments'}
                          </span>
                          <span onClick={() => toggleReactions(post.id)}
                            style={{ cursor:"pointer", color:"#378ADD", userSelect:"none" }}>
                            {expandedReactions[post.id] ? 'Hide reactions' : '\uD83D\uDC4D Reactions'}
                          </span>
                        </div>
                      )}
                      {/* Inline comments */}
                      {expandedComments[post.id] && (
                        <div style={{ marginTop:8, paddingTop:8, borderTop:"0.5px solid #F1EFE8" }}>
                          {loadingComments[post.id] ? (
                            <div style={{ fontSize:11, color:"#888780" }}>Loading comments...</div>
                          ) : (postComments[post.id] || []).length === 0 ? (
                            <div style={{ fontSize:11, color:"#888780" }}>No comments found.</div>
                          ) : (
                            (postComments[post.id] || []).map((c, ci) => (
                              <div key={ci} style={{ padding:"6px 0", borderBottom: ci < (postComments[post.id] || []).length - 1 ? "0.5px solid #F1EFE8" : "none" }}>
                                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:2 }}>
                                  <span style={{ fontSize:11, fontWeight:500 }}>{c.author?.name || c.author?.first_name || 'Unknown'}</span>
                                  <span style={{ fontSize:10, color:"#888780" }}>
                                    {(c.date || c.created_at) ? new Date(c.date || c.created_at).toLocaleDateString('en', { day:'numeric', month:'short' }) : ''}
                                  </span>
                                </div>
                                <div style={{ fontSize:11, color:"#4A4A47", lineHeight:1.4 }}>{c.text || c.content || c.commentary || ''}</div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                      {/* Inline reactions */}
                      {expandedReactions[post.id] && (
                        <div style={{ marginTop:8, paddingTop:8, borderTop:"0.5px solid #F1EFE8" }}>
                          {loadingReactions[post.id] ? (
                            <div style={{ fontSize:11, color:"#888780" }}>Loading reactions...</div>
                          ) : (postReactions[post.id] || []).length === 0 ? (
                            <div style={{ fontSize:11, color:"#888780" }}>No reactions found.</div>
                          ) : (
                            <div>
                              <div style={{ fontSize:11, color:"#5F5E5A", marginBottom:4 }}>
                                {(postReactions[post.id] || []).length} reaction{(postReactions[post.id] || []).length !== 1 ? 's' : ''}
                              </div>
                              <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                                {(postReactions[post.id] || []).slice(0, 20).map((r, ri) => (
                                  <span key={ri} style={{ fontSize:10, padding:"2px 7px", borderRadius:10, background:"#F1EFE8", color:"#5F5E5A", border:"0.5px solid #D3D1C7" }}>
                                    {r.type || r.reaction_type || 'like'} {r.author?.name || r.name || ''}
                                  </span>
                                ))}
                                {(postReactions[post.id] || []).length > 20 && (
                                  <span style={{ fontSize:10, color:"#888780" }}>+{(postReactions[post.id] || []).length - 20} more</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Divider between fetched and manual posts */}
            {fetchedPosts.length > 0 && liPosts.length > 0 && (
              <div style={{ borderTop:"0.5px solid #D3D1C7", marginBottom:12, paddingTop:8 }}>
                <div style={{ fontSize:10, fontWeight:600, color:"#5F5E5A", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>Manually saved posts</div>
              </div>
            )}

            {liPostsLoading ? (
              <div style={{ textAlign:"center", padding:20, color:"#888780", fontSize:12 }}>Loading...</div>
            ) : liPosts.length === 0 && fetchedPosts.length === 0 && !showAddPost ? (
              <div style={{ textAlign:"center", padding:40, color:"#888780" }}>
                <div style={{ fontSize:18, opacity:0.3, marginBottom:8 }}>in</div>
                <div style={{ fontSize:13 }}>No LinkedIn posts saved yet.</div>
                <div style={{ fontSize:11, marginTop:4 }}>Click "Fetch posts" to pull recent posts, or manually save them here.</div>
              </div>
            ) : (
              liPosts.map(post => (
                <div key={post.id} style={{ background:"#FFFFFF", borderRadius:9, border:"0.5px solid #D3D1C7", padding:"12px 14px", marginBottom:8 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
                    <div>
                      {post.author_name && <span style={{ fontSize:12, fontWeight:500 }}>{post.author_name}</span>}
                      {post.post_date && <span style={{ fontSize:11, color:"#888780", marginLeft:8 }}>{new Date(post.post_date).toLocaleDateString('en', { day:'numeric', month:'short', year:'numeric' })}</span>}
                    </div>
                    {post.post_url && (
                      <a href={post.post_url} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize:10, color:"#378ADD", textDecoration:"none" }}>Open ↗</a>
                    )}
                  </div>
                  <PostText text={post.content} />
                  {post.tags && (
                    <div style={{ display:"flex", gap:4, marginTop:8, flexWrap:"wrap" }}>
                      {post.tags.split(',').map((tag, i) => (
                        <span key={i} style={{ fontSize:10, padding:"2px 7px", borderRadius:10, background:"#E6F1FB", color:"#0C447C", border:"0.5px solid #85B7EB" }}>{tag.trim()}</span>
                      ))}
                    </div>
                  )}
                  <div style={{ fontSize:10, color:"#B4B2A9", marginTop:6 }}>Added {new Date(post.created_at).toLocaleDateString('en', { day:'numeric', month:'short' })}</div>
                </div>
              ))
            )}
          </div>
        )}

        {tab==="insights" && (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <div style={{ fontSize:12, color:"#888780" }}>
                {insights.length > 0
                  ? `${insights.length} insight${insights.length !== 1 ? 's' : ''} · Latest: ${new Date(insights[0].created_at).toLocaleDateString('en', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}`
                  : 'No insights generated yet'
                }
              </div>
              <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)}
                  style={{ padding:"6px 8px", borderRadius:6, border:"0.5px solid #D3D1C7", fontSize:11, fontFamily:"inherit", background:"#fff", color:"#2C2C2A", cursor:"pointer" }}>
                  <option value="haiku">Haiku (fast, ~€0.01)</option>
                  <option value="sonnet">Sonnet (recommended, ~€0.02)</option>
                  <option value="opus">Opus (deepest, ~€0.04)</option>
                </select>
                <button onClick={generateInsight} disabled={generating}
                  style={{ padding:"7px 16px", borderRadius:7, border:"none", fontSize:12, cursor:generating?"wait":"pointer", background:"#042C53", color:"#B5D4F4", fontFamily:"inherit", fontWeight:500 }}>
                  {generating ? '⟳ Generating...' : '+ New insight'}
                </button>
              </div>
            </div>
            {insightsLoading ? (
              <div style={{ textAlign:"center", padding:20, color:"#888780", fontSize:12 }}>Loading...</div>
            ) : insights.length === 0 ? (
              <div style={{ textAlign:"center", padding:40, color:"#888780" }}>
                <div style={{ fontSize:18, opacity:0.3, marginBottom:8 }}>◌</div>
                <div style={{ fontSize:13 }}>Click "+ New insight" to generate an analysis.</div>
                <div style={{ fontSize:11, marginTop:4 }}>The system analyses the website, searches for recent news and identifies opportunities.</div>
              </div>
            ) : (
              insights.map((insight, idx) => (
                <div key={insight.id} style={{ background:"#FFFFFF", borderRadius:9, border:`0.5px solid ${idx === 0 ? '#378ADD' : '#D3D1C7'}`, padding:"16px 18px", marginBottom:10 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      {idx === 0 && <span style={{ fontSize:10, background:"#E6F1FB", color:"#0C447C", padding:"2px 8px", borderRadius:10, border:"0.5px solid #85B7EB" }}>Most recent</span>}
                      <span style={{ fontSize:11, color:"#888780" }}>
                        {new Date(insight.created_at).toLocaleDateString('en', { day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                      </span>
                    </div>
                    <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                      {insight.created_by && <span style={{ fontSize:9, background:"#F1EFE8", color:"#5F5E5A", padding:"1px 6px", borderRadius:4 }}>{insight.created_by}</span>}
                      {insight.sources?.length > 0 && <span style={{ fontSize:10, color:"#888780" }}>{insight.sources.length} sources</span>}
                    </div>
                  </div>
                  <div style={{ fontSize:13, lineHeight:1.7, color:"#2C2C2A", whiteSpace:"pre-wrap" }}>
                    {insight.summary.split('\n').map((line, i) => {
                      if (line.startsWith('# ')) return <div key={i} style={{ fontSize:16, fontWeight:600, marginTop:i>0?16:0, marginBottom:6 }}>{line.slice(2)}</div>;
                      if (line.startsWith('## ')) return <div key={i} style={{ fontSize:13, fontWeight:600, marginTop:12, marginBottom:4, color:"#378ADD" }}>{line.slice(3)}</div>;
                      if (line.startsWith('- 🎯') || line.startsWith('- 💡')) return <div key={i} style={{ fontSize:12, padding:"4px 0 4px 12px", background:"#FAFAF8", borderRadius:4, marginBottom:2 }}>{line.slice(2)}</div>;
                      if (line.startsWith('- **')) return <div key={i} style={{ fontSize:12, paddingLeft:12 }}>{line.slice(2).replace(/\*\*/g, '')}</div>;
                      if (line.startsWith('- ')) return <div key={i} style={{ fontSize:12, paddingLeft:12 }}>{line.slice(2)}</div>;
                      if (line.startsWith('> ')) return <div key={i} style={{ fontSize:11, color:"#5F5E5A", paddingLeft:12, borderLeft:"2px solid #D3D1C7", marginBottom:2 }}>{line.slice(2)}</div>;
                      if (line.startsWith('*') && line.endsWith('*')) return <div key={i} style={{ fontSize:11, color:"#888780", fontStyle:"italic" }}>{line.replace(/\*/g, '')}</div>;
                      if (line.match(/^\d+\./)) return <div key={i} style={{ fontSize:12, paddingLeft:12 }}>{line.replace(/\*\*/g, '')}</div>;
                      if (line.trim() === '') return <div key={i} style={{ height:6 }} />;
                      return <div key={i} style={{ fontSize:12 }}>{line}</div>;
                    })}
                  </div>
                  {insight.sources?.length > 0 && (
                    <div style={{ marginTop:12, paddingTop:8, borderTop:"0.5px solid #F1EFE8" }}>
                      <div style={{ fontSize:10, color:"#888780", marginBottom:4 }}>SOURCES</div>
                      <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                        {insight.sources.map((s, si) => (
                          <a key={si} href={s.url} target="_blank" rel="noopener noreferrer"
                            style={{ fontSize:10, color:"#378ADD", textDecoration:"none", padding:"2px 6px", borderRadius:4, border:"0.5px solid #D3D1C7", background:"#FAFAF8" }}>
                            {s.type === 'website' ? '🌐 Website' : `📰 ${s.title?.substring(0, 30) || 'News'}${s.title?.length > 30 ? '...' : ''}`}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {tab==="teams" && (
          <div>
            {viewingPinnedMessages ? (
              /* Messages view for a pinned channel */
              <div>
                <button onClick={() => { setViewingPinnedMessages(null); setMessages([]); }}
                  style={{ background:"none", border:"none", cursor:"pointer", fontSize:12, color:"#378ADD", fontFamily:"inherit", padding:0, marginBottom:12 }}>
                  ← Back to pinned channels
                </button>
                <div style={{ fontSize:13, fontWeight:500, marginBottom:4 }}>{viewingPinnedMessages.team_name} / {viewingPinnedMessages.channel_name}</div>
                {messagesLoading ? (
                  <div style={{ textAlign:"center", padding:"20px", color:"#888780", fontSize:12 }}>Loading messages...</div>
                ) : messages.length === 0 ? (
                  <Empty text="No messages in this channel." />
                ) : messages.map((m, i) => (
                  <div key={m.id || i} style={{ padding:"8px 0", borderBottom: i < messages.length - 1 ? "0.5px solid #D3D1C7" : "none" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:2 }}>
                      <span style={{ fontSize:12, fontWeight:500, color:"#2C2C2A" }}>{m.from}</span>
                      <span style={{ fontSize:10, color:"#888780" }}>{m.date ? new Date(m.date).toLocaleDateString('en', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }) : ''}</span>
                    </div>
                    <div style={{ fontSize:12, color:"#4A4A47", lineHeight:1.4 }}>{(m.body || '').replace(/<[^>]*>/g, '')}</div>
                  </div>
                ))}
              </div>
            ) : (
              /* Pinned channels + Add channel */
              <div>
                {/* Section 1: Pinned Channels */}
                <div style={{ fontSize:10, fontWeight:600, color:"#5F5E5A", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>Pinned Channels</div>
                {pinnedLoading ? (
                  <div style={{ textAlign:"center", padding:"20px", color:"#888780", fontSize:12 }}>Loading...</div>
                ) : pinnedChannels.length === 0 && !showAddChannel ? (
                  <div style={{ textAlign:"center", padding:30, color:"#888780" }}>
                    <div style={{ fontSize:13 }}>No pinned channels yet.</div>
                    <div style={{ fontSize:11, marginTop:4 }}>Pin a Teams channel to quickly access its messages.</div>
                  </div>
                ) : (
                  pinnedChannels.map(pc => (
                    <div key={pc.id} style={{ background:"#FFFFFF", borderRadius:8, border:"0.5px solid #D3D1C7", padding:"12px 14px", marginBottom:6, display:"flex", alignItems:"center", gap:12 }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:11, color:"#888780" }}>{pc.team_name}</div>
                        <div style={{ fontSize:13, fontWeight:500, display:"flex", alignItems:"center", gap:6 }}>
                          <span style={{ fontSize:14 }}>#</span> {pc.channel_name}
                        </div>
                      </div>
                      <button onClick={() => viewPinnedMessages(pc)}
                        style={{ padding:"5px 12px", borderRadius:6, border:"0.5px solid #378ADD", fontSize:11, cursor:"pointer", background:"#fff", color:"#378ADD", fontFamily:"inherit", fontWeight:500 }}>
                        View messages
                      </button>
                      <button onClick={() => unpinChannel(pc)}
                        style={{ padding:"5px 12px", borderRadius:6, border:"0.5px solid #D3D1C7", fontSize:11, cursor:"pointer", background:"#fff", color:"#888780", fontFamily:"inherit" }}>
                        Unpin
                      </button>
                    </div>
                  ))
                )}

                {/* Section 2: Add channel */}
                {!showAddChannel ? (
                  <button onClick={startAddChannel}
                    style={{ marginTop:12, padding:"8px 16px", borderRadius:7, border:"none", fontSize:12, cursor:"pointer", background:"#042C53", color:"#B5D4F4", fontFamily:"inherit", fontWeight:500 }}>
                    + Add channel
                  </button>
                ) : (
                  <div style={{ background:"#FFFFFF", borderRadius:9, border:"0.5px solid #378ADD", padding:14, marginTop:12 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                      <div style={{ fontSize:12, fontWeight:500 }}>
                        {addStep === 'teams' ? 'Select a Team' : `Select a channel in ${selectedTeam?.displayName}`}
                      </div>
                      <button onClick={() => { setShowAddChannel(false); setSelectedTeam(null); setChannels([]); }}
                        style={{ background:"none", border:"none", cursor:"pointer", fontSize:11, color:"#888780", fontFamily:"inherit" }}>Cancel</button>
                    </div>
                    {addStep === 'channels' && (
                      <button onClick={() => { setAddStep('teams'); setSelectedTeam(null); setChannels([]); }}
                        style={{ background:"none", border:"none", cursor:"pointer", fontSize:11, color:"#378ADD", fontFamily:"inherit", padding:0, marginBottom:8 }}>
                        ← Back to teams
                      </button>
                    )}
                    {teamsError === 'auth' ? (
                      <div style={{ textAlign:"center", padding:"12px", color:"#888780", fontSize:12 }}>Log in again to load Teams</div>
                    ) : teamsLoading ? (
                      <div style={{ textAlign:"center", padding:"12px", color:"#888780", fontSize:12 }}>Loading Teams...</div>
                    ) : addStep === 'teams' ? (
                      teams.length === 0 ? (
                        <div style={{ fontSize:12, color:"#888780", padding:8 }}>No teams found.</div>
                      ) : teams.map(t => (
                        <div key={t.id} onClick={() => selectTeamForAdd(t)}
                          style={{ background:"#FAFAF8", borderRadius:7, border:"0.5px solid #D3D1C7", padding:"10px 12px", marginBottom:4, cursor:"pointer" }}
                          onMouseEnter={e => e.currentTarget.style.borderColor="#378ADD"} onMouseLeave={e => e.currentTarget.style.borderColor="#D3D1C7"}>
                          <div style={{ fontSize:12, fontWeight:500 }}>{t.displayName}</div>
                          {t.description && <div style={{ fontSize:10, color:"#888780", marginTop:2 }}>{t.description}</div>}
                        </div>
                      ))
                    ) : (
                      channelsLoading ? (
                        <div style={{ textAlign:"center", padding:"12px", color:"#888780", fontSize:12 }}>Loading channels...</div>
                      ) : channels.length === 0 ? (
                        <div style={{ fontSize:12, color:"#888780", padding:8 }}>No channels found.</div>
                      ) : channels.map(ch => (
                        <div key={ch.id} onClick={() => addChannelToCompany(ch)}
                          style={{ background:"#FAFAF8", borderRadius:7, border:"0.5px solid #D3D1C7", padding:"10px 12px", marginBottom:4, cursor:"pointer", display:"flex", alignItems:"center", gap:8 }}
                          onMouseEnter={e => e.currentTarget.style.borderColor="#378ADD"} onMouseLeave={e => e.currentTarget.style.borderColor="#D3D1C7"}>
                          <span style={{ fontSize:14 }}>#</span>
                          <div>
                            <div style={{ fontSize:12, fontWeight:500 }}>{ch.displayName}</div>
                            {ch.description && <div style={{ fontSize:10, color:"#888780" }}>{ch.description}</div>}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
