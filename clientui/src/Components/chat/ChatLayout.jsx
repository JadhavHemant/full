import { useState } from "react";
import { useChat } from "../../context/ChatContext";
import ChannelSidebar from "./ChannelSidebar";
import ChatWindow from "./ChatWindow";
import ImageLightbox from "./ImageLightbox";
import CreateChannelModal from "../modals/CreateChannelModal";
import UserSearchModal from "../modals/UserSearchModal";

export default function ChatLayout() {
  const {
    channels,
    currentUserId,
    activeChannelId,
    setActiveChannelId,
    setImageLightbox,
    imageLightbox,
  } = useChat();
  const [search, setSearch] = useState("");
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);

  return (
    <>
      <div className="flex h-[calc(100vh-64px)] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(17,24,39,0.12)]">
        <ChannelSidebar
          channels={channels}
          currentUserId={currentUserId}
          activeChannelId={activeChannelId}
          onSelectChannel={setActiveChannelId}
          onNewChannel={() => setShowCreateChannel(true)}
          onNewDm={() => setShowUserSearch(true)}
          search={search}
          onSearchChange={setSearch}
        />
        <ChatWindow onStartDm={() => setShowUserSearch(true)} />
      </div>
      <CreateChannelModal open={showCreateChannel} onClose={() => setShowCreateChannel(false)} />
      <UserSearchModal open={showUserSearch} onClose={() => setShowUserSearch(false)} />
      <ImageLightbox image={imageLightbox} onClose={() => setImageLightbox(null)} />
    </>
  );
}
