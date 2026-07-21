export default function TypingIndicator({ users = [] }) {
  if (!users.length) return null;

  const names = users.map((user) => user.userName);
  const label =
    names.length === 1
      ? `${names[0]} is typing...`
      : names.length === 2
        ? `${names[0]} and ${names[1]} are typing...`
        : `${names[0]}, ${names[1]} and others are typing...`;

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm text-slate-500">
      <div className="flex gap-1">
        <span className="h-2 w-2 animate-bounce rounded-full bg-[#6264a7] [animation-delay:-0.2s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-[#6264a7] [animation-delay:-0.1s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-[#6264a7]" />
      </div>
      <span>{label}</span>
    </div>
  );
}
