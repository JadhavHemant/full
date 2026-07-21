import { ChatProvider } from "../context/ChatContext";
import ChatLayout from "../Components/chat/ChatLayout";

export default function ChatPage() {
  return (
    <ChatProvider>
      <div className="h-[calc(100vh-64px)] bg-[radial-gradient(circle_at_top_left,_rgba(98,100,167,0.18),_transparent_32%),linear-gradient(135deg,_#eef1ff_0%,_#f5f5f5_48%,_#ffffff_100%)] p-4 md:p-6">
        <ChatLayout />
      </div>
    </ChatProvider>
  );
}
