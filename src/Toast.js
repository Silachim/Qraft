// src/Toast.js
import { useState, useEffect, useCallback } from "react";
import { Check, X, AlertCircle, Info } from "lucide-react";

// ── Toast Store (singleton) ───────────────────────────────────────────────────
let toastFn = null;
export const toast = {
  success: (msg, dur) => toastFn?.("success", msg, dur),
  error:   (msg, dur) => toastFn?.("error",   msg, dur),
  info:    (msg, dur) => toastFn?.("info",     msg, dur),
  warning: (msg, dur) => toastFn?.("warning",  msg, dur),
};

// ── Toast Provider ────────────────────────────────────────────────────────────
export function ToastProvider() {
  const [toasts, setToasts] = useState([]);

  const add = useCallback((type, message, duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, type, message, duration }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  useEffect(() => { toastFn = add; return () => { toastFn = null; }; }, [add]);

  const remove = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  const icons = {
    success: <Check    className="w-4 h-4" />,
    error:   <X        className="w-4 h-4" />,
    info:    <Info     className="w-4 h-4" />,
    warning: <AlertCircle className="w-4 h-4" />,
  };
  const colors = {
    success: { bg: "#052e16", border: "#16a34a", icon: "#4ade80", text: "#dcfce7" },
    error:   { bg: "#2d0a0a", border: "#dc2626", icon: "#f87171", text: "#fee2e2" },
    info:    { bg: "#0c1a2e", border: "#2563eb", icon: "#60a5fa", text: "#dbeafe" },
    warning: { bg: "#1a1200", border: "#d97706", icon: "#fbbf24", text: "#fef3c7" },
  };

  if (!toasts.length) return null;

  return (
    <div style={{
      position: "fixed", top: 20, right: 20, zIndex: 9999,
      display: "flex", flexDirection: "column", gap: 10,
      maxWidth: 360, width: "calc(100vw - 40px)",
    }}>
      {toasts.map(t => {
        const c = colors[t.type];
        return (
          <div key={t.id} style={{
            background: c.bg, border: `1px solid ${c.border}`,
            borderRadius: 14, padding: "12px 14px",
            display: "flex", alignItems: "flex-start", gap: 10,
            boxShadow: `0 4px 24px ${c.border}33`,
            animation: "slideIn 0.25s ease-out",
          }}>
            <style>{`
              @keyframes slideIn {
                from { transform: translateX(110%); opacity: 0; }
                to   { transform: translateX(0);    opacity: 1; }
              }
            `}</style>
            <span style={{ color: c.icon, flexShrink: 0, marginTop: 1 }}>{icons[t.type]}</span>
            <span style={{ color: c.text, fontSize: 13, fontWeight: 500, flex: 1, lineHeight: 1.4 }}>
              {t.message}
            </span>
            <button onClick={() => remove(t.id)}
              style={{ color: c.icon, background: "none", border: "none",
                cursor: "pointer", padding: 0, flexShrink: 0, opacity: 0.7 }}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}