import { useState } from "react";
import toast from "react-hot-toast";
import chatApi from "../../api/chat";
import { useChat } from "../../context/ChatContext";
import TitleBar from "../TitleBar";

export default function CreateChannelModal({ open, onClose }) {
  const { refreshChannels } = useChat();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);

  if (!open) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("Channel name is required");
      return;
    }

    try {
      await chatApi.createChannel({
        name,
        description,
        isPrivate,
      });
      setName("");
      setDescription("");
      setIsPrivate(false);
      await refreshChannels();
      toast.success("Channel created successfully");
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create channel");
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="flex w-full max-w-lg flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <TitleBar title="Create Channel" onClose={onClose} />
        <div className="flex flex-col gap-4 p-6">
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Channel name" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none" />
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Description" rows={4} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none" />
          <label className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
            <span>Private channel</span>
            <input type="checkbox" checked={isPrivate} onChange={(event) => setIsPrivate(event.target.checked)} />
          </label>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-600">
              Cancel
            </button>
            <button type="submit" className="rounded-2xl bg-[#6264a7] px-4 py-2 text-sm font-semibold text-white">
              Create
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
