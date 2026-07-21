import { useRef, useState } from "react";
import EmojiPicker from "emoji-picker-react";
import { Paperclip, SendHorizontal, Smile } from "lucide-react";
import FilePreview from "./FilePreview";
import useTyping from "../../hooks/useTyping";

export default function MessageInput({ channelId, socket, onSend }) {
  const [value, setValue] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const fileRef = useRef(null);
  const { notifyTyping, stopTyping } = useTyping({ socket, channelId });

  const submit = async () => {
    if (!value.trim() && !attachment) return;
    await onSend?.({ content: value.trim(), attachment });
    setValue("");
    setAttachment(null);
    setShowPicker(false);
    stopTyping();
  };

  return (
    <div className="border-t border-slate-200 bg-white/80 px-4 py-4 backdrop-blur-sm">
      {showPicker ? (
        <div className="mb-3">
          <EmojiPicker onEmojiClick={(emojiData) => setValue((prev) => `${prev}${emojiData.emoji}`)} />
        </div>
      ) : null}
      <FilePreview attachment={attachment} onClear={() => setAttachment(null)} />
      <div className="flex items-end gap-3 rounded-[28px] border border-slate-200 bg-[#f9f9ff] px-3 py-3 shadow-sm">
        <button type="button" onClick={() => fileRef.current?.click()} className="rounded-full p-2 text-slate-500 hover:bg-white">
          <Paperclip className="h-5 w-5" />
        </button>
        <button type="button" onClick={() => setShowPicker((prev) => !prev)} className="rounded-full p-2 text-slate-500 hover:bg-white">
          <Smile className="h-5 w-5" />
        </button>
        <textarea
          rows={1}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            notifyTyping();
          }}
          onPaste={(event) => {
            const file = event.clipboardData.files?.[0];
            if (file?.type?.startsWith("image/")) {
              setAttachment({ file, type: "image" });
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          className="max-h-[200px] min-h-[44px] flex-1 resize-none bg-transparent py-2 text-sm text-slate-700 outline-none"
          placeholder="Write a message"
        />
        <button type="button" onClick={submit} className="rounded-full bg-[#6264a7] p-3 text-white shadow-lg shadow-[#6264a7]/30">
          <SendHorizontal className="h-4 w-4" />
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          setAttachment({
            file,
            type: file.type?.startsWith("image/") ? "image" : "file",
          });
        }}
      />
    </div>
  );
}
