import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import chatApi from "../../api/chat";
import { useChat } from "../../context/ChatContext";
import TitleBar from "../TitleBar";

export default function UserSearchModal({ open, onClose }) {
  const { refreshChannels, setActiveChannelId } = useChat();
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(async () => {
      try {
        const result = await chatApi.searchUsers(query || " ");
        setUsers(result);
      } catch (error) {
        setUsers([]);
        toast.error(error.response?.data?.message || "Failed to search users");
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [open, query]);

  if (!open) return null;

  const handleSelect = async (userId) => {
    try {
      const channel = await chatApi.createDirectChannel(userId);
      await refreshChannels();
      setActiveChannelId(channel._id);
      toast.success("Direct message created successfully");
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create direct message");
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-xl flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <TitleBar title="Start a direct message" onClose={onClose} />
        <div className="flex flex-col gap-4 p-6">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or email" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none" />
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {users.map((user) => (
              <button key={user.userId} type="button" onClick={() => handleSelect(user.userId)} className="flex w-full items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-left hover:bg-slate-50">
                <div>
                  <p className="text-sm font-medium text-slate-800">{user.name}</p>
                  <p className="text-xs text-slate-500">{user.email}</p>
                </div>
                <span className={`h-3 w-3 rounded-full ${user.isOnline ? "bg-[#92c353]" : "bg-slate-300"}`} />
              </button>
            ))}
          </div>
          <div className="flex justify-end">
            <button type="button" onClick={onClose} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-600">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
