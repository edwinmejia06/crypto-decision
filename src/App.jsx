import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── FUENTE PREMIUM ────────────────────────────────────────────────
const fontLink = document.createElement("link");
fontLink.rel = "stylesheet";
fontLink.href = "https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap";
document.head.appendChild(fontLink);

// ─── LOGO CD ───────────────────────────────────────────────────────
const CDLogo = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
    <div style={{
      width: 36, height: 36, borderRadius: 12,
      background: "linear-gradient(135deg,#00c6ff,#7c3aed)",
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: "0 0 16px rgba(0,198,255,0.4)",
    }}>
      <span style={{ color: "#fff", fontWeight: 900, fontSize: 12, letterSpacing: -0.5 }}>CD</span>
    </div>
    <span style={{ fontFamily: "Outfit", fontWeight: 800, fontSize: 18, color: "#fff" }}>
      Crypto<span style={{ background: "linear-gradient(90deg,#00c6ff,#7c3aed)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Decision</span>
    </span>
  </div>
);

// ─── SPARKLINE SVG ─────────────────────────────────────────────────
const Sparkline = ({ data, isPositive }) => {
  if (!data || data.length < 2) return null;
  const w = 60, h = 28;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(" ");
  const color = isPositive ? "#4ade80" : "#f87171";
  const fillId = `fill_${Math.random().toString(36).slice(2)}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

// ─── STORAGE HELPERS ───────────────────────────────────────────────
const saveHistory = (entry) => {
  try {
    const history = JSON.parse(localStorage.getItem("p2p_history") || "[]");
    history.unshift({ ...entry, ts: Date.now() });
    localStorage.setItem("p2p_history", JSON.stringify(history.slice(0, 30)));
  } catch (e) {}
};
const getHistory = () => {
  try { return JSON.parse(localStorage.getItem("p2p_history") || "[]"); }
  catch (e) { return []; }
};
const getAlerts = () => {
  try { return JSON.parse(localStorage.getItem("price_alerts") || "[]"); }
  catch (e) { return []; }
};
const saveAlerts = (alerts) => {
  try { localStorage.setItem("price_alerts", JSON.stringify(alerts)); }
  catch (e) {}
};

// ─── MAIN APP ──────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [trmData, setTrmData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [manualP2P, setManualP2P] = useState("");
  const [cryptoData, setCryptoData] = useState([]);
  const [sparklines, setSparklines] = useState({});
  const [cryptoLoading, setCryptoLoading] = useState(true);
  const [portfolio, setPortfolio] = useState({ usdc: "", btc: "", eth: "", sol: "" });
  const [history, setHistory] = useState(getHistory());
  const [alerts, setAlerts] = useState(getAlerts());
  const [newAlert, setNewAlert] = useState({ symbol: "CYPR", target: "", direction: "above" });
  const [alertMsg, setAlertMsg] = useState("");

  const cryptoIds = [
    { id: "cypher-2",    symbol: "CYPR",    featured: true  },
    { id: "bitcoin",     symbol: "BTC",     featured: false },
    { id: "ethereum",    symbol: "ETH",     featured: false },
    { id: "solana",      symbol: "SOL",     featured: false },
    { id: "useless-v3",  symbol: "USELESS", featured: false },
  ];

  // TRM
  useEffect(() => {
    fetch("https://www.datos.gov.co/resource/32sa-8pi3.json?$limit=1&$order=vigenciadesde DESC")
      .then(r => r.json())
      .then(data => {
        if (data?.[0]) setTrmData({ valor: parseFloat(data[0].valor).toFixed(2), fecha: data[0].vigenciadesde });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Crypto prices + sparklines (1 sola llamada + cache local)
  useEffect(() => {
    // Cargar cache inmediatamente si existe
    try {
      const cached = localStorage.getItem("crypto_cache");
      if (cached) {
        const { data, sparks, ts } = JSON.parse(cached);
        if (Date.now() - ts < 120000) { // cache válido por 2 min
          setCryptoData(data);
          setSparklines(sparks);
          setCryptoLoading(false);
        }
      }
    } catch (e) {}

    const fetchCrypto = async () => {
      try {
        const ids = cryptoIds.map(c => c.id).join(",");
        // UN SOLO request con sparkline incluido
        const res = await fetch(
          `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&price_change_percentage=24h&sparkline=true`
        );
        const raw = await res.json();

        const ordered = cryptoIds.map(c => ({ ...c, ...raw.find(d => d.id === c.id) }));
        const spMap = {};
        raw.forEach(c => {
          if (c.sparkline_in_7d?.price) spMap[c.id] = c.sparkline_in_7d.price.slice(-20);
        });

        setCryptoData(ordered);
        setSparklines(spMap);

        // Guardar en cache
        try {
          localStorage.setItem("crypto_cache", JSON.stringify({ data: ordered, sparks: spMap, ts: Date.now() }));
        } catch (e) {}
      } catch (e) { console.error(e); }
      finally { setCryptoLoading(false); }
    };
    fetchCrypto();
    const iv = setInterval(fetchCrypto, 60000);
    return () => clearInterval(iv);
  }, []);

  // Check alerts
  useEffect(() => {
    if (!cryptoData.length || !alerts.length) return;
    alerts.forEach(alert => {
      const coin = cryptoData.find(c => c.symbol === alert.symbol.toLowerCase());
      if (!coin) return;
      const price = coin.current_price;
      if (alert.direction === "above" && price >= alert.target) {
        setAlertMsg(`🔔 ${alert.symbol} alcanzó $${price.toFixed(4)} (meta: $${alert.target})`);
      }
      if (alert.direction === "below" && price <= alert.target) {
        setAlertMsg(`🔔 ${alert.symbol} bajó a $${price.toFixed(4)} (meta: $${alert.target})`);
      }
    });
  }, [cryptoData]);

  const formatPrice = (p) =>
    !p ? "0.00"
    : p < 0.0001 ? p.toFixed(8)
    : p < 0.01   ? p.toFixed(6)
    : p < 1      ? p.toFixed(4)
    : p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const trmValue   = trmData ? parseFloat(trmData.valor) : 4050;
  const p2pValue   = manualP2P ? parseFloat(manualP2P) : Math.round(trmValue * 1.032);
  const spreadNum  = ((p2pValue - trmValue) / trmValue * 100);
  const isCheap    = spreadNum < 2.5;
  const isExpensive = spreadNum > 3.5;
  const statusColor  = isCheap ? "#4ade80" : isExpensive ? "#f87171" : "#facc15";
  const statusBorder = isCheap ? "rgba(74,222,128,0.35)" : isExpensive ? "rgba(248,113,113,0.35)" : "rgba(250,204,21,0.35)";
  const statusBg     = isCheap ? "rgba(74,222,128,0.07)" : isExpensive ? "rgba(248,113,113,0.07)" : "rgba(250,204,21,0.07)";
  const spread       = spreadNum >= 0 ? `+${spreadNum.toFixed(1)}` : spreadNum.toFixed(1);

  const S = { fontFamily: "Outfit, sans-serif" };

  // ── DASHBOARD ──
  const Dashboard = () => (
    <div style={{ paddingBottom: 16 }}>
      {/* HEADER compacto */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 20, paddingBottom: 20 }}>
        <CDLogo />
        <div style={{
          background: statusBg, border: `1px solid ${statusBorder}`,
          borderRadius: 999, padding: "5px 14px",
          color: statusColor, fontSize: 12, fontWeight: 700,
        }}>
          {spread}% TRM
        </div>
      </div>

      {alertMsg && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          style={{ background: "rgba(0,198,255,0.1)", border: "1px solid rgba(0,198,255,0.4)", borderRadius: 16, padding: "10px 16px", marginBottom: 14, color: "#00c6ff", fontSize: 13, fontWeight: 600 }}
          onClick={() => setAlertMsg("")}
        >
          {alertMsg} <span style={{ color: "#555", marginLeft: 8 }}>✕</span>
        </motion.div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#555" }}>Cargando...</div>
      ) : (
        <>
          {/* GRID 2 col: TRM + VISA */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            {[
              { label: "🇨🇴 TRM", value: trmValue.toLocaleString("es-CO", { maximumFractionDigits: 0 }), color: "#00c6ff", border: "rgba(0,198,255,0.2)" },
              { label: "🇺🇸 Visa", value: Math.round(trmValue * 1.039).toLocaleString("es-CO", { maximumFractionDigits: 0 }), color: "#a78bfa", border: "rgba(167,139,250,0.2)" },
            ].map((item, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                style={{ background: "#111118", borderRadius: 20, padding: "16px 18px", border: `1px solid ${item.border}` }}
              >
                <p style={{ color: "#555", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>{item.label}</p>
                <p style={{ color: item.color, fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{item.value}</p>
                <p style={{ color: "#333", fontSize: 10, marginTop: 4 }}>COP</p>
              </motion.div>
            ))}
          </div>

          {/* INPUT P2P */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}
            style={{ background: "#111118", borderRadius: 20, padding: "16px 18px", marginBottom: 10, border: `1.5px solid ${manualP2P ? statusBorder : "rgba(250,204,21,0.2)"}`, transition: "border 0.3s" }}
          >
            <p style={{ color: "#555", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>🇨🇴 P2P Binance</p>
            <input
              type="number"
              placeholder="Ingresa precio..."
              value={manualP2P}
              onChange={(e) => setManualP2P(e.target.value)}
              onBlur={() => {
                if (manualP2P && parseFloat(manualP2P) > 0) {
                  const entry = { p2p: parseFloat(manualP2P), trm: trmValue, spread: spreadNum.toFixed(2) };
                  saveHistory(entry);
                  setHistory(getHistory());
                }
              }}
              style={{
                width: "100%", boxSizing: "border-box",
                background: "rgba(0,0,0,0.4)", border: "none",
                borderRadius: 14, padding: "12px 14px",
                color: manualP2P ? statusColor : "#facc15",
                fontSize: 28, fontWeight: 800,
                outline: "none", fontFamily: "Outfit, sans-serif",
              }}
            />
            {!manualP2P && (
              <p style={{ color: "#444", fontSize: 11, marginTop: 6 }}>Estimado: {Math.round(trmValue * 1.032).toLocaleString("es-CO")} COP</p>
            )}
          </motion.div>

          {/* DECISIÓN */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
            style={{ background: statusBg, borderRadius: 20, padding: "18px 20px", marginBottom: 20, border: `2px solid ${statusBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}
          >
            <div>
              <p style={{ color: statusColor, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8 }}>
                {isCheap ? "✅ Buen precio" : isExpensive ? "⚠️ Precio alto" : "⚡ Normal"}
              </p>
              <p style={{ color: "#fff", fontSize: 34, fontWeight: 900, lineHeight: 1.1, marginTop: 4 }}>{spread}%</p>
              <p style={{ color: "#555", fontSize: 12, marginTop: 4 }}>
                {(p2pValue - trmValue).toLocaleString("es-CO")} COP/dólar
              </p>
            </div>
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              border: `2.5px solid ${statusColor}`,
              background: statusBg,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26,
            }}>
              {isCheap ? "🟢" : isExpensive ? "🔴" : "🟡"}
            </div>
          </motion.div>

          {/* TRACKING */}
          <p style={{ color: "#fff", fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Tracking</p>
          {cryptoLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[...Array(5)].map((_, i) => (
                <div key={i} style={{
                  background: "linear-gradient(90deg, #111118 25%, #1a1a28 50%, #111118 75%)",
                  backgroundSize: "200% 100%",
                  animation: "shimmer 1.5s infinite",
                  borderRadius: 18, padding: "12px 16px", height: 62,
                  display: "flex", alignItems: "center", gap: 10,
                }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#1a1a28" }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ width: 60, height: 12, background: "#1a1a28", borderRadius: 6, marginBottom: 6 }} />
                    <div style={{ width: 40, height: 10, background: "#1a1a28", borderRadius: 6 }} />
                  </div>
                  <div style={{ width: 70, height: 14, background: "#1a1a28", borderRadius: 6 }} />
                </div>
              ))}
              <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {cryptoData.map((c, i) => {
                const price  = c.current_price || 0;
                const change = c.price_change_percentage_24h || 0;
                const isPos  = change >= 0;
                const chColor = isPos ? "#4ade80" : "#f87171";
                const rowBg  = c.featured
                  ? "linear-gradient(135deg, rgba(0,198,255,0.1), rgba(124,58,237,0.1))"
                  : isPos
                  ? "linear-gradient(135deg, rgba(74,222,128,0.06), #111118)"
                  : "linear-gradient(135deg, rgba(248,113,113,0.06), #111118)";
                const rowBorder = c.featured
                  ? "1.5px solid rgba(0,198,255,0.35)"
                  : isPos ? "1px solid rgba(74,222,128,0.2)" : "1px solid rgba(248,113,113,0.2)";

                return (
                  <motion.div key={c.id}
                    initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                    style={{ background: rowBg, border: rowBorder, borderRadius: 18, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {c.image
                        ? <img src={c.image} alt={c.symbol} style={{ width: 36, height: 36, borderRadius: "50%" }} onError={e => e.target.style.display = "none"} />
                        : <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#1c1c1e", display: "flex", alignItems: "center", justifyContent: "center", color: "#888", fontSize: 12 }}>{c.symbol?.[0]}</div>
                      }
                      <div>
                        <p style={{ color: c.featured ? "#00c6ff" : "#fff", fontWeight: 700, fontSize: 14 }}>
                          {c.symbol?.toUpperCase()}
                          {c.featured && <span style={{ fontSize: 9, color: "#00c6ff", marginLeft: 5 }}>⭐</span>}
                        </p>
                        <p style={{ color: chColor, fontSize: 11, fontWeight: 600 }}>
                          {isPos ? "▲" : "▼"} {isPos ? "+" : ""}{change.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Sparkline data={sparklines[c.id]} isPositive={isPos} />
                      <div style={{ textAlign: "right" }}>
                        <p style={{ color: "#555", fontSize: 9, marginBottom: 2 }}>🇺🇸 USD</p>
                        <p style={{ color: c.featured ? "#00c6ff" : "#fff", fontWeight: 800, fontSize: 14 }}>${formatPrice(price)}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );

  // ── PORTFOLIO ──
  const Portfolio = () => {
    const fields = [
      { key: "usdc", label: "USDC", color: "#4ade80" },
      { key: "btc",  label: "BTC",  color: "#f7931a" },
      { key: "eth",  label: "ETH",  color: "#627eea" },
      { key: "sol",  label: "SOL",  color: "#9945ff" },
    ];
    const getUSD = (key, amount) => {
      const coin = cryptoData.find(c => c.symbol?.toLowerCase() === key);
      return coin ? (parseFloat(amount || 0) * coin.current_price) : 0;
    };
    const getCOP = (usd) => (usd * p2pValue).toLocaleString("es-CO", { maximumFractionDigits: 0 });
    const totalUSD = fields.reduce((sum, f) => sum + getUSD(f.key, portfolio[f.key]), 0);

    return (
      <div style={{ paddingTop: 20, paddingBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <p style={{ color: "#fff", fontSize: 20, fontWeight: 800 }}>Mi Portfolio</p>
          <span style={{ color: "#555", fontSize: 12 }}>en tiempo real</span>
        </div>

        {/* Total */}
        <div style={{ background: "linear-gradient(135deg,rgba(0,198,255,0.1),rgba(124,58,237,0.1))", border: "1.5px solid rgba(0,198,255,0.3)", borderRadius: 22, padding: "20px 22px", marginBottom: 16, textAlign: "center" }}>
          <p style={{ color: "#555", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8 }}>Total Portfolio</p>
          <p style={{ color: "#fff", fontSize: 36, fontWeight: 900, margin: "8px 0 2px" }}>
            ${totalUSD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p style={{ color: "#4ade80", fontSize: 14, fontWeight: 700 }}>
            🇨🇴 ≈ {getCOP(totalUSD)} COP
          </p>
        </div>

        {fields.map((f) => {
          const usd = getUSD(f.key, portfolio[f.key]);
          return (
            <div key={f.key} style={{ background: "#111118", borderRadius: 18, padding: "14px 18px", marginBottom: 10, border: "1px solid #1a1a28" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <p style={{ color: f.color, fontWeight: 700, fontSize: 14 }}>{f.label}</p>
                <div style={{ textAlign: "right" }}>
                  <p style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>
                    ${usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p style={{ color: "#555", fontSize: 11 }}>🇨🇴 {getCOP(usd)} COP</p>
                </div>
              </div>
              <input
                type="text"
                inputMode="decimal"
                placeholder={`Cantidad de ${f.label}...`}
                value={portfolio[f.key]}
                onChange={(e) => setPortfolio(prev => ({ ...prev, [f.key]: e.target.value }))}
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: "rgba(0,0,0,0.4)",
                  border: `1px solid ${f.color}30`,
                  borderRadius: 12, padding: "10px 14px",
                  color: f.color, fontSize: 16, fontWeight: 700,
                  outline: "none", fontFamily: "Outfit, sans-serif",
                }}
              />
            </div>
          );
        })}
      </div>
    );
  };

  // ── HISTORIAL + ALERTAS ──
  const Settings = () => (
    <div style={{ paddingTop: 20, paddingBottom: 16 }}>
      {/* HISTORIAL P2P */}
      <p style={{ color: "#fff", fontSize: 18, fontWeight: 800, marginBottom: 14 }}>📅 Historial P2P</p>
      {history.length === 0 ? (
        <div style={{ background: "#111118", borderRadius: 18, padding: 20, textAlign: "center", color: "#555", marginBottom: 24 }}>
          Aún no hay registros. Ingresa un precio P2P en el dashboard.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
          {history.slice(0, 10).map((h, i) => (
            <div key={i} style={{ background: "#111118", borderRadius: 16, padding: "12px 16px", border: "1px solid #1a1a28", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>
                  🇨🇴 {h.p2p.toLocaleString("es-CO")} COP
                </p>
                <p style={{ color: "#555", fontSize: 11, marginTop: 2 }}>
                  {new Date(h.ts).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}
                </p>
              </div>
              <span style={{
                color: parseFloat(h.spread) < 2.5 ? "#4ade80" : parseFloat(h.spread) > 3.5 ? "#f87171" : "#facc15",
                fontWeight: 800, fontSize: 14,
              }}>
                {parseFloat(h.spread) >= 0 ? "+" : ""}{h.spread}%
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ALERTAS */}
      <p style={{ color: "#fff", fontSize: 18, fontWeight: 800, marginBottom: 14 }}>🔔 Alertas de precio</p>
      <div style={{ background: "#111118", borderRadius: 18, padding: 18, marginBottom: 12, border: "1px solid #1a1a28" }}>
        <p style={{ color: "#555", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 }}>Nueva alerta</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <select
            value={newAlert.symbol}
            onChange={e => setNewAlert(p => ({ ...p, symbol: e.target.value }))}
            style={{ background: "#0a0a0f", border: "1px solid #222", borderRadius: 12, padding: "10px 14px", color: "#fff", fontSize: 14, fontFamily: "Outfit, sans-serif", outline: "none" }}
          >
            {cryptoIds.map(c => <option key={c.id} value={c.symbol}>{c.symbol}</option>)}
          </select>
          <select
            value={newAlert.direction}
            onChange={e => setNewAlert(p => ({ ...p, direction: e.target.value }))}
            style={{ background: "#0a0a0f", border: "1px solid #222", borderRadius: 12, padding: "10px 14px", color: "#fff", fontSize: 14, fontFamily: "Outfit, sans-serif", outline: "none" }}
          >
            <option value="above">Sube a</option>
            <option value="below">Baja a</option>
          </select>
        </div>
        <input
          type="number"
          placeholder="Precio objetivo en USD..."
          value={newAlert.target}
          onChange={e => setNewAlert(p => ({ ...p, target: e.target.value }))}
          style={{ width: "100%", boxSizing: "border-box", background: "#0a0a0f", border: "1px solid #222", borderRadius: 12, padding: "10px 14px", color: "#facc15", fontSize: 16, fontWeight: 700, outline: "none", fontFamily: "Outfit, sans-serif", marginBottom: 10, MozAppearance: "textfield", appearance: "none" }}
        />
        <button
          onClick={() => {
            if (!newAlert.target) return;
            const updated = [...alerts, { ...newAlert, target: parseFloat(newAlert.target) }];
            setAlerts(updated);
            saveAlerts(updated);
            setNewAlert({ symbol: "CYPR", target: "", direction: "above" });
          }}
          style={{ width: "100%", background: "linear-gradient(135deg,#00c6ff,#7c3aed)", border: "none", borderRadius: 12, padding: "12px", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "Outfit, sans-serif" }}
        >
          + Agregar alerta
        </button>
      </div>

      {alerts.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {alerts.map((a, i) => (
            <div key={i} style={{ background: "#111118", borderRadius: 16, padding: "12px 16px", border: "1px solid #1a1a28", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <p style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>
                <span style={{ color: "#00c6ff" }}>{a.symbol}</span>{" "}
                {a.direction === "above" ? "sube a" : "baja a"}{" "}
                <span style={{ color: "#facc15" }}>${a.target}</span>
              </p>
              <button
                onClick={() => {
                  const updated = alerts.filter((_, idx) => idx !== i);
                  setAlerts(updated);
                  saveAlerts(updated);
                }}
                style={{ background: "rgba(248,113,113,0.15)", border: "none", borderRadius: 8, padding: "4px 10px", color: "#f87171", fontSize: 12, cursor: "pointer", fontFamily: "Outfit, sans-serif" }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const tabs = [
    { id: "dashboard", icon: "⬡", label: "Dashboard" },
    { id: "portfolio", icon: "◈", label: "Portfolio"  },
    { id: "settings",  icon: "◎", label: "Alertas"    },
  ];

  return (
    <div style={{ ...S, background: "#0a0a0f", minHeight: "100vh", padding: "0 18px 100px", maxWidth: 430, margin: "0 auto" }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.18 }}
        >
          {tab === "dashboard" && <Dashboard />}
          {tab === "portfolio" && <Portfolio />}
          {tab === "settings"  && <Settings />}
        </motion.div>
      </AnimatePresence>

      {/* TAB BAR */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 430,
        background: "rgba(10,10,15,0.95)", backdropFilter: "blur(24px)",
        borderTop: "1px solid rgba(255,255,255,0.05)",
        padding: "10px 0 24px",
        display: "flex", justifyContent: "space-around", alignItems: "center",
      }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            color: tab === t.id ? "#00c6ff" : "#444",
            background: "none", border: "none", cursor: "pointer",
            fontFamily: "Outfit, sans-serif", transition: "color 0.2s",
          }}>
            <span style={{ fontSize: 20 }}>{t.icon}</span>
            <span style={{ fontSize: 10, fontWeight: 600 }}>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}