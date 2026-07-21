import { useState } from "react";
import { PanelRightOpen, Search, Users } from "lucide-react";
import toast from "react-hot-toast";
import { useChat } from "../../context/ChatContext";
import chatApi from "../../api/chat";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import TypingIndicator from "./TypingIndicator";
import MembersPanel from "./MembersPanel";

const peerForDirect = (channel, currentUserId) =>
  (channel?.members || []).find((member) => Number(member.user.userId) !== Number(currentUserId))?.user;

export default function ChatWindow({ onStartDm }) {
  const {
    activeChannel,
    messages,
    currentUserId,
    loadOlderMessages,
    hasMoreMessages,
    loadingMessages,
    scrollAnchorRef,
    sendMessage,
    socket,
    typingUsers,
    membersPanelOpen,
    setMembersPanelOpen,
    setImageLightbox,
    setMessages,
    markMessageRead,
  } = useChat();
  const [messageSearch, setMessageSearch] = useState("");

  const visibleMessages = messages.filter((message) =>
    !messageSearch ? true : (message.content || "").toLowerCase().includes(messageSearch.toLowerCase())
  );
  const directPeer = peerForDirect(activeChannel, currentUserId);

  const handleReactionToggle = async (message, emoji = "👍") => {
    try {
      const reactions = await chatApi.toggleReaction(message._id, emoji);
      setMessages((prev) => prev.map((item) => (item._id === message._id ? { ...item, reactions } : item)));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update reaction");
    }
  };

  const handleEdit = async (message) => {
    const content = window.prompt("Edit message", message.content || "");
    if (content === null) return;
    try {
      const updated = await chatApi.editMessage(message._id, content);
      setMessages((prev) => prev.map((item) => (item._id === message._id ? updated : item)));
      toast.success("Message updated successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update message");
    }
  };

  const handleDelete = async (message) => {
    if (!window.confirm("Delete this message?")) return;
    try {
      await chatApi.deleteMessage(message._id);
      setMessages((prev) => prev.map((item) => (item._id === message._id ? { ...item, isDeleted: true, content: "" } : item)));
      toast.success("Message deleted successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete message");
    }
  };

  if (!activeChannel) {
    return <div className="flex flex-1 items-center justify-center bg-[#f5f5f5] text-slate-500">Choose a channel to begin chatting.</div>;
  }

  return (
    <div className="flex min-w-0 flex-1 bg-[#f5f5f5]">
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white/80 px-6 py-4 backdrop-blur-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{activeChannel.type === "direct" ? "Direct message" : "Channel"}</p>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-slate-800">
                {activeChannel.type === "direct" ? directPeer?.name || activeChannel.name : `# ${activeChannel.name}`}
              </h1>
              <span className="text-xs text-slate-500">
                {activeChannel.type === "direct" ? (directPeer?.isOnline ? "Online" : "Offline") : `${activeChannel.members?.length || 0} members`}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                value={messageSearch}
                onChange={(event) => setMessageSearch(event.target.value)}
                placeholder="Search messages"
                className="rounded-2xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none"
              />
            </div>
            <button type="button" onClick={() => setMembersPanelOpen((prev) => !prev)} className="rounded-full bg-white p-3 text-slate-500 shadow-sm">
              {membersPanelOpen ? <Users className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
            </button>
          </div>
        </header>

        <MessageList
          messages={visibleMessages}
          currentUserId={currentUserId}
          onLoadOlder={loadOlderMessages}
          hasMore={hasMoreMessages}
          loading={loadingMessages}
          scrollRef={scrollAnchorRef}
          onReactionToggle={handleReactionToggle}
          onEditMessage={handleEdit}
          onDeleteMessage={handleDelete}
          onPreviewImage={(message) => setImageLightbox(message)}
        />

        <TypingIndicator users={typingUsers} />
        <MessageInput
          channelId={activeChannel._id}
          socket={socket}
          onSend={async (payload) => {
            try {
              const message = await sendMessage(payload);
              if (message?._id) await markMessageRead(message._id);
            } catch (error) {
              toast.error(error.response?.data?.message || "Failed to send message");
            }
          }}
        />
      </section>

      {membersPanelOpen ? <MembersPanel channel={activeChannel} onStartDm={onStartDm} /> : null}
    </div>
  );
}
