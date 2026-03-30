// src/Analytics.js
import { useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { X, RefreshCw, TrendingUp, Smartphone, Globe, QrCode } from "lucide-react";

const COLORS = ["#00f5ff","#a855f7","#f59e0b","#ef4444","#10b981","#3b82f6","#ec4899","#84cc16"];

// ── Helpers ───────────────────────────────────────────────────────────────────
function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    const k = item[key] || "Unknown";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
}

function toChartData(obj) {
  return Object.entries(obj)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function formatDate(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function groupByDay(scans) {
  const map = {};
  scans.forEach(s => {
    const key = formatDate(s.scannedAt);
    if (key) map[key] = (map[key] || 0) + 1;
  });
  return Object.entries(map).map(([date, scans]) => ({ date, scans })).slice(-14);
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color, dm }) {
  return (
    <div className={`rounded-2xl p-4 flex items-center gap-4 ${dm?"bg-[#1a1a2e] border border-white/5":"bg-white border border-gray-100 shadow-sm"}`}>
      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: color + "22" }}>
        <Icon style={{ color }} className="w-6 h-6"/>
      </div>
      <div>
        <p className={`text-2xl font-black ${dm?"text-white":"text-gray-900"}`}>{value}</p>
        <p className={`text-xs font-medium ${dm?"text-gray-400":"text-gray-500"}`}>{label}</p>
      </div>
    </div>
  );
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label, dm }) {
  if (!active || !payload?.length) return null;
  return (
    <div className={`px-3 py-2 rounded-xl text-sm shadow-lg ${dm?"bg-[#1a1a2e] border border-white/10 text-white":"bg-white border border-gray-200 text-gray-900"}`}>
      <p className="font-semibold">{label}</p>
      <p style={{ color: "#00f5ff" }}>{payload[0].value} scans</p>
    </div>
  );
}

// ── Main Analytics Component ──────────────────────────────────────────────────
export default function Analytics({ user, dm, onClose, qrCodes = [] }) {
  const [scans,    setScans]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState("all"); // "all" or a qrId

  const card    = dm?"bg-[#12121f] border border-white/10":"bg-white border border-gray-200";
  const txt     = dm?"text-white":"text-gray-900";
  const sub     = dm?"text-gray-400":"text-gray-500";
  const panelBg = dm?"bg-[#1a1a2e] border border-white/5":"bg-gray-50 border border-gray-200";

  // ── Fetch scans ─────────────────────────────────────────────────────────────
  const fetchScans = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "scans"),
        where("uid", "==", user.uid),
        orderBy("scannedAt", "desc")
      );
      const snap = await getDocs(q);
      setScans(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchScans(); }, []);

  // ── Filter ──────────────────────────────────────────────────────────────────
  const filtered = selected === "all" ? scans : scans.filter(s => s.qrId === selected);

  // ── Derived data ────────────────────────────────────────────────────────────
  const totalScans   = filtered.length;
  const uniqueDays   = new Set(filtered.map(s => formatDate(s.scannedAt))).size;
  const topCountry   = toChartData(groupBy(filtered, "country"))[0]?.name || "—";
  const topDevice    = toChartData(groupBy(filtered, "device"))[0]?.name  || "—";
  const dailyData    = groupByDay(filtered);
  const deviceData   = toChartData(groupBy(filtered, "device"));
  const browserData  = toChartData(groupBy(filtered, "browser"));
  const osData       = toChartData(groupBy(filtered, "os"));
  const countryData  = toChartData(groupBy(filtered, "country")).slice(0, 10);
  const topQRs       = toChartData(groupBy(filtered, "shortId")).slice(0, 5);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4" onClick={onClose}>
      <div className={`${card} rounded-3xl w-full max-w-4xl shadow-2xl max-h-[95vh] flex flex-col`} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className={`flex items-center justify-between p-5 border-b ${dm?"border-white/10":"border-gray-200"}`}>
          <div>
            <h2 className={`text-xl font-black ${txt}`}>📊 Scan Analytics</h2>
            <p className={`text-xs mt-0.5 ${sub}`}>{user.email} · {totalScans} total scans</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchScans}
              className={`p-2 rounded-xl transition-all ${dm?"bg-white/5 hover:bg-white/10 text-gray-400":"bg-gray-100 hover:bg-gray-200 text-gray-600"}`}>
              <RefreshCw className="w-4 h-4"/>
            </button>
            <button onClick={onClose}
              className={`p-2 rounded-xl transition-all ${dm?"bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400":"bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-500"}`}>
              <X className="w-4 h-4"/>
            </button>
          </div>
        </div>

        {/* QR filter */}
        <div className={`px-5 py-3 border-b overflow-x-auto ${dm?"border-white/10":"border-gray-100"}`}>
          <div className="flex items-center gap-2 min-w-max">
            <button onClick={() => setSelected("all")}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${selected==="all"?dm?"bg-cyan-400/20 text-cyan-400 border border-cyan-400/30":"bg-purple-100 text-purple-700 border border-purple-200":dm?"bg-white/5 text-gray-400 hover:bg-white/10":"bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
              All QR Codes
            </button>
            {qrCodes.map(qr => (
              <button key={qr.id} onClick={() => setSelected(qr.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${selected===qr.id?dm?"bg-cyan-400/20 text-cyan-400 border border-cyan-400/30":"bg-purple-100 text-purple-700 border border-purple-200":dm?"bg-white/5 text-gray-400 hover:bg-white/10":"bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                {qr.label || qr.shortId}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-5 space-y-5">
          {loading ? (
            <div className="text-center py-16">
              <div className={`w-10 h-10 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3 ${dm?"border-cyan-400":"border-purple-500"}`}/>
              <p className={`text-sm ${sub}`}>Loading analytics…</p>
            </div>
          ) : totalScans === 0 ? (
            <div className="text-center py-16">
              <TrendingUp className={`w-12 h-12 mx-auto mb-3 ${dm?"text-gray-700":"text-gray-300"}`}/>
              <p className={`text-base font-bold ${txt}`}>No scans yet</p>
              <p className={`text-sm mt-1 ${sub}`}>Share your dynamic QR codes to start tracking scans.</p>
            </div>
          ) : (
            <>
              {/* Stat cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Total Scans"   value={totalScans}  icon={TrendingUp}  color="#00f5ff" dm={dm}/>
                <StatCard label="Active Days"   value={uniqueDays}  icon={QrCode}      color="#a855f7" dm={dm}/>
                <StatCard label="Top Device"    value={topDevice}   icon={Smartphone}  color="#f59e0b" dm={dm}/>
                <StatCard label="Top Country"   value={topCountry}  icon={Globe}       color="#10b981" dm={dm}/>
              </div>

              {/* Scans over time */}
              <div className={`rounded-2xl p-4 ${panelBg}`}>
                <h3 className={`text-sm font-bold mb-4 ${txt}`}>📈 Scans over time (last 14 days)</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={dailyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: dm?"#9ca3af":"#6b7280" }} axisLine={false} tickLine={false}/>
                    <YAxis tick={{ fontSize: 11, fill: dm?"#9ca3af":"#6b7280" }} axisLine={false} tickLine={false} allowDecimals={false}/>
                    <Tooltip content={<CustomTooltip dm={dm}/>}/>
                    <Bar dataKey="scans" fill="#00f5ff" radius={[6,6,0,0]} opacity={0.9}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Device + Browser row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Device pie */}
                <div className={`rounded-2xl p-4 ${panelBg}`}>
                  <h3 className={`text-sm font-bold mb-3 ${txt}`}>📱 Device breakdown</h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={deviceData} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                        dataKey="value" paddingAngle={3}>
                        {deviceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                      </Pie>
                      <Tooltip formatter={(v, n) => [v + " scans", n]}/>
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Browser pie */}
                <div className={`rounded-2xl p-4 ${panelBg}`}>
                  <h3 className={`text-sm font-bold mb-3 ${txt}`}>🌐 Browser breakdown</h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={browserData} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                        dataKey="value" paddingAngle={3}>
                        {browserData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                      </Pie>
                      <Tooltip formatter={(v, n) => [v + " scans", n]}/>
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* OS + Country row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* OS list */}
                <div className={`rounded-2xl p-4 ${panelBg}`}>
                  <h3 className={`text-sm font-bold mb-3 ${txt}`}>💻 Operating systems</h3>
                  <div className="space-y-2">
                    {osData.map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }}/>
                        <span className={`text-sm flex-1 ${txt}`}>{item.name}</span>
                        <span className={`text-xs font-bold ${dm?"text-cyan-400":"text-purple-600"}`}>{item.value}</span>
                        <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: dm?"rgba(255,255,255,0.1)":"#e5e7eb" }}>
                          <div className="h-full rounded-full" style={{ width: `${(item.value/totalScans)*100}%`, background: COLORS[i % COLORS.length] }}/>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Country list */}
                <div className={`rounded-2xl p-4 ${panelBg}`}>
                  <h3 className={`text-sm font-bold mb-3 ${txt}`}>🌍 Top countries</h3>
                  <div className="space-y-2">
                    {countryData.map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }}/>
                        <span className={`text-sm flex-1 truncate ${txt}`}>{item.name}</span>
                        <span className={`text-xs font-bold ${dm?"text-cyan-400":"text-purple-600"}`}>{item.value}</span>
                        <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: dm?"rgba(255,255,255,0.1)":"#e5e7eb" }}>
                          <div className="h-full rounded-full" style={{ width: `${(item.value/totalScans)*100}%`, background: COLORS[i % COLORS.length] }}/>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Top QR codes */}
              <div className={`rounded-2xl p-4 ${panelBg}`}>
                <h3 className={`text-sm font-bold mb-3 ${txt}`}>🏆 Top performing QR codes</h3>
                <div className="space-y-2">
                  {topQRs.map((item, i) => {
                    const qr = qrCodes.find(q => q.shortId === item.name);
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className={`text-xs font-black w-5 text-center ${dm?"text-gray-500":"text-gray-400"}`}>#{i+1}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold truncate ${txt}`}>{qr?.label || item.name}</p>
                          <p className={`text-xs truncate ${sub}`}>{qr?.destination || ""}</p>
                        </div>
                        <div className={`text-sm font-black flex-shrink-0 ${dm?"text-cyan-400":"text-purple-600"}`}>{item.value} scans</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recent scans table */}
              <div className={`rounded-2xl p-4 ${panelBg}`}>
                <h3 className={`text-sm font-bold mb-3 ${txt}`}>🕐 Recent scans</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className={`${sub} border-b ${dm?"border-white/10":"border-gray-200"}`}>
                        <th className="text-left py-2 pr-4 font-semibold">Time</th>
                        <th className="text-left py-2 pr-4 font-semibold">Device</th>
                        <th className="text-left py-2 pr-4 font-semibold">Browser</th>
                        <th className="text-left py-2 pr-4 font-semibold">OS</th>
                        <th className="text-left py-2 font-semibold">Country</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.slice(0, 20).map((s, i) => (
                        <tr key={i} className={`border-b ${dm?"border-white/5 text-gray-300":"border-gray-50 text-gray-700"}`}>
                          <td className="py-2 pr-4 whitespace-nowrap">{formatDate(s.scannedAt)}</td>
                          <td className="py-2 pr-4 capitalize">{s.device}</td>
                          <td className="py-2 pr-4">{s.browser}</td>
                          <td className="py-2 pr-4">{s.os}</td>
                          <td className="py-2">{s.country}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}