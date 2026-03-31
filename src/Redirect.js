// src/Redirect.js
import { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, query, where, getDocs, addDoc, updateDoc, doc, increment, serverTimestamp } from "firebase/firestore";
import logo from "./logo.png";

function getDeviceType() {
  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) return "tablet";
  if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile/i.test(ua)) return "mobile";
  return "desktop";
}
function getBrowser() {
  const ua = navigator.userAgent;
  if (ua.includes("Chrome") && !ua.includes("Edg")) return "Chrome";
  if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Edg")) return "Edge";
  if (ua.includes("OPR")) return "Opera";
  return "Other";
}
function getOS() {
  const ua = navigator.userAgent;
  if (ua.includes("Windows")) return "Windows";
  if (ua.includes("Mac")) return "macOS";
  if (ua.includes("Android")) return "Android";
  if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
  if (ua.includes("Linux")) return "Linux";
  return "Other";
}
async function getCountry() {
  try {
    const res = await fetch("https://ipapi.co/json/");
    const j   = await res.json();
    return { country: j.country_name||"Unknown", countryCode: j.country_code||"XX", city: j.city||"" };
  } catch { return { country:"Unknown", countryCode:"XX", city:"" }; }
}

export default function Redirect({ shortId }) {
  const [status, setStatus] = useState("loading");
  const [dest,   setDest]   = useState("");

  useEffect(() => {
    if (!shortId) { setStatus("error"); return; }
    (async () => {
      try {
        const q    = query(collection(db,"qrcodes"), where("shortId","==",shortId));
        const snap = await getDocs(q);
        if (snap.empty) { setStatus("error"); return; }

        const docSnap     = snap.docs[0];
        const data        = docSnap.data();
        const destination = data.destination;
        setDest(destination);
        setStatus("redirecting");

        // Log analytics in background
        const geo = await getCountry();
        await addDoc(collection(db,"scans"), {
          qrId: docSnap.id, shortId, uid: data.uid, destination,
          device: getDeviceType(), browser: getBrowser(), os: getOS(),
          country: geo.country, countryCode: geo.countryCode, city: geo.city,
          scannedAt: serverTimestamp(), referrer: document.referrer||"direct",
        });
        await updateDoc(doc(db,"qrcodes",docSnap.id), {
          scans: increment(1), lastScanned: serverTimestamp(),
        });

        // Redirect after short delay
        setTimeout(() => { window.location.href = destination; }, 1500);
      } catch(e) {
        console.error("Redirect error:", e);
        setStatus("error");
      }
    })();
  }, [shortId]);

  const s = {
    page: { minHeight:"100vh", background:"#0a0a14", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", fontFamily:"sans-serif", color:"#fff", padding:"24px", textAlign:"center" },
    logo: { width:56, height:56, borderRadius:14, marginBottom:16, boxShadow:"0 0 24px #00f5ff55" },
    brand: { fontSize:28, fontWeight:900, marginBottom:24, background:"linear-gradient(135deg,#00f5ff,#a855f7)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" },
    spinner: { width:44, height:44, border:"3px solid #00f5ff22", borderTop:"3px solid #00f5ff", borderRadius:"50%", animation:"spin 0.8s linear infinite", margin:"0 auto 20px" },
    destBox: { background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:12, padding:"10px 16px", marginTop:12, maxWidth:320, wordBreak:"break-all", fontSize:13, color:"#00f5ff", fontFamily:"monospace" },
    errIcon: { fontSize:52, marginBottom:16 },
    errTitle: { fontSize:20, fontWeight:700, marginBottom:8 },
    errSub: { color:"#9ca3af", fontSize:14, marginBottom:24 },
    backLink: { color:"#00f5ff", fontSize:14, textDecoration:"none" },
  };

  return (
    <div style={s.page}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <img src={logo} alt="QRaft" style={s.logo}/>
      <div style={s.brand}>QRaft</div>

      {status === "loading" && (
        <>
          <div style={s.spinner}/>
          <p style={{ color:"#9ca3af", fontSize:15 }}>Looking up your QR code…</p>
        </>
      )}

      {status === "redirecting" && (
        <>
          <div style={s.spinner}/>
          <p style={{ color:"#9ca3af", fontSize:15, marginBottom:4 }}>Redirecting you to:</p>
          <div style={s.destBox}>{dest}</div>
          <p style={{ color:"#6b7280", fontSize:12, marginTop:16 }}>You'll be redirected in a moment…</p>
        </>
      )}

      {status === "error" && (
        <>
          <div style={s.errIcon}>❌</div>
          <p style={s.errTitle}>QR code not found</p>
          <p style={s.errSub}>This link may have been deleted or doesn't exist.</p>
          <a href="/" style={s.backLink}>← Back to QRaft</a>
        </>
      )}
    </div>
  );
}