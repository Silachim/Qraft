import { useState, useEffect, useRef, useCallback } from "react";
import {
  QrCode, Link, MessageSquare, User, Download, Copy, Check,
  FileText, Upload, X, Moon, Sun, Share2, Sliders, Palette,
  Wifi, Mail, Printer, Lock, Unlock, Maximize2,
  ChevronDown, ChevronUp, History, Grid, LogIn, LogOut,
  RefreshCw, Trash2, Edit2, LayoutDashboard, Plus, BarChart2
} from "lucide-react";
import logo from "./logo.png";
import { auth, db, googleProvider } from "./firebase";
import {
  signInWithPopup, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut, onAuthStateChanged
} from "firebase/auth";
import {
  collection, addDoc, getDocs, updateDoc, deleteDoc,
  doc, query, where, orderBy, serverTimestamp, increment
} from "firebase/firestore";
import Analytics   from "./Analytics";
import Redirect    from "./Redirect";
import Landing     from "./Landing";
import { ToastProvider, toast } from "./Toast";

// ── Helpers ──────────────────────────────────────────────────────────────────
const SHORT_BASE = window.location.origin + "/r/";

function genId(len = 7) {
  return Math.random().toString(36).slice(2, 2 + len);
}

// ── QR Shapes ────────────────────────────────────────────────────────────────
const SHAPES = [
  { id:"square",  label:"Classic"  },
  { id:"rounded", label:"Rounded"  },
  { id:"dots",    label:"Dots"     },
  { id:"stars",   label:"Stars"    },
  { id:"diamond", label:"Diamond"  },
];

const TEMPLATES = [
  { id:"neon",     label:"Neon",     fg:"#00f5ff", bg:"#0f0f1a", shape:"dots"    },
  { id:"purple",   label:"Purple",   fg:"#a855f7", bg:"#0f0f1a", shape:"rounded" },
  { id:"classic",  label:"Classic",  fg:"#000000", bg:"#ffffff", shape:"square"  },
  { id:"forest",   label:"Forest",   fg:"#16a34a", bg:"#f0fdf4", shape:"rounded" },
  { id:"fire",     label:"Fire",     fg:"#ef4444", bg:"#1a0000", shape:"dots"    },
  { id:"gold",     label:"Gold",     fg:"#f59e0b", bg:"#1a1200", shape:"diamond" },
  { id:"ocean",    label:"Ocean",    fg:"#0ea5e9", bg:"#001a2a", shape:"rounded" },
  { id:"candy",    label:"Candy",    fg:"#ec4899", bg:"#fff0f6", shape:"dots"    },
  { id:"midnight", label:"Midnight", fg:"#818cf8", bg:"#0f0f2a", shape:"stars"   },
  { id:"earth",    label:"Earth",    fg:"#92400e", bg:"#fef3c7", shape:"square"  },
  { id:"mint",     label:"Mint",     fg:"#059669", bg:"#ecfdf5", shape:"dots"    },
  { id:"carbon",   label:"Carbon",   fg:"#e2e8f0", bg:"#0f172a", shape:"diamond" },
];

// ── Canvas QR ────────────────────────────────────────────────────────────────
function roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();}
function drawStar(ctx,cx,cy,sp,oR,iR){ctx.beginPath();for(let i=0;i<sp*2;i++){const r=i%2===0?oR:iR,a=(i*Math.PI)/sp-Math.PI/2;i===0?ctx.moveTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r):ctx.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);}ctx.closePath();}
function drawFinder(ctx,row,col,cs,fg,bg){const x=col*cs,y=row*cs,s=cs*7;ctx.fillStyle=fg;ctx.fillRect(x,y,s,s);ctx.fillStyle=bg;ctx.fillRect(x+cs,y+cs,s-cs*2,s-cs*2);ctx.fillStyle=fg;ctx.fillRect(x+cs*2,y+cs*2,cs*3,cs*3);}
function renderCustomQR(canvas,modules,size,fg,bg,shape){
  const n=modules.length,cs=size/n,ctx=canvas.getContext("2d");
  canvas.width=size;canvas.height=size;
  ctx.fillStyle=bg;ctx.fillRect(0,0,size,size);
  const fin=(r,c)=>(r<7&&c<7)||(r<7&&c>n-8)||(r>n-8&&c<7);
  for(let r=0;r<n;r++)for(let c=0;c<n;c++){
    if(!modules[r][c]||fin(r,c))continue;
    const x=c*cs,y=r*cs,s=cs,p=s*0.1;
    ctx.fillStyle=fg;
    if(shape==="dots"){ctx.beginPath();ctx.arc(x+s/2,y+s/2,(s/2)-p,0,Math.PI*2);ctx.fill();}
    else if(shape==="rounded"){roundRect(ctx,x+p,y+p,s-p*2,s-p*2,s*0.25);ctx.fill();}
    else if(shape==="stars"){drawStar(ctx,x+s/2,y+s/2,5,(s/2)-p,(s/4)-p/2);ctx.fill();}
    else if(shape==="diamond"){const cx=x+s/2,cy=y+s/2,rr=(s/2)-p;ctx.beginPath();ctx.moveTo(cx,cy-rr);ctx.lineTo(cx+rr,cy);ctx.lineTo(cx,cy+rr);ctx.lineTo(cx-rr,cy);ctx.closePath();ctx.fill();}
    else ctx.fillRect(x+p*.5,y+p*.5,s-p,s-p);
  }
  drawFinder(ctx,0,0,cs,fg,bg);drawFinder(ctx,0,n-7,cs,fg,bg);drawFinder(ctx,n-7,0,cs,fg,bg);
}

const loadQRious=()=>new Promise(res=>{if(window.QRious)return res();const s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js";s.onload=res;document.head.appendChild(s);});
async function getQRMatrix(text,size){
  await loadQRious();
  const tmp=document.createElement("canvas");
  const qr=new window.QRious({element:tmp,value:text,size,level:"H"});
  const ctx=tmp.getContext("2d"),id=ctx.getImageData(0,0,tmp.width,tmp.height);
  const n=qr.size,cs=tmp.width/n,modules=[];
  for(let r=0;r<n;r++){modules[r]=[];for(let c=0;c<n;c++){const px=Math.floor((c+.5)*cs),py=Math.floor((r+.5)*cs),i=(py*tmp.width+px)*4;modules[r][c]=id.data[i]<128;}}
  return{modules};
}

// ── File Upload Helpers ───────────────────────────────────────────────────────
const FILE_HOSTS = [
  // Host 1: file.io
  async (file) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("https://file.io/?expires=1w", {
      method: "POST", body: form, headers: { "Accept": "application/json" },
    });
    if (!res.ok) throw new Error(`file.io HTTP ${res.status}`);
    const j = await res.json();
    if (j.success && j.link) return j.link;
    throw new Error(j.message || "file.io: no link");
  },
  // Host 2: 0x0.st
  async (file) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("https://0x0.st", { method: "POST", body: form });
    if (!res.ok) throw new Error(`0x0.st HTTP ${res.status}`);
    const url = (await res.text()).trim();
    if (url.startsWith("http")) return url;
    throw new Error("0x0.st: invalid response");
  },
  // Host 3: litterbox (catbox) — up to 1GB, 24h
  async (file) => {
    const form = new FormData();
    form.append("reqtype", "fileupload");
    form.append("time",    "24h");
    form.append("fileToUpload", file);
    const res = await fetch("https://litterbox.catbox.moe/resources/internals/api.php", {
      method: "POST", body: form,
    });
    if (!res.ok) throw new Error(`litterbox HTTP ${res.status}`);
    const url = (await res.text()).trim();
    if (url.startsWith("http")) return url;
    throw new Error("litterbox: invalid response");
  },
];

async function uploadFile(file, onProgress) {
  const errors = [];
  for (let i = 0; i < FILE_HOSTS.length; i++) {
    try {
      onProgress?.(`Uploading… (attempt ${i + 1}/${FILE_HOSTS.length})`);
      return await FILE_HOSTS[i](file);
    } catch (e) {
      errors.push(e.message);
    }
  }
  throw new Error("All upload hosts failed: " + errors.join(" | "));
}

// ── Toggle ────────────────────────────────────────────────────────────────────
function Toggle({value,onChange,dm}){return(<button onClick={()=>onChange(!value)} className={`w-12 h-6 rounded-full relative flex-shrink-0 transition-colors duration-300 ${value?dm?"bg-cyan-500":"bg-purple-500":dm?"bg-gray-700":"bg-gray-300"}`}><span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-300 ${value?"left-7":"left-1"}`}/></button>);}

// ── Auth Modal ────────────────────────────────────────────────────────────────
function AuthModal({ dm, onClose }) {
  const [mode,     setMode]     = useState("login");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const card    = dm?"bg-[#12121f] border border-white/10":"bg-white border border-gray-200";
  const inp     = `w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 ${dm?"bg-[#1a1a2e] border-white/10 text-white placeholder-gray-600":"bg-white border-gray-200 text-gray-900"}`;
  const txt     = dm?"text-white":"text-gray-900";
  const sub     = dm?"text-gray-400":"text-gray-500";

  const handleEmail = async () => {
    setLoading(true); setError("");
    try {
      if (mode==="login") await signInWithEmailAndPassword(auth, email, password);
      else await createUserWithEmailAndPassword(auth, email, password);
      onClose();
    } catch(e) { setError(e.message.replace("Firebase: ","").replace(/\(auth.*\)/,"")); }
    finally { setLoading(false); }
  };

  const handleGoogle = async () => {
    setLoading(true); setError("");
    try { await signInWithPopup(auth, googleProvider); onClose(); }
    catch(e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleGetStarted = () => {
    localStorage.setItem("qraft_visited", "1");
    setShowLanding(false);
  };

  if (showLanding) return (
    <Landing
      dm={darkMode}
      onGetStarted={handleGetStarted}
      onToggleDark={() => setDarkMode(!darkMode)}
    />
  );
  // ── Render landing page for first-time visitors ────────────────────────────
  if (showLanding) return (
    <Landing
      dm={darkMode}
      onGetStarted={handleGetStarted}
      onToggleDark={() => setDarkMode(!darkMode)}
    />
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className={`${card} rounded-3xl p-6 w-full max-w-sm shadow-2xl`} onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-xl font-black ${txt}`}>{mode==="login"?"Welcome back":"Create account"}</h2>
          <button onClick={onClose} className={`p-1.5 rounded-lg ${sub} hover:text-red-400`}><X className="w-4 h-4"/></button>
        </div>

        {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 mb-4">{error}</p>}

        <div className="space-y-3 mb-4">
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email address" className={inp}/>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" className={inp} onKeyDown={e=>e.key==="Enter"&&handleEmail()}/>
        </div>

        <button onClick={handleEmail} disabled={loading}
          className="w-full py-3 rounded-xl font-bold text-white mb-3 disabled:opacity-50 transition-all hover:opacity-90"
          style={{background:"linear-gradient(135deg,#00f5ff,#a855f7)"}}>
          {loading?"Please wait…":mode==="login"?"Sign In":"Create Account"}
        </button>

        <button onClick={handleGoogle} disabled={loading}
          className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 mb-4 transition-all ${dm?"bg-white/10 text-white hover:bg-white/20 border border-white/10":"bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
          <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.3 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 20-8.9 20-20 0-1.3-.1-2.7-.4-4z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 10-1.9 13.6-5l-6.3-5.1C29.5 35.6 26.9 36 24 36c-5.2 0-9.5-2.6-11.3-6.5L6 34.8C9.4 40.4 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20H24v8h11.3c-.8 2.5-2.4 4.6-4.5 6L37 39.1C41.5 35 44 29.9 44 24c0-1.3-.1-2.7-.4-4z"/></svg>
          Continue with Google
        </button>

        <p className={`text-center text-xs ${sub}`}>
          {mode==="login"?"Don't have an account? ":"Already have an account? "}
          <button onClick={()=>setMode(mode==="login"?"signup":"login")} className="text-cyan-400 font-semibold hover:underline">
            {mode==="login"?"Sign up":"Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({ user, dm, onClose, onEdit }) {
  const [qrCodes,   setQrCodes]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [editId,    setEditId]    = useState(null);
  const [editUrl,   setEditUrl]   = useState("");
  const [editLabel, setEditLabel] = useState("");
  const [saving,    setSaving]    = useState(false);
  const [deleting,  setDeleting]  = useState(null);

  const card    = dm?"bg-[#12121f] border border-white/10":"bg-white border border-gray-200";
  const rowBg   = dm?"bg-[#1a1a2e] border border-white/5":"bg-gray-50 border border-gray-100";
  const txt     = dm?"text-white":"text-gray-900";
  const sub     = dm?"text-gray-400":"text-gray-500";
  const inp     = `w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 ${dm?"bg-[#0f0f1a] border-white/10 text-white":"bg-white border-gray-200 text-gray-900"}`;
  const accent  = dm?"text-cyan-400":"text-purple-600";

  const fetchCodes = async () => {
    setLoading(true);
    try {
      const q = query(collection(db,"qrcodes"), where("uid","==",user.uid), orderBy("createdAt","desc"));
      const snap = await getDocs(q);
      setQrCodes(snap.docs.map(d=>({id:d.id,...d.data()})));
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCodes(); }, [fetchCodes]);

  const saveEdit = async () => {
    if(!editUrl.trim()) return;
    setSaving(true);
    try {
      await updateDoc(doc(db,"qrcodes",editId),{
        destination: editUrl.startsWith("http")?editUrl:"https://"+editUrl,
        label: editLabel,
        updatedAt: serverTimestamp(),
      });
      setQrCodes(prev=>prev.map(q=>q.id===editId?{...q,destination:editUrl,label:editLabel}:q));
      setEditId(null);
    } catch(e){ console.error(e); }
    finally{ setSaving(false); }
  };

  const deleteCode = async (id) => {
    setDeleting(id);
    try { await deleteDoc(doc(db,"qrcodes",id)); setQrCodes(prev=>prev.filter(q=>q.id!==id)); }
    catch(e){ console.error(e); }
    finally{ setDeleting(null); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-6" onClick={onClose}>
      <div className={`${card} rounded-3xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col`} onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b" style={{borderColor:dm?"rgba(255,255,255,0.1)":"#e5e7eb"}}>
          <div>
            <h2 className={`text-xl font-black ${txt}`}>My QR Codes</h2>
            <p className={`text-xs mt-0.5 ${sub}`}>{user.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchCodes} className={`p-2 rounded-xl transition-all ${dm?"bg-white/5 hover:bg-white/10 text-gray-400":"bg-gray-100 hover:bg-gray-200 text-gray-600"}`}><RefreshCw className="w-4 h-4"/></button>
            <button onClick={onClose} className={`p-2 rounded-xl transition-all ${dm?"bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400":"bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-500"}`}><X className="w-4 h-4"/></button>
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {loading ? (
            <div className="text-center py-12">
              <div className={`w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3 ${dm?"border-cyan-400":"border-purple-500"}`}/>
              <p className={`text-sm ${sub}`}>Loading your QR codes…</p>
            </div>
          ) : qrCodes.length === 0 ? (
            <div className="text-center py-12">
              <QrCode className={`w-12 h-12 mx-auto mb-3 ${dm?"text-gray-700":"text-gray-300"}`}/>
              <p className={`text-sm font-semibold ${txt}`}>No dynamic QR codes yet</p>
              <p className={`text-xs mt-1 ${sub}`}>Create one by enabling "Dynamic QR" in the main form</p>
            </div>
          ) : qrCodes.map(qr => (
            <div key={qr.id} className={`${rowBg} rounded-2xl p-4`}>
              {editId === qr.id ? (
                <div className="space-y-2">
                  <input value={editLabel} onChange={e=>setEditLabel(e.target.value)} placeholder="Label (optional)" className={inp}/>
                  <input value={editUrl}   onChange={e=>setEditUrl(e.target.value)}   placeholder="New destination URL" className={inp}/>
                  <div className="flex gap-2 mt-2">
                    <button onClick={saveEdit} disabled={saving}
                      className="flex-1 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                      style={{background:"linear-gradient(135deg,#00f5ff,#a855f7)"}}>
                      {saving?"Saving…":"Save Changes"}
                    </button>
                    <button onClick={()=>setEditId(null)} className={`px-4 py-2 rounded-xl text-sm font-medium ${dm?"bg-white/5 text-gray-300":"bg-gray-100 text-gray-600"}`}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-sm font-bold truncate ${txt}`}>{qr.label||"Untitled QR"}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${dm?"bg-cyan-400/20 text-cyan-400":"bg-purple-100 text-purple-600"}`}>dynamic</span>
                    </div>
                    <p className={`text-xs truncate ${sub}`}>{qr.destination}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`text-[10px] font-mono ${sub}`}>{SHORT_BASE}{qr.shortId}</span>
                      <span className={`text-[10px] ${sub}`}>📊 {qr.scans||0} scans</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={()=>{setEditId(qr.id);setEditUrl(qr.destination);setEditLabel(qr.label||"");}}
                      className={`p-1.5 rounded-lg transition-all ${dm?"hover:bg-cyan-400/20 text-gray-400 hover:text-cyan-400":"hover:bg-purple-50 text-gray-400 hover:text-purple-600"}`}>
                      <Edit2 className="w-3.5 h-3.5"/>
                    </button>
                    <button onClick={()=>onEdit(qr)}
                      className={`p-1.5 rounded-lg transition-all ${dm?"hover:bg-white/10 text-gray-400 hover:text-white":"hover:bg-gray-100 text-gray-400 hover:text-gray-700"}`}>
                      <Download className="w-3.5 h-3.5"/>
                    </button>
                    <button onClick={()=>deleteCode(qr.id)} disabled={deleting===qr.id}
                      className={`p-1.5 rounded-lg transition-all ${dm?"hover:bg-red-500/20 text-gray-400 hover:text-red-400":"hover:bg-red-50 text-gray-400 hover:text-red-500"}`}>
                      {deleting===qr.id?<div className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin"/>:<Trash2 className="w-3.5 h-3.5"/>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t text-center" style={{borderColor:dm?"rgba(255,255,255,0.1)":"#e5e7eb"}}>
          <p className={`text-xs ${sub}`}>Dynamic QR codes let you change the destination anytime without reprinting.</p>
        </div>
      </div>
    </div>
  );
}

// ── Fullscreen QR ─────────────────────────────────────────────────────────────
function FullscreenQR({ qrData, qrColor, qrBg, qrShape, embedLogo, onClose }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const el = canvasRef.current;
    if (!el || !qrData) return;
    getQRMatrix(qrData, 320).then(({ modules }) => {
      renderCustomQR(el, modules, 320, qrColor, qrBg, qrShape);
      if (embedLogo) {
        const ctx = el.getContext("2d");
        const img = new Image();
        img.src = logo;
        img.onload = () => {
          const ls = 320 * 0.18;
          const x = (el.width - ls) / 2;
          const y = (el.height - ls) / 2;
          ctx.fillStyle = qrBg;
          ctx.fillRect(x - 5, y - 5, ls + 10, ls + 10);
          ctx.drawImage(img, x, y, ls, ls);
        };
      }
    });
  }, [qrData, qrColor, qrBg, qrShape, embedLogo]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 backdrop-blur-sm" onClick={onClose}>
      <div className="p-8 rounded-3xl" style={{ background: qrBg }}>
        <canvas ref={canvasRef} />
      </div>
      <p className="text-gray-400 mt-6 text-sm">Tap anywhere to close</p>
    </div>
  );
}

// ── Router ────────────────────────────────────────────────────────────────────
export default function QRaft() {
  const path      = window.location.pathname;
  const pathParts = path.split("/").filter(Boolean);
  const rIdx      = pathParts.indexOf("r");
  const shortId   = rIdx !== -1 ? pathParts[rIdx + 1] || null : null;
  if (shortId) return <Redirect shortId={shortId}/>;
  return (
    <>
      <ToastProvider/>
      <QRaftApp/>
    </>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
function QRaftApp() {
  const TABS=[
    {id:"url",     label:"URL",     icon:Link},
    {id:"text",    label:"Text",    icon:MessageSquare},
    {id:"contact", label:"Contact", icon:User},
    {id:"wifi",    label:"WiFi",    icon:Wifi},
    {id:"email",   label:"Email",   icon:Mail},
    {id:"file",    label:"File",    icon:FileText},
  ];

  // ── Auth state ─────────────────────────────────────────────────────────────
  const [user,          setUser]          = useState(null);
  const [showAuth,      setShowAuth]      = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [qrCodes,       setQrCodes]       = useState([]);

  // ── QR state ───────────────────────────────────────────────────────────────
  const [activeTab,      setActiveTab]      = useState("url");
  const [darkMode,       setDarkMode]       = useState(true);
  const [qrData,         setQrData]         = useState("");
  const [qrColor,        setQrColor]        = useState("#00f5ff");
  const [qrBg,           setQrBg]           = useState("#0f0f1a");
  const [qrSize,         setQrSize]         = useState(280);
  const [qrShape,        setQrShape]        = useState("dots");
  const [embedLogo,      setEmbedLogo]      = useState(true);
  const [showCustom,     setShowCustom]     = useState(false);
  const [showTemplates,  setShowTemplates]  = useState(false);
  const [showHistory,    setShowHistory]    = useState(false);
  const [fullscreen,     setFullscreen]     = useState(false);
  const [copied,         setCopied]         = useState(false);
  const [shareMsg,       setShareMsg]       = useState("");
  const [activeTemplate, setActiveTemplate] = useState("neon");
  const [scanCount,      setScanCount]      = useState(()=>parseInt(localStorage.getItem("qraft_scans")||"0"));
  const [history,        setHistory]        = useState(()=>{try{return JSON.parse(localStorage.getItem("qraft_history")||"[]")}catch{return[]}});

  // Dynamic QR
  const [isDynamic,    setIsDynamic]    = useState(false);
  const [dynamicLabel, setDynamicLabel] = useState("");
  const [savingDynamic,setSavingDynamic]= useState(false);
  const [savedDynamic, setSavedDynamic] = useState(null);

  // Security
  const [usePassword, setUsePassword] = useState(false);
  const [qrPassword,  setQrPassword]  = useState("");
  const [pwVisible,   setPwVisible]   = useState(false);
  const [useExpiry,   setUseExpiry]   = useState(false);
  const [expiryDate,  setExpiryDate]  = useState("");
  const [expired,     setExpired]     = useState(false);

  // Form
  const [urlInput,     setUrlInput]     = useState("");
  const [textInput,    setTextInput]    = useState("");
  const [contact,      setContact]      = useState({firstName:"",lastName:"",phone:"",email:"",organization:"",url:""});
  const [wifi,         setWifi]         = useState({ssid:"",password:"",security:"WPA",hidden:false});
  const [emailInfo,    setEmailInfo]    = useState({to:"",subject:"",body:""});
  const [smsInfo,      setSmsInfo]      = useState({phone:"",message:""});
  const [emailOrSms,   setEmailOrSms]   = useState("email");
  const [uploadedFile, setUploadedFile] = useState(null);
  const [fileDataUrl,  setFileDataUrl]  = useState("");
  const [fileError,    setFileError]    = useState("");
  const [isDragging,   setIsDragging]   = useState(false);
  const [uploading,    setUploading]    = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [uploadedUrl,  setUploadedUrl]  = useState("");
  const [uploadError,  setUploadError]  = useState("");

  const qrRef  = useRef(null);
  const fileRef = useRef(null);
  const dm = darkMode;

  // ── Auth listener ──────────────────────────────────────────────────────────
  const fetchQrCodes = async (uid) => {
    try {
      const q    = query(collection(db,"qrcodes"), where("uid","==",uid), orderBy("createdAt","desc"));
      const snap = await getDocs(q);
      setQrCodes(snap.docs.map(d => ({ id:d.id, ...d.data() })));
    } catch(e) { console.error(e); }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u);
      if (u) fetchQrCodes(u.uid);
    });
    return unsub;
  }, []);

  // ── Build QR data ──────────────────────────────────────────────────────────
  const buildData = useCallback(()=>{
    if(isDynamic && savedDynamic) return SHORT_BASE + savedDynamic.shortId;
    if(activeTab==="url") return urlInput.trim()?(urlInput.startsWith("http")?urlInput:"https://"+urlInput):"";
    if(activeTab==="text") return textInput;
    if(activeTab==="wifi") return wifi.ssid?`WIFI:T:${wifi.security};S:${wifi.ssid};P:${wifi.password};H:${wifi.hidden};`:"";
    if(activeTab==="email"){
      if(emailOrSms==="email") return emailInfo.to?`mailto:${emailInfo.to}?subject=${encodeURIComponent(emailInfo.subject)}&body=${encodeURIComponent(emailInfo.body)}`:"";
      return smsInfo.phone?`sms:${smsInfo.phone}${smsInfo.message?`?body=${encodeURIComponent(smsInfo.message)}`:""}`:""
    }
    if(activeTab==="contact"&&(contact.firstName||contact.phone||contact.email))
      return `BEGIN:VCARD\nVERSION:3.0\nFN:${contact.firstName} ${contact.lastName}\nN:${contact.lastName};${contact.firstName};;;\nORG:${contact.organization}\nTEL:${contact.phone}\nEMAIL:${contact.email}\nURL:${contact.url}\nEND:VCARD`;
    if(activeTab==="file") return fileDataUrl;
    return "";
  },[activeTab,urlInput,textInput,wifi,emailInfo,smsInfo,emailOrSms,contact,fileDataUrl,isDynamic,savedDynamic]);

  // ── Draw QR ────────────────────────────────────────────────────────────────
  const drawQR = useCallback(async(text,container)=>{
    if(!container){return;}
    container.innerHTML="";
    if(!text) return;
    try{
      const{modules}=await getQRMatrix(text,qrSize);
      const canvas=document.createElement("canvas");
      canvas.style.cssText=`max-width:${qrSize}px;height:auto;border-radius:12px;display:block;`;
      container.appendChild(canvas);
      renderCustomQR(canvas,modules,qrSize,qrColor,qrBg,qrShape);
      if(embedLogo){
        const ctx=canvas.getContext("2d"),img=new Image();
        img.src=logo;
        img.onload=()=>{const ls=qrSize*0.18,x=(canvas.width-ls)/2,y=(canvas.height-ls)/2;ctx.fillStyle=qrBg;ctx.fillRect(x-5,y-5,ls+10,ls+10);ctx.drawImage(img,x,y,ls,ls);};
      }
    }catch{
      await loadQRious();
      const canvas=document.createElement("canvas");
      container.appendChild(canvas);
      new window.QRious({element:canvas,value:text,size:qrSize,background:qrBg,foreground:qrColor,level:"H"});
      canvas.style.cssText=`max-width:${qrSize}px;height:auto;border-radius:12px;display:block;`;
    }
  },[qrSize,qrBg,qrColor,qrShape,embedLogo]);

  // ── Effect ─────────────────────────────────────────────────────────────────
  useEffect(()=>{
    const raw=buildData();
    if(!raw){setQrData("");if(qrRef.current)qrRef.current.innerHTML="";return;}
    if(useExpiry&&expiryDate&&new Date()>new Date(expiryDate)){
      setExpired(true);setQrData("");if(qrRef.current)qrRef.current.innerHTML="";return;
    }
    setExpired(false);
    const final=usePassword&&qrPassword?`${raw}|PWD:${qrPassword}`:raw;
    setQrData(final);
    drawQR(final,qrRef.current);
    if(final!==history[0]?.data){
      const entry={data:final,tab:activeTab,time:new Date().toLocaleTimeString()};
      const next=[entry,...history.slice(0,14)];
      setHistory(next);localStorage.setItem("qraft_history",JSON.stringify(next));
      const c=scanCount+1;setScanCount(c);localStorage.setItem("qraft_scans",c);
    }
  },[buildData,drawQR,useExpiry,expiryDate,usePassword,qrPassword]);

  // ── Save Dynamic QR to Firestore ───────────────────────────────────────────
  const saveDynamicQR = async () => {
    if(!user){ setShowAuth(true); toast.info("Please sign in to save dynamic QR codes"); return; }
    const raw = buildData();
    if(!raw){ toast.error("Please fill in the form first."); return; }
    setSavingDynamic(true);
    try {
      const shortId = genId();
      const docRef = await addDoc(collection(db,"qrcodes"),{
        uid: user.uid, shortId,
        destination: raw,
        label: dynamicLabel || "Untitled QR",
        scans: 0, qrColor, qrBg, qrShape,
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      setSavedDynamic({ id:docRef.id, shortId, destination:raw });
      toast.success("Dynamic QR saved! Edit it anytime from My QR Codes.");
    } catch(e){
      console.error(e);
      toast.error("Failed to save. Check your connection and try again.");
    }
    finally{ setSavingDynamic(false); }
  };

  // ── File upload ────────────────────────────────────────────────────────────
  const processFile = async(f)=>{
    setFileError("");setUploadError("");setUploadedUrl("");setFileDataUrl("");setUploadStatus("");
    const ok=["application/pdf","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if(!ok.includes(f.type)){setFileError("Only PDF / DOC / DOCX supported.");return;}
    if(f.size>100*1024*1024){setFileError("Max file size is 100MB.");return;}
    setUploadedFile(f);setUploading(true);
    try{const url=await uploadFile(f,msg=>setUploadStatus(msg));setUploadedUrl(url);setFileDataUrl(url);}
    catch(err){setUploadError(err.message);setUploadedFile(null);}
    finally{setUploading(false);setUploadStatus("");}
  };

  // ── Actions ────────────────────────────────────────────────────────────────
  const getCanvas=()=>qrRef.current?.querySelector("canvas");
  const downloadQR=()=>{
    const c=getCanvas();if(!c){toast.error("No QR code to download yet!");return;}
    const a=document.createElement("a");a.download=`qraft-${activeTab}.png`;a.href=c.toDataURL("image/png");a.click();
    toast.success("QR code downloaded!");
  };
  const printQR=()=>{
    const c=getCanvas();if(!c){toast.error("No QR code to print yet!");return;}
    const w=window.open("","_blank");
    w.document.write(`<!DOCTYPE html><html><head><title>QRaft</title><style>body{margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;}img{max-width:300px;}h2{margin-top:12px;}button{margin-top:16px;padding:8px 24px;cursor:pointer;}@media print{button{display:none;}}</style></head><body><img src="${c.toDataURL()}"/><h2>QRaft</h2><button onclick="window.print()">Print</button></body></html>`);
    w.document.close();setTimeout(()=>w.print(),500);
  };
  const shareQR=async()=>{
    const c=getCanvas();if(!c){toast.error("No QR code to share yet!");return;}
    c.toBlob(async(blob)=>{
      const file=new File([blob],"qraft-qr.png",{type:"image/png"});
      if(navigator.canShare?.({files:[file]})){try{await navigator.share({title:"QRaft QR Code",files:[file]});toast.success("Shared!");return;}catch{}}
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    });
  };
  const copyData=async()=>{
    if(!qrData){toast.error("No QR data to copy!");return;}
    await navigator.clipboard.writeText(qrData);
    toast.success("QR data copied!");
    setCopied(true);setTimeout(()=>setCopied(false),2000);
  };
  const resetForm=()=>{
    setUrlInput("");setTextInput("");
    setContact({firstName:"",lastName:"",phone:"",email:"",organization:"",url:""});
    setWifi({ssid:"",password:"",security:"WPA",hidden:false});
    setEmailInfo({to:"",subject:"",body:""});setSmsInfo({phone:"",message:""});
    setUploadedFile(null);setFileDataUrl("");setFileError("");
    setUploadedUrl("");setUploadError("");setUploadStatus("");
    setUseExpiry(false);setExpiryDate("");setUsePassword(false);setQrPassword("");
    setIsDynamic(false);setDynamicLabel("");setSavedDynamic(null);
    setQrData("");if(qrRef.current)qrRef.current.innerHTML="";
    if(fileRef.current)fileRef.current.value="";
    toast.info("All fields cleared.");
  };
  const applyTemplate = t => {
    setQrColor(t.fg); setQrBg(t.bg); setQrShape(t.shape);
    setActiveTemplate(t.id);
    // Force QR redraw with new colors
    const raw = buildData();
    if (raw) {
      const final = usePassword && qrPassword ? `${raw}|PWD:${qrPassword}` : raw;
      setTimeout(() => drawQR(final, qrRef.current), 50);
    }
    toast.success(`Template "${t.label}" applied!`);
  };

  // ── Styles ─────────────────────────────────────────────────────────────────
  const bg      = dm?"bg-[#0a0a14]":"bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100";
  const card    = dm?"bg-[#12121f] border border-white/10":"bg-white border border-gray-100";
  const txt     = dm?"text-white":"text-gray-900";
  const sub     = dm?"text-gray-400":"text-gray-500";
  const accent  = dm?"text-cyan-400":"text-purple-600";
  const inp     = `w-full px-4 py-3 rounded-xl border text-base transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 ${dm?"bg-[#1a1a2e] border-white/10 text-white placeholder-gray-500":"bg-white border-gray-200 text-gray-900"}`;
  const lbl     = `block text-sm font-semibold uppercase tracking-wide mb-1.5 ${dm?"text-gray-300":"text-gray-600"}`;
  const panelBg = dm?"bg-[#1a1a2e] border border-white/5":"bg-gray-50 border border-gray-200";
  const ghost   = `flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all ${dm?"bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10":"bg-gray-100 text-gray-700 hover:bg-gray-200"}`;

  return (
    <div className={`min-h-screen ${bg} transition-colors duration-300`}>
      {dm&&(<div className="fixed inset-0 pointer-events-none overflow-hidden z-0"><div style={{position:"absolute",top:"-15%",left:"-10%",width:600,height:600,borderRadius:"50%",background:"radial-gradient(circle,#00f5ff18,transparent 70%)",animation:"blob 8s ease-in-out infinite"}}/><div style={{position:"absolute",bottom:"-15%",right:"-10%",width:500,height:500,borderRadius:"50%",background:"radial-gradient(circle,#a855f718,transparent 70%)",animation:"blob 10s ease-in-out infinite reverse"}}/><style>{`@keyframes blob{0%,100%{transform:scale(1)}50%{transform:scale(1.12) translate(15px,-15px)}}`}</style></div>)}

      {showAnalytics && user && (
        <Analytics
          user={user} dm={dm}
          qrCodes={qrCodes}
          onClose={() => setShowAnalytics(false)}
        />
      )}
      {/* Modals */}
      {showAuth      && <AuthModal dm={dm} onClose={()=>setShowAuth(false)}/>}
      {showDashboard && user && <Dashboard user={user} dm={dm} onClose={()=>setShowDashboard(false)} onEdit={qr=>{setShowDashboard(false);drawQR(SHORT_BASE+qr.shortId,qrRef.current);}}/>}

      {/* Fullscreen */}
      {fullscreen && qrData && (
        <FullscreenQR
          qrData={qrData}
          qrColor={qrColor}
          qrBg={qrBg}
          qrShape={qrShape}
          embedLogo={embedLogo}
          onClose={() => setFullscreen(false)}
        />
      )}

      <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 relative z-10 pb-24 md:pb-10">

        {/* ── Top bar ── */}
        <div className="flex items-center justify-between mb-2 sm:mb-4">
          <div className="flex items-center gap-2">
            <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${dm?"bg-[#1a1a2e] text-cyan-400 border border-cyan-500/20":"bg-white text-purple-600 shadow"}`}>⚡ {scanCount} crafted</div>
          </div>
          <div className="flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-2">
                <button onClick={()=>setShowAnalytics(true)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${dm?"bg-purple-400/10 text-purple-400 border border-purple-400/20 hover:bg-purple-400/20":"bg-purple-50 text-purple-600 border border-purple-200 hover:bg-purple-100"}`}>
                  <BarChart2 className="w-3 h-3"/> <span className="hidden sm:inline">Analytics</span>
                </button>
                <button onClick={()=>{setShowDashboard(true);fetchQrCodes(user.uid);}} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${dm?"bg-cyan-400/10 text-cyan-400 border border-cyan-400/20 hover:bg-cyan-400/20":"bg-cyan-50 text-cyan-600 border border-cyan-200 hover:bg-cyan-100"}`}>
                  <LayoutDashboard className="w-3 h-3"/> <span className="hidden sm:inline">My QR Codes</span>
                </button>
                <button onClick={()=>signOut(auth)} className={`p-2 rounded-full transition-all ${dm?"bg-[#1a1a2e] text-gray-400 border border-white/10 hover:text-red-400":"bg-white text-gray-500 shadow hover:text-red-500"}`} title="Sign out"><LogOut className="w-4 h-4"/></button>
              </div>
            ) : (
              <button onClick={()=>setShowAuth(true)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${dm?"bg-cyan-400/10 text-cyan-400 border border-cyan-400/20 hover:bg-cyan-400/20":"bg-purple-50 text-purple-600 border border-purple-200 hover:bg-purple-100"}`}>
                <LogIn className="w-3 h-3"/> Sign In
              </button>
            )}
            <button onClick={()=>setDarkMode(!dm)} className={`p-2 rounded-full transition-all ${dm?"bg-[#1a1a2e] text-yellow-400 border border-yellow-400/20":"bg-white text-gray-600 shadow"}`}>
              {dm?<Sun className="w-4 h-4 sm:w-5 sm:h-5"/>:<Moon className="w-4 h-4 sm:w-5 sm:h-5"/>}
            </button>
          </div>
        </div>

        {/* ── Centered hero header ── */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <img src={logo} alt="QRaft" className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl shadow-lg" style={dm?{boxShadow:"0 0 24px #00f5ff66"}:{boxShadow:"0 4px 20px rgba(124,58,237,0.3)"}}/>
            <span className="text-4xl sm:text-5xl font-black tracking-tight" style={dm?{background:"linear-gradient(135deg,#00f5ff,#a855f7)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}:{background:"linear-gradient(135deg,#7c3aed,#2563eb)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
              QRaft
            </span>
          </div>
          <h1 className={`text-lg sm:text-xl lg:text-2xl font-semibold mb-1 ${txt}`}>Craft stunning QR codes in seconds</h1>
          <p className={`text-sm sm:text-base ${sub}`}>URLs · Text · WiFi · Contacts · Email · Files · Dynamic</p>
        </div>

        {/* Main card */}
        <div className={`${card} rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden`} style={dm?{boxShadow:"0 0 60px #00f5ff0d,0 25px 50px #00000090"}:{}}>
          {/* Tabs */}
          <div className={`hidden sm:flex border-b ${dm?"border-white/10":"border-gray-200"} overflow-x-auto`}>
            {TABS.map(({id,label,icon:Icon})=>(
              <button key={id} onClick={()=>setActiveTab(id)}
                className={`flex-1 min-w-[80px] flex items-center justify-center gap-1.5 py-3 sm:py-4 text-xs sm:text-sm font-medium transition-all whitespace-nowrap px-2 ${activeTab===id?dm?"text-cyan-400 border-b-2 border-cyan-400 bg-cyan-400/5":"text-purple-600 border-b-2 border-purple-600 bg-purple-50":dm?"text-gray-500 hover:text-gray-300 hover:bg-white/5":"text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}>
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4"/>{label}
              </button>
            ))}
          </div>

          <div className="p-4 sm:p-6 lg:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-10">

              {/* ── LEFT ── */}
              <div className="space-y-4">
                <h2 className={`text-lg sm:text-xl font-bold ${txt}`}>
                  {activeTab==="url"&&"🔗 Enter URL"}{activeTab==="text"&&"✏️ Enter Text"}
                  {activeTab==="contact"&&"👤 Contact Info"}{activeTab==="wifi"&&"📶 WiFi Details"}
                  {activeTab==="email"&&"✉️ Email / SMS"}{activeTab==="file"&&"📄 Upload Document"}
                </h2>

                {activeTab==="url"&&(<div><label className={lbl}>Website URL</label><input type="text" value={urlInput} onChange={e=>setUrlInput(e.target.value)} placeholder="e.g. google.com" className={inp}/><p className={`text-xs mt-1 ${sub}`}>https:// added automatically if omitted.</p></div>)}
                {activeTab==="text"&&(<div><label className={lbl}>Text Content</label><textarea value={textInput} onChange={e=>setTextInput(e.target.value)} placeholder="Type anything here..." rows={5} className={inp+" resize-none"}/></div>)}
                {activeTab==="contact"&&(<div className="space-y-3"><div className="grid grid-cols-2 gap-3"><div><label className={lbl}>First Name</label><input value={contact.firstName} onChange={e=>setContact({...contact,firstName:e.target.value})} placeholder="John" className={inp}/></div><div><label className={lbl}>Last Name</label><input value={contact.lastName} onChange={e=>setContact({...contact,lastName:e.target.value})} placeholder="Doe" className={inp}/></div></div><div><label className={lbl}>Phone</label><input type="tel" value={contact.phone} onChange={e=>setContact({...contact,phone:e.target.value})} placeholder="+1 555 123 4567" className={inp}/></div><div><label className={lbl}>Email</label><input type="email" value={contact.email} onChange={e=>setContact({...contact,email:e.target.value})} placeholder="john@example.com" className={inp}/></div><div><label className={lbl}>Organization</label><input value={contact.organization} onChange={e=>setContact({...contact,organization:e.target.value})} placeholder="Company Name" className={inp}/></div><div><label className={lbl}>Website</label><input type="text" value={contact.url} onChange={e=>setContact({...contact,url:e.target.value})} placeholder="https://example.com" className={inp}/></div></div>)}
                {activeTab==="wifi"&&(<div className="space-y-3"><div><label className={lbl}>Network Name (SSID)</label><input value={wifi.ssid} onChange={e=>setWifi({...wifi,ssid:e.target.value})} placeholder="MyWiFiNetwork" className={inp}/></div><div><label className={lbl}>Password</label><input type="password" value={wifi.password} onChange={e=>setWifi({...wifi,password:e.target.value})} placeholder="••••••••" className={inp}/></div><div><label className={lbl}>Security Type</label><select value={wifi.security} onChange={e=>setWifi({...wifi,security:e.target.value})} className={inp}><option value="WPA">WPA/WPA2</option><option value="WEP">WEP</option><option value="nopass">None</option></select></div><div className="flex items-center justify-between py-1"><label className={`text-sm ${txt}`}>Hidden Network</label><Toggle value={wifi.hidden} onChange={v=>setWifi({...wifi,hidden:v})} dm={dm}/></div></div>)}
                {activeTab==="email"&&(<div className="space-y-3"><div className={`flex rounded-xl overflow-hidden border ${dm?"border-white/10":"border-gray-200"}`}>{["email","sms"].map(t=>(<button key={t} onClick={()=>setEmailOrSms(t)} className={`flex-1 py-2.5 text-sm font-semibold transition-all ${emailOrSms===t?dm?"bg-cyan-500/20 text-cyan-400":"bg-purple-100 text-purple-700":dm?"text-gray-500 hover:bg-white/5":"text-gray-400 hover:bg-gray-50"}`}>{t==="email"?"✉️ Email":"💬 SMS"}</button>))}</div>{emailOrSms==="email"?(<><div><label className={lbl}>To</label><input type="email" value={emailInfo.to} onChange={e=>setEmailInfo({...emailInfo,to:e.target.value})} placeholder="recipient@example.com" className={inp}/></div><div><label className={lbl}>Subject</label><input value={emailInfo.subject} onChange={e=>setEmailInfo({...emailInfo,subject:e.target.value})} placeholder="Hello!" className={inp}/></div><div><label className={lbl}>Body</label><textarea value={emailInfo.body} onChange={e=>setEmailInfo({...emailInfo,body:e.target.value})} placeholder="Your message..." rows={3} className={inp+" resize-none"}/></div></>):(<><div><label className={lbl}>Phone Number</label><input type="tel" value={smsInfo.phone} onChange={e=>setSmsInfo({...smsInfo,phone:e.target.value})} placeholder="+1 555 000 0000" className={inp}/></div><div><label className={lbl}>Message</label><textarea value={smsInfo.message} onChange={e=>setSmsInfo({...smsInfo,message:e.target.value})} placeholder="Your message..." rows={3} className={inp+" resize-none"}/></div></>)}</div>)}
                {activeTab==="file"&&(
                  <div className="space-y-3">
                    <div onDragOver={e=>{e.preventDefault();setIsDragging(true)}} onDragLeave={()=>setIsDragging(false)} onDrop={e=>{e.preventDefault();setIsDragging(false);if(e.dataTransfer.files[0])processFile(e.dataTransfer.files[0])}} onClick={()=>!uploadedFile&&!uploading&&fileRef.current?.click()} className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${isDragging?"border-cyan-400 bg-cyan-400/10":uploadedFile?"border-green-400 bg-green-400/10":dm?"border-gray-700 hover:border-cyan-400 hover:bg-cyan-400/5":"border-gray-300 hover:border-purple-400 hover:bg-purple-50"}`}>
                      <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" onChange={e=>e.target.files[0]&&processFile(e.target.files[0])} className="hidden"/>
                      {uploading?(<div className="py-2"><div className={`w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-2 ${dm?"border-cyan-400":"border-purple-500"}`}/><p className={`text-sm font-medium ${txt}`}>{uploadStatus||"Uploading…"}</p></div>):uploadedFile?(<div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${uploadedUrl?dm?"bg-green-400/20":"bg-green-100":dm?"bg-cyan-400/20":"bg-purple-100"}`}><FileText className={`w-4 h-4 ${uploadedUrl?dm?"text-green-400":"text-green-600":accent}`}/></div><div className="text-left min-w-0"><p className={`font-semibold text-sm truncate max-w-[140px] ${txt}`}>{uploadedFile.name}</p><p className={`text-xs ${uploadedUrl?"text-green-400":"text-yellow-400"}`}>{uploadedUrl?"✓ Uploaded!":"Processing…"}</p></div></div><button onClick={e=>{e.stopPropagation();setUploadedFile(null);setFileDataUrl("");setUploadedUrl("");setFileError("");setUploadError("");if(fileRef.current)fileRef.current.value=""}} className="p-1.5 hover:bg-red-500/20 rounded-lg text-gray-400 hover:text-red-400 flex-shrink-0"><X className="w-4 h-4"/></button></div>):(<><Upload className={`w-8 h-8 mx-auto mb-2 ${dm?"text-gray-600":"text-gray-300"}`}/><p className={`font-medium text-sm ${txt}`}>Drop or click to upload</p><p className={`text-xs mt-1 ${sub}`}>PDF, DOC, DOCX — up to 100MB</p></>)}
                    </div>
                    {fileError&&<p className={`text-xs px-3 py-2 rounded-xl ${dm?"bg-red-500/10 border border-red-500/20 text-red-400":"bg-red-50 border border-red-200 text-red-600"}`}>{fileError}</p>}
                    {uploadError&&<p className={`text-xs px-3 py-2 rounded-xl ${dm?"bg-red-500/10 border border-red-500/20 text-red-400":"bg-red-50 border border-red-200 text-red-600"}`}>{uploadError}</p>}
                    {uploadedUrl&&<div className={`text-xs px-3 py-2 rounded-xl space-y-1 ${dm?"bg-green-500/10 border border-green-500/20 text-green-300":"bg-green-50 border border-green-200 text-green-700"}`}><p className="font-bold">✅ Hosted!</p><p className="break-all font-mono opacity-80">{uploadedUrl}</p><p className="opacity-60">⏳ Expires in 7 days.</p></div>}
                    <p className={`text-xs px-3 py-2 rounded-xl ${dm?"bg-blue-400/10 border border-blue-400/20 text-blue-300":"bg-blue-50 border border-blue-200 text-blue-700"}`}>🔒 Anonymous upload via <strong>file.io</strong></p>
                  </div>
                )}

                {/* ── Dynamic QR panel ── */}
                <div className={`rounded-2xl p-4 space-y-3 ${panelBg}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <RefreshCw className={`w-4 h-4 ${accent}`}/>
                      <span className={`text-sm font-bold ${txt}`}>Dynamic QR Code</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${dm?"bg-cyan-400/20 text-cyan-400":"bg-purple-100 text-purple-600"}`}>PRO</span>
                    </div>
                    <Toggle value={isDynamic} onChange={v=>{setIsDynamic(v);setSavedDynamic(null);}} dm={dm}/>
                  </div>
                  {isDynamic && (
                    <>
                      <p className={`text-xs ${sub}`}>Dynamic QR codes can be edited after printing. The QR always points to a short link that redirects to your destination.</p>
                      <input value={dynamicLabel} onChange={e=>setDynamicLabel(e.target.value)} placeholder="Label (e.g. My Business Card)" className={inp}/>
                      {savedDynamic ? (
                        <div className={`text-xs px-3 py-2 rounded-xl space-y-1 ${dm?"bg-green-500/10 border border-green-500/20 text-green-300":"bg-green-50 border border-green-200 text-green-700"}`}>
                          <p className="font-bold">✅ Dynamic QR saved!</p>
                          <p className="font-mono break-all opacity-80">{SHORT_BASE}{savedDynamic.shortId}</p>
                          <p className="opacity-60">Edit the destination anytime from My QR Codes.</p>
                        </div>
                      ) : (
                        <button onClick={saveDynamicQR} disabled={savingDynamic}
                          className="w-full py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2"
                          style={{background:"linear-gradient(135deg,#00f5ff,#a855f7)"}}>
                          {savingDynamic?<><div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"/>Saving…</>:<><Plus className="w-4 h-4"/>Save as Dynamic QR</>}
                        </button>
                      )}
                    </>
                  )}
                </div>

                {/* Security */}
                <div className={`rounded-2xl p-4 space-y-3 ${panelBg}`}>
                  <div className="flex items-center gap-2"><Lock className={`w-4 h-4 ${accent}`}/><span className={`text-sm font-bold ${txt}`}>Security</span></div>
                  <div className="flex items-center justify-between"><label className={`text-sm ${txt}`}>Set expiry date</label><Toggle value={useExpiry} onChange={setUseExpiry} dm={dm}/></div>
                  {useExpiry&&<input type="datetime-local" value={expiryDate} onChange={e=>setExpiryDate(e.target.value)} className={inp}/>}
                  {expired&&<p className="text-xs text-red-400 font-semibold">⚠️ This QR code has expired.</p>}
                  <div className="flex items-center justify-between"><label className={`text-sm ${txt}`}>Password protect</label><Toggle value={usePassword} onChange={setUsePassword} dm={dm}/></div>
                  {usePassword&&(<div className="relative"><input type={pwVisible?"text":"password"} value={qrPassword} onChange={e=>setQrPassword(e.target.value)} placeholder="Enter password" className={inp+" pr-10"}/><button onClick={()=>setPwVisible(!pwVisible)} className={`absolute right-3 top-3.5 ${sub}`}>{pwVisible?<Unlock className="w-4 h-4"/>:<Lock className="w-4 h-4"/>}</button></div>)}
                </div>

                <button onClick={resetForm} className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${dm?"bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10":"bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>🗑 Clear All Fields</button>
              </div>

              {/* ── RIGHT ── */}
              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center justify-between w-full">
                  <h2 className={`text-base sm:text-lg font-bold ${txt}`}>Generated QR</h2>
                  <button onClick={()=>setShowHistory(!showHistory)} className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold ${dm?"bg-cyan-400/10 text-cyan-400 border border-cyan-400/20":"bg-purple-50 text-purple-600 border border-purple-200"}`}><History className="w-3 h-3"/> {history.length}</button>
                </div>

                {showHistory&&history.length>0&&(
                  <div className={`w-full rounded-2xl p-3 space-y-1 max-h-40 overflow-y-auto ${panelBg}`}>
                    {history.map((h,i)=>(<button key={i} onClick={()=>{setActiveTab(h.tab);if(h.tab==="url")setUrlInput(h.data);if(h.tab==="text")setTextInput(h.data);setShowHistory(false);}} className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all ${dm?"hover:bg-white/5 text-gray-300":"hover:bg-gray-100 text-gray-600"}`}><span className={`font-bold uppercase mr-2 ${accent}`}>{h.tab}</span><span>{h.data.substring(0,32)}{h.data.length>32?"...":""}</span><span className={`float-right ${sub}`}>{h.time}</span></button>))}
                  </div>
                )}

                <div className={`relative w-full rounded-2xl p-4 sm:p-6 flex items-center justify-center min-h-[260px] sm:min-h-[300px] ${dm?"bg-[#1a1a2e] border border-white/5":"bg-gray-50 border border-gray-200"}`} style={dm&&qrData?{boxShadow:`0 0 50px ${qrColor}28`}:{}}>
                  {qrData?(
                    <div className="text-center">
                      <div ref={qrRef} className="flex justify-center"/>
                      {isDynamic&&savedDynamic&&<div className={`mt-2 text-[10px] font-semibold px-2 py-1 rounded-full ${dm?"bg-cyan-400/20 text-cyan-400":"bg-purple-100 text-purple-600"}`}>⚡ Dynamic — editable anytime</div>}
                      <p className={`text-xs mt-2 ${sub}`}>Scan with your device camera</p>
                      <button onClick={()=>setFullscreen(true)} className={`mt-1 flex items-center gap-1 mx-auto text-xs ${accent} opacity-70 hover:opacity-100`}><Maximize2 className="w-3 h-3"/> Fullscreen</button>
                    </div>
                  ):(
                    <div className="text-center"><QrCode className={`w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-3 ${dm?"text-gray-700":"text-gray-300"}`}/><p className={`text-sm ${sub}`}>Fill in the form to generate your QR code</p></div>
                  )}
                </div>

                {qrData&&(
                  <div className="grid grid-cols-2 gap-2 w-full">
                    <button onClick={downloadQR} className="col-span-2 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white shadow-lg hover:opacity-90 active:scale-95 transition-all" style={{background:"linear-gradient(135deg,#00f5ff,#a855f7)"}}><Download className="w-4 h-4"/> Save QR Code</button>
                    <button onClick={printQR}  className={ghost}><Printer className="w-4 h-4"/> Print</button>
                    <button onClick={shareQR}  className={ghost}><Share2   className="w-4 h-4"/> {shareMsg||"Share"}</button>
                    <button onClick={copyData} className={`col-span-2 ${ghost}`}>{copied?<><Check className="w-4 h-4 text-green-400"/> Copied!</>:<><Copy className="w-4 h-4"/> Copy Data</>}</button>
                  </div>
                )}

                {/* Templates */}
                <div className={`w-full rounded-2xl overflow-hidden ${panelBg}`}>
                  <button onClick={()=>setShowTemplates(!showTemplates)} className={`w-full flex items-center justify-between px-4 py-3 ${txt}`}>
                    <div className="flex items-center gap-2"><Grid className={`w-4 h-4 ${accent}`}/><span className="text-sm font-bold">Template Gallery</span><span className={`text-xs px-2 py-0.5 rounded-full ${dm?"bg-cyan-400/20 text-cyan-400":"bg-purple-100 text-purple-600"}`}>{TEMPLATES.length}</span></div>
                    {showTemplates?<ChevronUp className="w-4 h-4"/>:<ChevronDown className="w-4 h-4"/>}
                  </button>
                  {showTemplates&&(
                    <div className="px-4 pb-4 grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {TEMPLATES.map(t=>(
                        <button key={t.id} onClick={()=>applyTemplate(t)} className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all ${activeTemplate===t.id?dm?"border-cyan-400 bg-cyan-400/10":"border-purple-400 bg-purple-50":dm?"border-white/10 hover:border-white/20 hover:bg-white/5":"border-gray-200 hover:border-gray-300"}`}>
                          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center" style={{background:t.bg}}>
                            <div className="grid grid-cols-3 gap-[1.5px]">{[...Array(9)].map((_,i)=>(<div key={i} style={{width:8,height:8,borderRadius:t.shape==="dots"?"50%":t.shape==="rounded"?"2px":"0",background:[0,2,6,8].includes(i)?t.fg:"transparent",border:[0,2,6,8].includes(i)?"none":`1px solid ${t.fg}44`}}/>))}</div>
                          </div>
                          <span className={`text-[9px] sm:text-[10px] font-semibold ${activeTemplate===t.id?accent:sub}`}>{t.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Custom Design */}
                <div className={`w-full rounded-2xl overflow-hidden ${panelBg}`}>
                  <button onClick={()=>setShowCustom(!showCustom)} className={`w-full flex items-center justify-between px-4 py-3 ${txt}`}>
                    <div className="flex items-center gap-2"><Palette className={`w-4 h-4 ${accent}`}/><span className="text-sm font-bold">Custom Design</span></div>
                    {showCustom?<ChevronUp className="w-4 h-4"/>:<ChevronDown className="w-4 h-4"/>}
                  </button>
                  {showCustom&&(
                    <div className="px-4 pb-4 space-y-4">
                      <div>
                        <label className={lbl}>QR Shape Style</label>
                        <div className="grid grid-cols-5 gap-1.5">
                          {SHAPES.map(s=>(<button key={s.id} onClick={()=>{setQrShape(s.id);setActiveTemplate("");}} className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl border text-xs font-semibold transition-all ${qrShape===s.id?dm?"border-cyan-400 bg-cyan-400/10 text-cyan-400":"border-purple-400 bg-purple-50 text-purple-600":dm?"border-white/10 text-gray-400 hover:border-white/20":"border-gray-200 text-gray-500"}`}><div className="w-5 h-5 flex items-center justify-center">{s.id==="square"&&<div className="w-4 h-4 bg-current rounded-sm"/>}{s.id==="rounded"&&<div className="w-4 h-4 bg-current rounded-lg"/>}{s.id==="dots"&&<div className="w-4 h-4 bg-current rounded-full"/>}{s.id==="stars"&&<span className="text-sm">✦</span>}{s.id==="diamond"&&<div className="w-3 h-3 bg-current rotate-45"/>}</div><span className="text-[9px] sm:text-xs">{s.label}</span></button>))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className={lbl}>QR Color</label><div className="flex items-center gap-2"><input type="color" value={qrColor} onChange={e=>{setQrColor(e.target.value);setActiveTemplate("");}} className="w-9 h-9 rounded-lg cursor-pointer border-0 bg-transparent"/><span className={`text-xs font-mono ${sub}`}>{qrColor}</span></div></div>
                        <div><label className={lbl}>Background</label><div className="flex items-center gap-2"><input type="color" value={qrBg} onChange={e=>{setQrBg(e.target.value);setActiveTemplate("");}} className="w-9 h-9 rounded-lg cursor-pointer border-0 bg-transparent"/><span className={`text-xs font-mono ${sub}`}>{qrBg}</span></div></div>
                      </div>
                      <div><label className={lbl}><Sliders className="w-3 h-3 inline mr-1"/>Size: {qrSize}px</label><input type="range" min="150" max="400" value={qrSize} onChange={e=>setQrSize(Number(e.target.value))} className="w-full accent-cyan-400"/></div>
                      <div className="flex items-center justify-between"><label className={`text-sm ${txt}`}>Embed logo in center</label><Toggle value={embedLogo} onChange={setEmbedLogo} dm={dm}/></div>
                    </div>
                  )}
                </div>

                {qrData&&activeTab!=="file"&&(<div className="w-full"><p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${sub}`}>QR Data</p><div className={`rounded-xl p-3 text-xs max-h-20 overflow-y-auto font-mono ${dm?"bg-[#1a1a2e] text-gray-400 border border-white/5":"bg-gray-100 text-gray-600"}`}><pre className="whitespace-pre-wrap break-all">{qrData}</pre></div></div>)}
                {qrData&&activeTab==="file"&&(<p className={`w-full text-xs px-3 py-2 rounded-xl ${dm?"bg-green-500/10 border border-green-500/20 text-green-400":"bg-green-50 border border-green-200 text-green-700"}`}>✓ File encoded successfully.</p>)}
              </div>
            </div>
          </div>
        </div>
        <p className={`text-center mt-4 sm:mt-6 text-xs ${sub}`}>QRaft • No data stored • Free to use</p>
      </div>

      {/* Mobile bottom nav */}
      <div className={`fixed bottom-0 left-0 right-0 sm:hidden z-40 backdrop-blur-md ${dm?"bg-[#12121f]/95 border-t border-white/10":"bg-white/95 border-t border-gray-200"}`}>
        <nav className="flex justify-around px-1 py-1.5">
          {TABS.map(({id,label,icon:Icon})=>(
            <button key={id} onClick={()=>setActiveTab(id)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all duration-200 relative ${activeTab===id?dm?"text-cyan-400 bg-cyan-400/10":"text-purple-600 bg-purple-50":dm?"text-gray-600":"text-gray-400"}`}>
              <Icon className="w-5 h-5"/>
              <span className="text-[9px] font-semibold">{label}</span>
              {/* Active indicator dot */}
              {activeTab===id && (
                <span className={`absolute -top-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${dm?"bg-cyan-400":"bg-purple-600"}`}/>
              )}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
