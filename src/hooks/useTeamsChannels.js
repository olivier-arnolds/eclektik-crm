import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { getMyTeams, getTeamChannels, getChannelMessages } from '../lib/graph';

export function useTeamsChannels(account, { enabled }) {
  const [teams, setTeams] = useState([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [teamsError, setTeamsError] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [channels, setChannels] = useState([]);
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [pinnedChannels, setPinnedChannels] = useState([]);
  const [pinnedLoading, setPinnedLoading] = useState(false);
  const [showAddChannel, setShowAddChannel] = useState(false);
  const [addStep, setAddStep] = useState('teams');
  const [viewingPinnedMessages, setViewingPinnedMessages] = useState(null);

  const fetchPinnedChannels = useCallback(async () => {
    setPinnedLoading(true);
    const { data } = await supabase
      .from('company_channels')
      .select('*')
      .eq('company_id', account.id)
      .eq('pinned', true);
    setPinnedChannels(data || []);
    setPinnedLoading(false);
  }, [account.id]);

  useEffect(() => {
    if (enabled) fetchPinnedChannels();
  }, [enabled, fetchPinnedChannels]);

  const unpinChannel = useCallback(async (channelRecord) => {
    await supabase.from('company_channels').update({ pinned: false }).eq('id', channelRecord.id);
    setPinnedChannels((prev) => prev.filter((c) => c.id !== channelRecord.id));
  }, []);

  const startAddChannel = useCallback(async () => {
    setShowAddChannel(true);
    setAddStep('teams');
    setSelectedTeam(null);
    setChannels([]);
    setTeamsError(null);
    if (!localStorage.getItem('graph_token')) {
      setTeamsError('auth');
      setTeams([]);
      return;
    }
    setTeamsLoading(true);
    const result = await getMyTeams();
    if (!localStorage.getItem('graph_token')) {
      setTeamsError('auth');
    }
    setTeams(result || []);
    setTeamsLoading(false);
  }, []);

  const selectTeamForAdd = useCallback(async (team) => {
    setSelectedTeam(team);
    setAddStep('channels');
    setChannelsLoading(true);
    const result = await getTeamChannels(team.id);
    setChannels(result || []);
    setChannelsLoading(false);
  }, []);

  const addChannelToCompany = useCallback(
    async (channel) => {
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
    },
    [account.id, selectedTeam, fetchPinnedChannels]
  );

  const viewPinnedMessages = useCallback(async (pinnedChannel) => {
    setViewingPinnedMessages(pinnedChannel);
    setMessagesLoading(true);
    const allTeams = await getMyTeams();
    const team = (allTeams || []).find((t) => t.displayName === pinnedChannel.team_name);
    if (team) {
      const result = await getChannelMessages(team.id, pinnedChannel.channel_id, 20);
      setMessages(result || []);
    } else {
      setMessages([]);
    }
    setMessagesLoading(false);
  }, []);

  const exitPinnedMessages = useCallback(() => {
    setViewingPinnedMessages(null);
    setMessages([]);
  }, []);

  const cancelAddChannel = useCallback(() => {
    setShowAddChannel(false);
    setSelectedTeam(null);
    setChannels([]);
  }, []);

  const backToTeams = useCallback(() => {
    setAddStep('teams');
    setSelectedTeam(null);
    setChannels([]);
  }, []);

  return {
    teams,
    teamsLoading,
    teamsError,
    selectedTeam,
    channels,
    channelsLoading,
    messages,
    messagesLoading,
    pinnedChannels,
    pinnedLoading,
    showAddChannel,
    addStep,
    viewingPinnedMessages,
    unpinChannel,
    startAddChannel,
    selectTeamForAdd,
    addChannelToCompany,
    viewPinnedMessages,
    exitPinnedMessages,
    cancelAddChannel,
    backToTeams,
  };
}
