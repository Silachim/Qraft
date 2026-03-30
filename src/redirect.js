// src/redirect.js
// Handles /r/:shortId — logs scan to Firestore then redirects
import { useEffect, useState } from "react";
import { db } from "./firebase";
import {
  collection, query, where, getDocs,
  addDoc, updateDoc, doc, increment, serverTimestamp
} from "firebase/firestore";

// ── Device / Browser detection ───────────────────────────────────────────────
function getDeviceType() {
  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) return "tablet";
  if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile/i.test(ua)) return "mobile";
  return "desktop";
}
function getBrowser() {
  const ua = navigator.userAgent;
  if (ua.includes("Chrome") && !ua.includes("Edg"))  return "Chrome";
  if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Edg"))     return "Edge";
  if (ua.includes("OPR"))     return "Opera";
  return "Other";
}
function getOS() {
  const ua = navigator.userAgent;
  if (ua.includes("Windows")) return "Windows";
  if (ua.includes("Mac"))     return "macOS";
  if (ua.includes("Android")) return "Android";
  if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
  if (ua.includes("Linux"))   return "Linux";
  return "Other";
}

// ── Geo lookup (free, no key needed) ─────────────────────────────────────────
async function getCountry() {
  try {
    const res = await fetch("https://ipapi.co/json/");
    const j   = await res.json();
    return { country: j.country_name || "Unknown", countryCode: j.country_code || "XX", city: j.city || "" };
  } catch { return { country: "Unknown", countryCode: "XX", city: "" }; }
}

// ── Redirect Page ─────────────────────────────────────────────────────────────
export default function Redirect({ shortId }) {
  // Log the scan and redirect
  const [status, setStatus] = useState("loading"); // loading | redirecting | error
  const [dest,   setDest]   = useState("");

  useEffect(() => {
    if (!shortId) { setStatus("error"); return; }
    (async () => {
      try {
        // 1. Find the QR code doc
        const q    = query(collection(db, "qrcodes"), where("shortId", "==", shortId));
        const snap = await getDocs(q);
        if (snap.empty) { setStatus("error"); return; }

        const docSnap    = snap.docs[0];
        const data       = docSnap.data();
        const destination = data.destination;
        setDest(destination);

        // 2. Collect analytics
        const geo = await getCountry();
        await addDoc(collection(db, "scans"), {
          qrId:        docSnap.id,
          shortId,
          uid:         data.uid,
          destination,
          device:      getDeviceType(),
          browser:     getBrowser(),
          os:          getOS(),
          country:     geo.country,
          countryCode: geo.countryCode,
          city:        geo.city,
          scannedAt:   serverTimestamp(),
          referrer:    document.referrer || "direct",
        });

        // 3. Increment scan counter on the QR doc
        await updateDoc(doc(db, "qrcodes", docSnap.id), {
          scans: increment(1),
          lastScanned: serverTimestamp(),
        });

        // 4. Redirect
        setStatus("redirecting");
        setTimeout(() => { window.location.href = destination; }, 1200);
      } catch (e) {
        console.error(e);
        setStatus("error");
      }
    })();
  }, [shortId]);

  return (
    <div style={{
      minHeight: "100vh", background: "#0a0a14", display: "flex",
      flexDirection: "column", alignItems: "center", justifyContent: "center",
      fontFamily: "sans-serif", color: "#fff", padding: 24,
    }}>
      {status === "redirecting" && (
        <>
          <div style={{ width: 48, height: 48, border: "3px solid #00f5ff33",
            borderTop: "3px solid #00f5ff", borderRadius: "50%",
            animation: "spin 0.8s linear infinite", marginBottom: 20 }}/>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <p style={{ color: "#9ca3af", fontSize: 16 }}>Loading…</p>
        </>
      )}
      {status === "redirecting" && (
        <>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8,
            background: "linear-gradient(135deg,#00f5ff,#a855f7)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            QRaft
          </h2>
          <p style={{ color: "#9ca3af", fontSize: 15, marginBottom: 8 }}>redirecting you to:</p>
          <p style={{ color: "#00f5ff", fontSize: 13, wordBreak: "break-all",
            maxWidth: 320, textAlign: "center", fontFamily: "monospace" }}>{dest}</p>
        </>
      )}
      {status === "error" && (
        <>
          <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>QR code not found</h2>
          <p style={{ color: "#9ca3af", fontSize: 14 }}>This link may have been deleted or doesn't exist.</p>
          <a href="/" style={{ marginTop: 24, color: "#00f5ff", fontSize: 14 }}>← Back to QRaft</a>
        </>
      )}
    </div>
  );
}