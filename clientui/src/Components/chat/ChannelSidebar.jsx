import { Hash, MessageSquarePlus, Plus, Search } from "lucide-react";

const formatTimestamp = (value) => {
  if (!value) return "";
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const otherMember = (channel, currentUserId) =>
  (channel.members || []).find((member) => Number(member.user.userId) !== Number(currentUserId))?.user;

export default function ChannelSidebar({
  channels,
  currentUserId,
  activeChannelId,
  onSelectChannel,
  onNewChannel,
  onNewDm,
  search,
  onSearchChange,
}) {
  const filtered = channels.filter((channel) =>
    channel.name?.toLowerCase().includes(search.toLowerCase())
  );
  const directMessages = filtered.filter((channel) => channel.type === "direct");
  const groupChannels = filtered.filter((channel) => channel.type === "group");

  const renderItem = (channel) => {
    const active = Number(channel._id) === Number(activeChannelId);
    const peer = channel.type === "direct" ? otherMember(channel, currentUserId) : null;
    const title = channel.type === "direct" ? peer?.name || channel.name : `# ${channel.name}`;
    const presence = peer?.isOnline;

    return (
      <button
        key={channel._id}
        type="button"
        onClick={() => onSelectChannel(channel._id)}
        className={`w-full rounded-2xl px-3 py-3 text-left transition ${active ? "bg-[#6264a7] text-white" : "hover:bg-[#2d2d44] text-slate-200"}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {channel.type === "direct" ? (
                <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-xs font-semibold">
                  {(peer?.name || channel.name || "?").slice(0, 1)}
                  <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-[#1f1f2e] ${presence ? "bg-[#92c353]" : "bg-slate-400"}`} />
                </span>
              ) : (
                <Hash className="h-4 w-4 shrink-0" />
              )}
              <p className="truncate text-sm font-medium">{title}</p>
            </div>
            <p className={`mt-1 truncate text-xs ${active ? "text-white/80" : "text-slate-400"}`}>
              {channel.lastMessage?.isDeleted ? "This message was deleted" : channel.lastMessage?.content || channel.description || "No messages yet"}
            </p>
          </div>
          <div className="text-right">
            <p className={`text-[11px] ${active ? "text-white/80" : "text-slate-400"}`}>{formatTimestamp(channel.lastActivity)}</p>
            {channel.unreadCount ? (
              <span className="mt-2 inline-flex rounded-full bg-[#cc4a31] px-2 py-0.5 text-[10px] font-semibold text-white">
                {channel.unreadCount}
              </span>
            ) : null}
          </div>
        </div>
      </button>
    );
  };

  return (
    <aside className="flex h-full w-[260px] flex-col bg-[#1f1f2e] text-white">
      <div className="border-b border-white/10 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search channels"
            className="w-full rounded-2xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-slate-400"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between px-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Direct Messages</p>
            <button type="button" onClick={onNewDm} className="rounded-full bg-white/10 p-1.5 hover:bg-white/20">
              <MessageSquarePlus className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-1">{directMessages.map(renderItem)}</div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between px-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Channels</p>
            <button type="button" onClick={onNewChannel} className="rounded-full bg-white/10 p-1.5 hover:bg-white/20">
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-1">{groupChannels.map(renderItem)}</div>
        </div>
      </div>
    </aside>
  );
}
