export default function ReactionBar({ reactions = [], currentUserId, onToggle }) {
  if (!reactions.length) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {reactions.map((reaction) => {
        const active = reaction.users?.some((user) => Number(user.userId) === Number(currentUserId));
        const title = reaction.users?.map((user) => user.name).join(", ");
        return (
          <button
            key={reaction.emoji}
            type="button"
            title={title}
            onClick={() => onToggle?.(reaction.emoji)}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs transition ${
              active
                ? "border-[#6264a7] bg-[#e8e8fb] text-[#404272]"
                : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"
            }`}
          >
            <span>{reaction.emoji}</span>
            <span>{reaction.users?.length || 0}</span>
          </button>
        );
      })}
    </div>
  );
}
