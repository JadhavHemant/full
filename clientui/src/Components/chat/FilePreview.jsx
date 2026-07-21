const formatSize = (size) => {
  if (!size) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

export default function FilePreview({ attachment, onClear }) {
  if (!attachment) return null;

  return (
    <div className="mb-3 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-700">{attachment.file?.name || attachment.fileName}</p>
        <p className="text-xs text-slate-500">{formatSize(attachment.file?.size || attachment.fileSize)}</p>
      </div>
      <button type="button" onClick={onClear} className="text-xs font-semibold text-[#6264a7]">
        Remove
      </button>
    </div>
  );
}
