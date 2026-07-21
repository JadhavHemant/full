export default function DateSeparator({ label }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="h-px flex-1 bg-slate-300/70" />
      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 shadow-sm">
        {label}
      </span>
      <div className="h-px flex-1 bg-slate-300/70" />
    </div>
  );
}
