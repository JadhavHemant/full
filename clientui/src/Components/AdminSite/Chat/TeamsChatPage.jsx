import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
  HashtagIcon,
  MagnifyingGlassIcon,
  PaperAirplaneIcon,
  PlusIcon,
  SparklesIcon,
  UsersIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { getSessionUser } from "../../../utils/sessionUser";
import teamsChatService from "../../../services/teamsChatService";
import "./TeamsChatPage.css";

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const formatTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const TeamsChatPage = () => {
  const sessionUser = getSessionUser() || {};
  const companyId = toNum(sessionUser.companyId || sessionUser.CompanyId);
  const currentUserId = toNum(sessionUser.id || sessionUser.userId);

  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [selectedChannelId, setSelectedChannelId] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [companyUsers, setCompanyUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const [messageSearch, setMessageSearch] = useState("");
  const [composer, setComposer] = useState("");
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [channelName, setChannelName] = useState("");
  const [channelDescription, setChannelDescription] = useState("");
  const [chatError, setChatError] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  const currentTeam = useMemo(
    () => teams.find((team) => Number(team.Id) === Number(selectedTeamId)) || null,
    [teams, selectedTeamId]
  );

  const channels = useMemo(() => currentTeam?.channels || [], [currentTeam]);
  const selectedChannel = useMemo(() => {
    return (
      channels.find((channel) => Number(channel.Id) === Number(selectedChannelId)) ||
      channels[0] ||
      null
    );
  }, [channels, selectedChannelId]);

  const visibleTeams = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return teams;
    return teams.filter((team) => String(team.Name || "").toLowerCase().includes(q));
  }, [teams, search]);

  const visibleChannels = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return channels;
    return channels.filter((channel) =>
      String(channel.Name || "").toLowerCase().includes(q)
    );
  }, [channels, search]);

  const visibleMessages = useMemo(() => {
    const q = messageSearch.trim().toLowerCase();
    if (!q) return messages;
    return messages.filter((m) =>
      String(m.MessageText || "").toLowerCase().includes(q)
    );
  }, [messages, messageSearch]);

  const availableMembers = useMemo(() => {
    const existingIds = new Set(teamMembers.map((member) => Number(member.UserId)));
    return companyUsers.filter((user) => !existingIds.has(Number(user.UserId)));
  }, [companyUsers, teamMembers]);

  const refreshTeams = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (!silent) setLoading(true);
        setChatError("");
        const response = await teamsChatService.getTeams(companyId);
        const nextTeams = response?.teams || [];
        setTeams(nextTeams);

        if (!nextTeams.length) {
          setSelectedTeamId(null);
          setSelectedChannelId(null);
          return;
        }

        const nextTeam =
          nextTeams.find((team) => Number(team.Id) === Number(selectedTeamId)) ||
          nextTeams[0];
        const nextChannels = nextTeam?.channels || [];
        const nextChannel =
          nextChannels.find((channel) => Number(channel.Id) === Number(selectedChannelId)) ||
          nextChannels[0] ||
          null;

        setSelectedTeamId(toNum(nextTeam?.Id));
        setSelectedChannelId(toNum(nextChannel?.Id));
      } catch (error) {
        setChatError(error?.message || "Failed to load chat data.");
      } finally {
        setLoading(false);
      }
    },
    [companyId, selectedChannelId, selectedTeamId]
  );

  const refreshMembers = useCallback(async () => {
    if (!selectedTeamId) {
      setTeamMembers([]);
      return;
    }
    try {
      const response = await teamsChatService.getTeamMembers(selectedTeamId);
      setTeamMembers(response?.members || []);
    } catch {
      setTeamMembers([]);
    }
  }, [selectedTeamId]);

  const refreshCompanyUsers = useCallback(async () => {
    if (!companyId) {
      setCompanyUsers([]);
      return;
    }
    try {
      const response = await teamsChatService.getCompanyUsers(companyId);
      setCompanyUsers(response?.users || []);
    } catch {
      setCompanyUsers([]);
    }
  }, [companyId]);

  const refreshMessages = useCallback(
    async ({ silent = false } = {}) => {
      if (!selectedChannelId) {
        setMessages([]);
        return;
      }
      try {
        if (!silent) setLoadingMessages(true);
        const response = await teamsChatService.getChannelMessages(selectedChannelId, { limit: 120 });
        setMessages(response?.messages || []);
        await teamsChatService.markChannelAsRead(selectedChannelId);
      } finally {
        setLoadingMessages(false);
      }
    },
    [selectedChannelId]
  );

  useEffect(() => {
    refreshTeams();
  }, [refreshTeams]);

  useEffect(() => {
    refreshMembers();
  }, [refreshMembers]);

  useEffect(() => {
    refreshCompanyUsers();
  }, [refreshCompanyUsers]);

  useEffect(() => {
    refreshMessages();
  }, [refreshMessages]);

  useEffect(() => {
    if (!selectedChannelId) return undefined;
    const timer = window.setInterval(async () => {
      setSyncing(true);
      await Promise.all([refreshMessages({ silent: true }), refreshTeams({ silent: true })]);
      setSyncing(false);
    }, 9000);
    return () => window.clearInterval(timer);
  }, [refreshMessages, refreshTeams, selectedChannelId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedChannelId]);

  const handleCreateTeam = async (event) => {
    event.preventDefault();
    if (!teamName.trim()) return toast.error("Team name is required");
    try {
      setBusy(true);
      await teamsChatService.createTeam({
        companyId,
        name: teamName.trim(),
        description: teamDescription.trim(),
        memberUserIds: selectedMemberIds,
      });
      setTeamName("");
      setTeamDescription("");
      setSelectedMemberIds([]);
      setShowTeamModal(false);
      toast.success("Team created");
      await refreshTeams();
    } catch (error) {
      toast.error(error?.message || "Failed to create team");
    } finally {
      setBusy(false);
    }
  };

  const handleAddMembers = async (event) => {
    event.preventDefault();
    if (!selectedTeamId) return toast.error("Select a team first");
    if (!selectedMemberIds.length) return toast.error("Select at least one member");
    try {
      setBusy(true);
      await teamsChatService.addTeamMembers(selectedTeamId, selectedMemberIds);
      setSelectedMemberIds([]);
      setShowMemberModal(false);
      toast.success("Members added");
      await Promise.all([refreshMembers(), refreshTeams({ silent: true })]);
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || "Failed to add members");
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!selectedTeamId || Number(userId) === Number(currentUserId)) return;
    try {
      setBusy(true);
      await teamsChatService.removeTeamMember(selectedTeamId, userId);
      toast.success("Member removed");
      await Promise.all([refreshMembers(), refreshTeams({ silent: true })]);
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || "Failed to remove member");
    } finally {
      setBusy(false);
    }
  };

  const toggleSelectedMember = (userId) => {
    const normalizedId = toNum(userId);
    if (!normalizedId || Number(normalizedId) === Number(currentUserId)) return;
    setSelectedMemberIds((prev) =>
      prev.includes(normalizedId)
        ? prev.filter((id) => id !== normalizedId)
        : [...prev, normalizedId]
    );
  };

  const handleCreateChannel = async (event) => {
    event.preventDefault();
    if (!selectedTeamId) return toast.error("Select a team first");
    if (!channelName.trim()) return toast.error("Channel name is required");
    try {
      setBusy(true);
      await teamsChatService.createChannel(selectedTeamId, {
        name: channelName.trim(),
        description: channelDescription.trim(),
      });
      setChannelName("");
      setChannelDescription("");
      setShowChannelModal(false);
      toast.success("Channel created");
      await refreshTeams();
    } catch (error) {
      toast.error(error?.message || "Failed to create channel");
    } finally {
      setBusy(false);
    }
  };

  const handleSend = async (event) => {
    event.preventDefault();
    const text = composer.trim();
    if (!selectedChannelId || !text) return;
    try {
      setBusy(true);
      setComposer("");
      const response = await teamsChatService.sendMessage(selectedChannelId, { messageText: text });
      if (response?.data) {
        setMessages((prev) => [...prev, response.data]);
      }
      await teamsChatService.markChannelAsRead(selectedChannelId);
      await refreshTeams({ silent: true });
    } catch (error) {
      setComposer(text);
      toast.error(error?.message || "Failed to send message");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="teams-chat-bg flex h-[calc(100vh-64px)] items-center justify-center p-4">
        <div className="chat-card rounded-2xl border border-teal-100 bg-white/90 p-6 text-center shadow-xl">
          <ChatBubbleLeftRightIcon className="mx-auto mb-3 h-10 w-10 text-teal-600" />
          <p className="text-sm text-slate-600">Loading your Teams workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="teams-chat-bg h-[calc(100vh-64px)] overflow-hidden p-4 md:p-5">
      <div className="mx-auto flex h-full max-w-[1700px] gap-4">
        <aside className="chat-card w-[310px] rounded-2xl border border-teal-100 bg-white/90 p-3 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">Teams</h2>
            <button
              type="button"
              onClick={() => setShowTeamModal(true)}
              className="rounded-lg bg-teal-600 p-1.5 text-white hover:bg-teal-700"
            >
              <PlusIcon className="h-4 w-4" />
            </button>
          </div>
          <div className="relative mb-3">
            <MagnifyingGlassIcon className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-lg border border-slate-200 py-2 pl-8 pr-2 text-sm outline-none focus:border-teal-500"
              placeholder="Search team/channel"
            />
          </div>
          <div className="chat-scrollbar h-[calc(100%-90px)] space-y-3 overflow-y-auto pr-1">
            {visibleTeams.map((team) => {
              const activeTeam = Number(team.Id) === Number(currentTeam?.Id);
              return (
                <div key={team.Id} className="rounded-xl border border-slate-200 bg-white">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTeamId(toNum(team.Id));
                      setSelectedChannelId(toNum((team.channels || [])[0]?.Id));
                    }}
                    className={`w-full rounded-xl px-3 py-2 text-left ${
                      activeTeam ? "bg-teal-600 text-white" : "text-slate-700 hover:bg-teal-50"
                    }`}
                  >
                    <p className="truncate text-sm font-semibold">{team.Name}</p>
                  </button>
                  {activeTeam ? (
                    <div className="border-t border-slate-200 px-2 py-2">
                      {(visibleChannels || []).map((channel) => {
                        const active = Number(channel.Id) === Number(selectedChannel?.Id);
                        return (
                          <button
                            key={channel.Id}
                            type="button"
                            onClick={() => setSelectedChannelId(toNum(channel.Id))}
                            className={`mb-1 flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm ${
                              active
                                ? "bg-teal-100 text-teal-800"
                                : "text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            <span className="flex items-center gap-1">
                              <HashtagIcon className="h-4 w-4" />
                              {channel.Name}
                            </span>
                            {Number(channel.UnreadCount || 0) > 0 ? (
                              <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] text-white">
                                {channel.UnreadCount}
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </aside>

        <section className="chat-card flex min-w-0 flex-1 flex-col rounded-2xl border border-teal-100 bg-white/95 shadow-xl">
          <header className="border-b border-slate-200 px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-slate-500">{currentTeam?.Name || "No team selected"}</p>
                <h3 className="text-lg font-bold text-slate-800">
                  #{selectedChannel?.Name || "Select channel"}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-2 top-2 h-4 w-4 text-slate-400" />
                  <input
                    value={messageSearch}
                    onChange={(event) => setMessageSearch(event.target.value)}
                    className="w-48 rounded-lg border border-slate-200 py-1.5 pl-8 pr-2 text-sm outline-none focus:border-teal-500"
                    placeholder="Search messages"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowChannelModal(true)}
                  className="rounded-lg bg-teal-600 p-1.5 text-white hover:bg-teal-700"
                >
                  <PlusIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    refreshMessages();
                    refreshTeams({ silent: true });
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                >
                  <ArrowPathIcon className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
                  Sync
                </button>
              </div>
            </div>
          </header>

          <div className="chat-scrollbar flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {loadingMessages ? <p className="text-sm text-slate-500">Loading messages...</p> : null}
            {!loadingMessages && !visibleMessages.length ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
                <SparklesIcon className="mx-auto mb-1 h-5 w-5 text-teal-600" />
                <p className="text-sm text-slate-600">No messages yet</p>
              </div>
            ) : null}
            {visibleMessages.map((message) => {
              const mine = Number(message.SenderUserId) === Number(currentUserId);
              return (
                <div key={message.Id} className={`message-enter flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[78%] rounded-2xl px-3 py-2 ${mine ? "bg-teal-600 text-white" : "border border-slate-200 bg-white text-slate-800"}`}>
                    <p className={`mb-1 text-[11px] ${mine ? "text-white/80" : "text-slate-400"}`}>
                      {mine ? "You" : message.SenderName || "User"} - {formatTime(message.CreatedAt)}
                    </p>
                    <p className="whitespace-pre-wrap break-words text-sm">{message.MessageText}</p>
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>

          <form onSubmit={handleSend} className="border-t border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex items-end gap-2">
              <textarea
                value={composer}
                onChange={(event) => setComposer(event.target.value)}
                rows={2}
                disabled={!selectedChannel}
                className="chat-scrollbar min-h-[52px] flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500 disabled:bg-slate-100"
                placeholder={selectedChannel ? `Message #${selectedChannel.Name}` : "Select channel"}
              />
              <button
                type="submit"
                disabled={!selectedChannel || !composer.trim() || busy}
                className="inline-flex h-11 items-center gap-1 rounded-xl bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-700 disabled:bg-slate-300"
              >
                <PaperAirplaneIcon className="h-4 w-4" />
                Send
              </button>
            </div>
          </form>
        </section>

        <aside className="chat-card hidden w-[280px] flex-col rounded-2xl border border-teal-100 bg-white/90 p-3 shadow-xl xl:flex">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-1 text-base font-semibold text-slate-800">
              <UsersIcon className="h-5 w-5 text-teal-700" />
              Members
            </h3>
            <button
              type="button"
              onClick={() => {
                setSelectedMemberIds([]);
                setShowMemberModal(true);
              }}
              disabled={!selectedTeamId}
              className="rounded-lg bg-teal-600 p-1.5 text-white hover:bg-teal-700 disabled:bg-slate-300"
              title="Add members"
            >
              <PlusIcon className="h-4 w-4" />
            </button>
          </div>
          <div className="chat-scrollbar flex-1 space-y-2 overflow-y-auto pr-1">
            {teamMembers.map((member) => (
              <div key={member.UserId} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">
                    {member.Name}
                    {Number(member.UserId) === Number(currentUserId) ? " (You)" : ""}
                  </p>
                  <p className="truncate text-xs text-slate-500">{member.Email}</p>
                </div>
                {Number(member.UserId) !== Number(currentUserId) ? (
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(member.UserId)}
                    className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    title="Remove member"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </aside>
      </div>

      {chatError ? (
        <div className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2">
          <div className="pointer-events-auto rounded-xl bg-rose-600 px-4 py-2 text-sm text-white shadow-xl">
            {chatError}
          </div>
        </div>
      ) : null}

      {showTeamModal ? (
        <div className="chat-modal-overlay">
          <div className="chat-modal chat-card">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-lg font-semibold text-slate-800">Create Team</h4>
              <button type="button" onClick={() => setShowTeamModal(false)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateTeam} className="space-y-3">
              <input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Team name" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500" />
              <textarea value={teamDescription} onChange={(e) => setTeamDescription(e.target.value)} rows={3} placeholder="Description" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500" />
              <div className="chat-scrollbar max-h-44 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
                {companyUsers
                  .filter((user) => Number(user.UserId) !== Number(currentUserId))
                  .map((user) => (
                    <label key={user.UserId} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={selectedMemberIds.includes(Number(user.UserId))}
                        onChange={() => toggleSelectedMember(user.UserId)}
                      />
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-slate-700">{user.Name}</span>
                        <span className="block truncate text-xs text-slate-500">{user.Email}</span>
                      </span>
                    </label>
                  ))}
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowTeamModal(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={busy} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:bg-slate-300">Create</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showChannelModal ? (
        <div className="chat-modal-overlay">
          <div className="chat-modal chat-card">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-lg font-semibold text-slate-800">Create Channel</h4>
              <button type="button" onClick={() => setShowChannelModal(false)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateChannel} className="space-y-3">
              <input value={channelName} onChange={(e) => setChannelName(e.target.value)} placeholder="Channel name" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500" />
              <textarea value={channelDescription} onChange={(e) => setChannelDescription(e.target.value)} rows={3} placeholder="Description" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500" />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowChannelModal(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={busy} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:bg-slate-300">Create</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showMemberModal ? (
        <div className="chat-modal-overlay">
          <div className="chat-modal chat-card">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-lg font-semibold text-slate-800">Add Members</h4>
              <button type="button" onClick={() => setShowMemberModal(false)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddMembers} className="space-y-3">
              <div className="chat-scrollbar max-h-72 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
                {availableMembers.length ? (
                  availableMembers.map((user) => (
                    <label key={user.UserId} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={selectedMemberIds.includes(Number(user.UserId))}
                        onChange={() => toggleSelectedMember(user.UserId)}
                      />
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-slate-700">{user.Name}</span>
                        <span className="block truncate text-xs text-slate-500">{user.Email}</span>
                      </span>
                    </label>
                  ))
                ) : (
                  <p className="px-2 py-3 text-sm text-slate-500">No users available to add.</p>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowMemberModal(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={busy || !selectedMemberIds.length} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:bg-slate-300">Add</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default TeamsChatPage;
