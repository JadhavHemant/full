import { useMemo } from "react";
import DateSeparator from "./DateSeparator";
import MessageBubble from "./MessageBubble";

const formatDayLabel = (value) => {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a, b) => a.toDateString() === b.toDateString();
  if (sameDay(date, today)) return "Today";
  if (sameDay(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString();
};

export default function MessageList({
  messages,
  currentUserId,
  onLoadOlder,
  hasMore,
  loading,
  scrollRef,
  onReactionToggle,
  onEditMessage,
  onDeleteMessage,
  onPreviewImage,
}) {
  const items = useMemo(() => {
    const result = [];
    let lastDate = null;
    messages.forEach((message, index) => {
      const dayLabel = formatDayLabel(message.createdAt);
      const previous = messages[index - 1];
      const showAvatar =
        !previous ||
        Number(previous.sender?.userId) !== Number(message.sender?.userId) ||
        new Date(previous.createdAt).getDate() !== new Date(message.createdAt).getDate();

      if (dayLabel !== lastDate) {
        result.push({ type: "separator", label: dayLabel, key: `sep-${dayLabel}-${message._id}` });
        lastDate = dayLabel;
      }
      result.push({ type: "message", message, showAvatar, key: message._id });
    });
    return result;
  }, [messages]);

  return (
    <div
      ref={scrollRef}
      onScroll={(event) => {
        if (event.currentTarget.scrollTop <= 24 && hasMore && !loading) {
          onLoadOlder?.();
        }
      }}
      className="flex-1 space-y-1 overflow-y-auto px-6 py-4"
    >
      {loading && !messages.length ? <p className="text-sm text-slate-500">Loading messages...</p> : null}
      {hasMore ? (
        <div className="pb-2 text-center">
          <button type="button" onClick={onLoadOlder} className="text-xs font-semibold text-[#6264a7]">
            Load older messages
          </button>
        </div>
      ) : null}
      {items.map((item) =>
        item.type === "separator" ? (
          <DateSeparator key={item.key} label={item.label} />
        ) : (
          <MessageBubble
            key={item.key}
            message={item.message}
            showAvatar={item.showAvatar}
            currentUserId={currentUserId}
            onReactionToggle={(emoji) => onReactionToggle?.(item.message, emoji)}
            onEdit={onEditMessage}
            onDelete={onDeleteMessage}
            onPreviewImage={onPreviewImage}
          />
        )
      )}
      {!loading && !messages.length ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 px-6 py-10 text-center text-sm text-slate-500">
          No messages yet. Start the conversation.
        </div>
      ) : null}
    </div>
  );
}
