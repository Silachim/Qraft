// src/Landing.js
import { useState, useEffect } from "react";
import logo from "./logo.png";
import {
  QrCode, Link, Wifi, User, Mail, FileText,
  BarChart2, RefreshCw, Palette, Shield, Zap, Globe,
  ChevronRight, Moon, Sun
} from "lucide-react";

const FEATURES = [
  { icon: Link,      title: "6 QR Types",        desc: "URL, Text, WiFi, Contact, Email, SMS & File" },
  { icon: RefreshCw, title: "Dynamic QR",         desc: "Edit destination anytime without reprinting" },
  { icon: BarChart2, title: "Scan Analytics",     desc: "Track device, location, browser per scan" },
  { icon: Palette,   title: "12 Templates",       desc: "Dots, stars, diamonds & custom colors" },
  { icon: Shield,    title: "Secure",             desc: "Password protect & set expiry dates" },
  { icon: Globe,     title: "File Hosting",       desc: "Upload PDFs & docs, get instant QR codes" },
];

const STEPS = [
  { step: "01", title: "Choose a type",    desc: "Pick from URL, WiFi, Contact, Email or File" },
  { step: "02", title: "Customize design", desc: "Pick a template, shape, colors and size"     },
  { step: "03", title: "Generate & share", desc: "Download, print or share your QR instantly"  },
];

export default function Landing({ dm, onGetStarted, onToggleDark }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const bg   = dm ? "#0a0a14" : "#f8f7ff";
  const txt  = dm ? "#ffffff" : "#0f0f1a";
  const sub  = dm ? "#9ca3af" : "#6b7280";
  const card = dm ? "rgba(255,255,255,0.04)" : "#ffffff";
  const bdr  = dm ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

  return (
    <div style={{ minHeight: "100vh", background: bg, fontFamily: "sans-serif", color: txt, overflowX: "hidden" }}>

      {/* Blobs */}
      {dm && (
        <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
          <div style={{ position: "absolute", top: "-20%", left: "-10%", width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(circle,#00f5ff12,transparent 70%)", animation: "blob 8s ease-in-out infinite" }}/>
          <div style={{ position: "absolute", bottom: "-20%", right: "-10%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle,#a855f712,transparent 70%)", animation: "blob 10s ease-in-out infinite reverse" }}/>
          <style>{`@keyframes blob{0%,100%{transform:scale(1)}50%{transform:scale(1.1) translate(20px,-20px)}}`}</style>
        </div>
      )}

      {/* Navbar */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        padding: "12px 24px", display: "flex", alignItems: "center",
        justifyContent: "space-between",
        background: scrolled ? (dm ? "rgba(10,10,20,0.95)" : "rgba(255,255,255,0.95)") : "transparent",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        borderBottom: scrolled ? `1px solid ${bdr}` : "none",
        transition: "all 0.3s ease",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src={logo} alt="QRaft" style={{ width: 36, height: 36, borderRadius: 10, boxShadow: dm ? "0 0 16px #00f5ff44" : "0 2px 12px rgba(124,58,237,0.3)" }}/>
          <span style={{ fontSize: 22, fontWeight: 900, background: "linear-gradient(135deg,#00f5ff,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>QRaft</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={onToggleDark} style={{ background: dm ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)", border: "none", borderRadius: 20, padding: "7px 10px", cursor: "pointer", color: dm ? "#facc15" : "#6b7280" }}>
            {dm ? <Sun size={16}/> : <Moon size={16}/>}
          </button>
          <button onClick={onGetStarted} style={{
            background: "linear-gradient(135deg,#00f5ff,#a855f7)",
            border: "none", borderRadius: 20, padding: "8px 20px",
            color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
          }}>
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "140px 24px 80px" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: dm ? "rgba(0,245,255,0.1)" : "rgba(124,58,237,0.08)",
          border: `1px solid ${dm ? "rgba(0,245,255,0.3)" : "rgba(124,58,237,0.2)"}`,
          borderRadius: 20, padding: "6px 16px", marginBottom: 24,
          fontSize: 13, fontWeight: 600, color: dm ? "#00f5ff" : "#7c3aed",
        }}>
          <Zap size={14}/> Free to use · No account required for basic QR
        </div>

        <h1 style={{ fontSize: "clamp(36px, 7vw, 72px)", fontWeight: 900, lineHeight: 1.1, marginBottom: 20, letterSpacing: "-1px" }}>
          Craft stunning{" "}
          <span style={{ background: "linear-gradient(135deg,#00f5ff,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            QR codes
          </span>
          <br/>in seconds
        </h1>

        <p style={{ fontSize: "clamp(16px, 2.5vw, 20px)", color: sub, maxWidth: 560, margin: "0 auto 40px", lineHeight: 1.6 }}>
          Generate, customize and track QR codes for URLs, WiFi, contacts, files and more. Free forever, with powerful pro features.
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={onGetStarted} style={{
            background: "linear-gradient(135deg,#00f5ff,#a855f7)",
            border: "none", borderRadius: 14, padding: "14px 32px",
            color: "#fff", fontWeight: 800, fontSize: 16, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 8,
            boxShadow: "0 4px 24px rgba(0,245,255,0.3)",
            transition: "transform 0.2s, box-shadow 0.2s",
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,245,255,0.4)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,245,255,0.3)"; }}
          >
            Create your first QR <ChevronRight size={18}/>
          </button>
          <button onClick={onGetStarted} style={{
            background: "transparent",
            border: `1px solid ${bdr}`, borderRadius: 14, padding: "14px 32px",
            color: txt, fontWeight: 700, fontSize: 16, cursor: "pointer",
          }}>
            View Demo
          </button>
        </div>

        {/* Hero QR mockup */}
        <div style={{ marginTop: 60, display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
          {["#00f5ff","#a855f7","#f59e0b","#10b981"].map((c, i) => (
            <div key={i} style={{
              width: 80, height: 80, borderRadius: 14,
              background: dm ? "#12121f" : "#fff",
              border: `1px solid ${bdr}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 4px 20px ${c}22`,
              animation: `float ${2.5 + i * 0.3}s ease-in-out infinite alternate`,
            }}>
              <QrCode size={36} style={{ color: c }}/>
            </div>
          ))}
        </div>
        <style>{`@keyframes float{from{transform:translateY(0)}to{transform:translateY(-10px)}}`}</style>
      </section>

      {/* Features */}
      <section style={{ position: "relative", zIndex: 1, padding: "60px 24px", maxWidth: 1100, margin: "0 auto" }}>
        <h2 style={{ textAlign: "center", fontSize: "clamp(24px, 4vw, 40px)", fontWeight: 900, marginBottom: 12 }}>
          Everything you need
        </h2>
        <p style={{ textAlign: "center", color: sub, fontSize: 16, marginBottom: 48 }}>
          Powerful features for individuals and businesses
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
          {FEATURES.map((f, i) => (
            <div key={i} style={{
              background: card, border: `1px solid ${bdr}`,
              borderRadius: 20, padding: "24px",
              transition: "transform 0.2s, box-shadow 0.2s",
              cursor: "default",
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = dm ? "0 12px 40px rgba(0,245,255,0.1)" : "0 12px 40px rgba(124,58,237,0.1)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg,#00f5ff22,#a855f722)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <f.icon size={22} style={{ color: dm ? "#00f5ff" : "#7c3aed" }}/>
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: sub, lineHeight: 1.5 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ position: "relative", zIndex: 1, padding: "60px 24px", maxWidth: 900, margin: "0 auto" }}>
        <h2 style={{ textAlign: "center", fontSize: "clamp(24px, 4vw, 40px)", fontWeight: 900, marginBottom: 12 }}>
          How it works
        </h2>
        <p style={{ textAlign: "center", color: sub, fontSize: 16, marginBottom: 48 }}>Three steps to your perfect QR code</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 24 }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg,#00f5ff,#a855f7)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 18, fontWeight: 900, color: "#fff" }}>
                {s.step}
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>{s.title}</h3>
              <p style={{ fontSize: 14, color: sub, lineHeight: 1.5 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ position: "relative", zIndex: 1, padding: "60px 24px 100px", textAlign: "center" }}>
        <div style={{
          maxWidth: 600, margin: "0 auto",
          background: "linear-gradient(135deg,rgba(0,245,255,0.08),rgba(168,85,247,0.08))",
          border: `1px solid ${bdr}`, borderRadius: 28, padding: "48px 32px",
        }}>
          <h2 style={{ fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 900, marginBottom: 12 }}>
            Ready to craft your QR code?
          </h2>
          <p style={{ color: sub, fontSize: 16, marginBottom: 32 }}>
            Free forever. No credit card required.
          </p>
          <button onClick={onGetStarted} style={{
            background: "linear-gradient(135deg,#00f5ff,#a855f7)",
            border: "none", borderRadius: 14, padding: "16px 40px",
            color: "#fff", fontWeight: 800, fontSize: 17, cursor: "pointer",
            boxShadow: "0 4px 24px rgba(0,245,255,0.3)",
          }}>
            Start for free →
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "24px", borderTop: `1px solid ${bdr}`, color: sub, fontSize: 13 }}>
        QRaft © {new Date().getFullYear()} · No data stored · Free to use
      </footer>
    </div>
  );
}