import { useRef, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import api from "../api/client.js";

// Image field offering BOTH ways to set an image: paste a URL into the
// text input, or browse a file from the device and upload it via the
// staff-only POST /api/uploads/catalog-image endpoint (same FormData
// pattern as the checkout payment-screenshot upload). `value` may be an
// absolute URL or a served path like "/uploads/catalog/<file>" — both
// render directly in <img src> since uploads are served from the origin.
export default function ImageUploadField({ value, onChange, label }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset so picking the same file again re-triggers
    if (!file) return;
    setUploading(true); setError("");
    try {
      const fd = new FormData();
      fd.append("image", file);
      const r = await api.post("/uploads/catalog-image", fd,
        { headers: { "Content-Type": "multipart/form-data" } });
      onChange(r.data.path);
    } catch (err) {
      setError(err.response?.data?.message || "Image upload failed (max 5 MB, PNG/JPG/WEBP)");
    } finally { setUploading(false); }
  };

  return (
    <div>
      {label && <span className="block mb-1">{label}</span>}
      <div className="flex items-center gap-2">
        {value
          ? <img src={value} alt="" className="h-11 w-11 rounded border object-cover shrink-0 bg-gray-50" />
          : <span className="h-11 w-11 rounded border bg-gray-50 shrink-0" aria-hidden="true" />}
        <input className="border rounded px-3 py-2 text-sm w-full" placeholder="https://... image URL"
          value={value || ""} onChange={(e) => onChange(e.target.value)} />
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={pick} />
        <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1.5 border rounded px-3 py-2 text-sm shrink-0 bg-white hover:bg-gray-50 disabled:opacity-60">
          {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
          {uploading ? "Uploading…" : "Upload"}
        </button>
        {value && (
          <button type="button" onClick={() => onChange("")} aria-label="Clear image"
            className="text-gray-400 hover:text-red-500 shrink-0 p-1"><X size={15} /></button>
        )}
      </div>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}
