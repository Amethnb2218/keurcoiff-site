import { useEffect } from "react";
export default function Toast({ message, type="info", onClose }) {
  useEffect(()=>{ const t=setTimeout(onClose,4500); return ()=>clearTimeout(t); },[onClose]);
  const cls = type==="error" ? "border-red-200 bg-red-50 text-red-800" :
              type==="success" ? "border-green-200 bg-green-50 text-green-800" :
              "border-line bg-white text-ink";
  return (
    <div className={`fixed top-4 right-4 z-50 max-w-sm w-[92vw] sm:w-auto border rounded-xl3 shadow-soft px-5 py-4 ${cls}`}>
      <div className="flex items-start gap-3">
        <div className="text-sm font-semibold">{message}</div>
        <button className="ml-auto text-muted hover:text-ink" onClick={onClose} aria-label="Fermer">✕</button>
      </div>
    </div>
  );
}
