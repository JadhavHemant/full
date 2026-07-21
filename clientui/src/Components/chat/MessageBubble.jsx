import { Download, Pencil, SmilePlus, Trash2 } from "lucide-react";
import ReactionBar from "./ReactionBar";
import { escapeHtml, highlightMentionsWithSanitization } from "../../utils/sanitize";

const formatTime = (value) =>
  new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const highlightMentions = (content) => {
  // Use sanitized mention highlighting
  const parts = highlightMentionsWithSanitization(content);
  return parts.map((part) =>
    part.type === "mention" ? (
      <span key={part.key} className="rounded bg-[#ececff] px-1 text-[#4b4d8f]">
        {part.text}
      </span>
    ) : (
      <span key={part.key}>{part.text}</span>
    )
  );
};

export default function MessageBubble({
  message,
  showAvatar,
  currentUserId,
  onReactionToggle,
  onEdit,
  onDelete,
  onPreviewImage,
}) {
  const mine = Number(message.sender?.userId) === Number(currentUserId);

  return (
    <div className={`group flex gap-3 ${mine ? "justify-end" : "justify-start"}`}>
      {!mine && showAvatar ? (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d9daf8] text-xs font-semibold text-[#4b4d8f]">
          {(message.sender?.name || "?").slice(0, 1)}
        </div>
      ) : (
        <div className="w-8" />
      )}
      <div className={`max-w-[78%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
        {showAvatar ? (
          <div className={`mb-1 flex items-center gap-2 text-xs ${mine ? "justify-end" : "justify-start"} text-slate-500`}>
            <span className="font-semibold text-slate-700">{mine ? "You" : message.sender?.name}</span>
            <span>{formatTime(message.createdAt)}</span>
          </div>
        ) : null}
        <div className={`relative rounded-3xl px-4 py-3 shadow-sm ${mine ? "bg-[#6264a7] text-white" : "bg-white text-slate-800"}`}>
          {!message.isDeleted ? (
            <>
              {message.type === "image" && message.fileUrl ? (
                <button type="button" onClick={() => onPreviewImage?.(message)} className="mb-2 overflow-hidden rounded-2xl">
                  <img src={message.fileUrl} alt={message.fileName || "attachment"} className="max-h-64 rounded-2xl object-cover" />
                </button>
              ) : null}
              {message.type === "file" && message.fileUrl ? (
                <a href={message.fileUrl} download={message.fileName || "file"} className={`mb-2 flex items-center justify-between gap-3 rounded-2xl border px-3 py-2 text-sm ${mine ? "border-white/20 bg-white/10" : "border-slate-200 bg-slate-50"}`}>
                  <div>
                    <p className="font-medium">{escapeHtml(message.fileName)}</p>
                    <p className={`text-xs ${mine ? "text-white/80" : "text-slate-500"}`}>{escapeHtml(message.fileType)}</p>
                  </div>
                  <Download className="h-4 w-4" />
                </a>
              ) : null}
              {message.content ? <p className="whitespace-pre-wrap break-words text-sm">{highlightMentions(message.content)}</p> : null}
            </>
          ) : (
            <p className={`text-sm italic ${mine ? "text-white/80" : "text-slate-500"}`}>This message was deleted</p>
          )}
          {message.isEdited && !message.isDeleted ? (
            <p className={`mt-1 text-[11px] ${mine ? "text-white/70" : "text-slate-400"}`}>Edited</p>
          ) : null}
          {message.type === "direct" && message.readBy?.length > 1 ? (
            <p className={`mt-1 text-[11px] ${mine ? "text-white/70" : "text-slate-400"}`}>Seen</p>
          ) : null}
        </div>

        <div className={`mt-1 flex items-center gap-1 opacity-0 transition group-hover:opacity-100 ${mine ? "justify-end" : "justify-start"}`}>
          <button type="button" onClick={() => onReactionToggle?.()} className="rounded-full bg-white p-2 text-slate-500 shadow">
            <SmilePlus className="h-4 w-4" />
          </button>
          {!message.isDeleted ? (
            <>
              <button type="button" onClick={() => onEdit?.(message)} className="rounded-full bg-white p-2 text-slate-500 shadow">
                <Pencil className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => onDelete?.(message)} className="rounded-full bg-white p-2 text-slate-500 shadow">
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          ) : null}
        </div>

        <ReactionBar
          reactions={message.reactions}
          currentUserId={currentUserId}
          onToggle={(emoji) => onReactionToggle?.(emoji)}
        />
      </div>
    </div>
  );
}
