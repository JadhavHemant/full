export default function ImageLightbox({ image, onClose }) {
  if (!image) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="max-w-5xl" onClick={(event) => event.stopPropagation()}>
        <img src={image.fileUrl} alt={image.fileName || "Preview"} className="max-h-[80vh] rounded-3xl object-contain shadow-2xl" />
        <div className="mt-3 flex items-center justify-between rounded-2xl bg-white/95 px-4 py-3 text-sm">
          <span className="truncate text-slate-700">{image.fileName || "Image"}</span>
          <a href={image.fileUrl} download={image.fileName || "image"} className="font-semibold text-[#6264a7]">
            Download
          </a>
        </div>
      </div>
    </div>
  );
}
