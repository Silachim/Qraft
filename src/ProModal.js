// src/ProModal.js
import { useState } from "react";
import { X, Check, Zap, BarChart2, RefreshCw, FileText, Palette, Download } from "lucide-react";
import { startCheckout } from "./Stripe";
import { toast } from "./Toast";

const PRO_FEATURES = [
  { icon: RefreshCw,  text: "Dynamic QR codes — edit destination anytime" },
  { icon: BarChart2,  text: "Scan analytics — device, location, time"      },
  { icon: FileText,   text: "File uploads via Firebase Storage"             },
  { icon: Palette,    text: "All 12 templates + custom shapes"              },
  { icon: Download,   text: "SVG + high-DPI PNG + PDF export"               },
  { icon: Zap,        text: "Unlimited QR codes forever"                    },
];

const FREE_LIMITS = [
  "Static QR codes only",
  "3 templates",
  "PNG export only",
  "5 QR codes maximum",
  "No file uploads",
  "No analytics",
];

export default function ProModal({ dm, onClose, user, onSignIn }) {
  const [loading, setLoading] = useState(false);

  const card  = dm ? "bg-[#12121f] border border-white/10" : "bg-white border border-gray-200";
  const txt   = dm ? "text-white"   : "text-gray-900";
  const sub   = dm ? "text-gray-400": "text-gray-500";

  const handleUpgrade = async () => {
    if (!user) { onSignIn(); onClose(); return; }
    setLoading(true);
    try {
      await startCheckout();
    } catch(e) {
      toast.error(e.message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}>
      <div className={`${card} rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden`}
        onClick={e => e.stopPropagation()}
        style={dm ? { boxShadow:"0 0 60px rgba(124,58,237,0.3)" } : {}}>

        {/* Header */}
        <div className="relative p-6 pb-4"
          style={{ background:"linear-gradient(135deg,#7c3aed22,#2563eb22)" }}>
          <button onClick={onClose}
            className={`absolute top-4 right-4 p-1.5 rounded-lg ${sub} hover:text-red-400`}>
            <X className="w-4 h-4"/>
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background:"linear-gradient(135deg,#7c3aed,#2563eb)" }}>
              <Zap className="w-5 h-5 text-white"/>
            </div>
            <div>
              <h2 className={`text-xl font-black ${txt}`}>Upgrade to QRaft Pro</h2>
              <p className={`text-xs ${sub}`}>One-time payment · Lifetime access · No subscription</p>
            </div>
          </div>
        </div>

        <div className="p-6 pt-4 space-y-5">
          {/* Pricing */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-4xl font-black" style={{ color:"#7c3aed" }}>$29</span>
              <span className={`text-sm ml-2 ${sub}`}>one-time · forever</span>
            </div>
            <div className={`text-xs px-3 py-1.5 rounded-full font-semibold ${dm?"bg-purple-400/20 text-purple-400":"bg-purple-100 text-purple-700"}`}>
              vs $180+/year elsewhere
            </div>
          </div>

          {/* Two column comparison */}
          <div className="grid grid-cols-2 gap-3">
            {/* Free */}
            <div className={`rounded-2xl p-4 ${dm?"bg-white/5 border border-white/10":"bg-gray-50 border border-gray-200"}`}>
              <p className={`text-xs font-bold uppercase tracking-wide mb-3 ${sub}`}>Free</p>
              <div className="space-y-2">
                {FREE_LIMITS.map((f,i) => (
                  <div key={i} className="flex items-start gap-2">
                    <X className="w-3 h-3 mt-0.5 flex-shrink-0 text-red-400"/>
                    <span className={`text-xs ${sub}`}>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pro */}
            <div className="rounded-2xl p-4"
              style={{ background:"linear-gradient(135deg,rgba(124,58,237,0.1),rgba(37,99,235,0.1))", border:"1px solid rgba(124,58,237,0.3)" }}>
              <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color:"#7c3aed" }}>Pro</p>
              <div className="space-y-2">
                {PRO_FEATURES.map((f,i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Check className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color:"#7c3aed" }}/>
                    <span className={`text-xs ${txt}`}>{f.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CTA */}
          <button onClick={handleUpgrade} disabled={loading}
            className="w-full py-4 rounded-2xl font-black text-white text-lg disabled:opacity-60 transition-all hover:opacity-90 active:scale-95"
            style={{ background:"linear-gradient(135deg,#7c3aed,#2563eb)" }}>
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                Redirecting to Stripe…
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Zap className="w-5 h-5"/> Upgrade Now — $29 Lifetime
              </span>
            )}
          </button>

          <p className={`text-center text-xs ${sub}`}>
            Secure payment via Stripe · 30-day money-back guarantee
          </p>
        </div>
      </div>
    </div>
  );
}