import { MessageSquareMore } from "lucide-react";

export default function MembersPanel({ channel, onStartDm }) {
  if (!channel) return null;

  return (
    <aside className="w-[240px] border-l border-slate-200 bg-white/80 backdrop-blur-sm">
      <div className="border-b border-slate-200 px-4 py-4">
        <p className="text-sm font-semibold text-slate-800">Members</p>
        <p className="text-xs text-slate-500">{channel.members?.length || 0} people</p>
      </div>
      <div className="space-y-1 p-3">
        {(channel.members || []).map((member) => (
          <button
            key={member.user.userId}
            type="button"
            onClick={() => onStartDm?.(member.user)}
            className="flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left hover:bg-slate-100"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d9daf8] text-sm font-semibold text-[#4c4f8f]">
                  {(member.user.name || "?").slice(0, 1)}
                </div>
                <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${member.user.isOnline ? "bg-[#92c353]" : "bg-slate-300"}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">{member.user.name}</p>
                <p className="text-xs text-slate-500">{member.user.isOnline ? "Online" : "Offline"}</p>
              </div>
            </div>
            <MessageSquareMore className="h-4 w-4 text-slate-400" />
          </button>
        ))}
      </div>
    </aside>
  );
}
