import { useState, useEffect } from "react";
import { motion } from "framer-motion";

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [trmData, setTrmData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [manualP2P, setManualP2P] = useState("");
  const [cryptoPrices, setCryptoPrices] = useState(null);
  const [cryptoLoading, setCryptoLoading] = useState(true);

  // Lista de cryptos a seguir (puedes agregar más aquí)
  const cryptoIds = [
    { id: "cypher-2", symbol: "CYPR", featured: true },
    { id: "bitcoin", symbol: "BTC", featured: false },
    { id: "ethereum", symbol: "ETH", featured: false },
    { id: "solana", symbol: "SOL", featured: false },
    { id: "useless-3", symbol: "USELESS", featured: false },
  ];

  // Obtener TRM real
  useEffect(() => {
    const fetchTRM = async () => {
      try {
        const response = await fetch(
          "https://www.datos.gov.co/resource/32sa-8pi3.json?$limit=1&$order=vigenciadesde DESC"
        );
        const data = await response.json();
        if (data && data[0]) {
          setTrmData({
            valor: parseFloat(data[0].valor).toFixed(2),
            fecha: data[0].vigenciadesde,
          });
        }
        setLoading(false);
      } catch (error) {
        console.error("Error fetching TRM:", error);
        setLoading(false);
      }
    };

    fetchTRM();
  }, []);

  // Obtener precios crypto reales
  useEffect(() => {
    const fetchCryptoPrices = async () => {
      try {
        const ids = cryptoIds.map(c => c.id).join(',');
        const response = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
        );
        const data = await response.json();
        setCryptoPrices(data);
        setCryptoLoading(false);
      } catch (error) {
        console.error("Error fetching crypto prices:", error);
        setCryptoLoading(false);
      }
    };

    fetchCryptoPrices();
    
    // Actualizar cada 60 segundos
    const interval = setInterval(fetchCryptoPrices, 60000);
    return () => clearInterval(interval);
  }, []);

  const Card = ({ title, value, subtitle }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-[#1c1c1e] rounded-3xl p-6 shadow-lg mb-4"
    >
      <p className="text-gray-400 text-sm mb-1">{title}</p>
      <h2 className="text-white text-4xl font-semibold">{value}</h2>
      {subtitle && (
        <p className="text-gray-500 text-xs mt-2">{subtitle}</p>
      )}
    </motion.div>
  );

  const Dashboard = () => {
    const trmValue = trmData ? parseFloat(trmData.valor) : 4050;
    const p2pValue = manualP2P ? parseFloat(manualP2P) : Math.round(trmValue * 1.032);
    const visaValue = Math.round(trmValue * 1.039);
    const spreadNum = ((p2pValue - trmValue) / trmValue * 100);
    const spread = spreadNum >= 0 ? `+${spreadNum.toFixed(1)}` : spreadNum.toFixed(1);
    
    const isCheap = spreadNum < 2.5;
    const isExpensive = spreadNum > 3.5;

    return (
      <div className="pb-6">
        {/* HEADER GRANDE */}
        <div className="mb-8 pt-6">
          <h1 className="text-white text-4xl font-bold mb-3">
            Crypto Decision
          </h1>
          <p className={`text-lg font-medium ${
            isCheap ? 'text-green-400' : 
            isExpensive ? 'text-red-400' : 
            'text-yellow-400'
          }`}>
            Spread actual {spread}% vs TRM
          </p>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="text-blue-400 text-2xl">⏳</div>
            <p className="text-gray-400 mt-2">Cargando TRM real...</p>
          </div>
        ) : (
          <>
            <Card 
              title="TRM OFICIAL" 
              value={`${trmValue.toLocaleString('es-CO', { minimumFractionDigits: 2 })} COP`}
              subtitle={trmData ? `Actualizado: ${new Date(trmData.fecha).toLocaleDateString('es-CO')}` : null}
            />

            {/* INPUT PRECIO P2P */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="bg-[#1c1c1e] rounded-3xl p-6 shadow-lg mb-4"
            >
              <p className="text-gray-400 text-sm mb-3">P2P BINANCE</p>
              <input
                type="number"
                placeholder="Escribe precio P2P aquí..."
                value={manualP2P}
                onChange={(e) => setManualP2P(e.target.value)}
                onFocus={(e) => e.target.select()}
                className="w-full bg-[#0f0f10] text-white text-4xl font-semibold rounded-2xl p-4 outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                style={{
                  MozAppearance: 'textfield',
                  WebkitAppearance: 'none',
                  appearance: 'none'
                }}
              />
              {!manualP2P && (
                <p className="text-gray-500 text-xs mt-3">
                  Estimado: {p2pValue.toLocaleString('es-CO')} COP (basado en spread típico)
                </p>
              )}
            </motion.div>

            <Card 
              title="VISA RATE (Estimado)" 
              value={`${visaValue.toLocaleString('es-CO')} COP`}
              subtitle="Basado en comisión típica +3.9%"
            />

            {/* CARD DECISIÓN INTELIGENTE */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className={`rounded-3xl p-8 shadow-lg mt-6 ${
                isCheap ? 'bg-green-900/30 border-2 border-green-500' :
                isExpensive ? 'bg-red-900/30 border-2 border-red-500' :
                'bg-yellow-900/30 border-2 border-yellow-500'
              }`}
            >
              <h2 className={`text-2xl font-bold mb-2 ${
                isCheap ? 'text-green-400' :
                isExpensive ? 'text-red-400' :
                'text-yellow-400'
              }`}>
                PORCENTAJE
              </h2>
              <p className="text-white text-3xl font-semibold mb-3">
                {spread}%
              </p>
              <div className="space-y-2">
                <p className="text-gray-300 text-sm">
                  Diferencia: <span className="font-semibold">{(p2pValue - trmValue).toLocaleString('es-CO')} COP</span> por dólar
                </p>
              </div>
            </motion.div>

            {/* TRACKING CRYPTO */}
            <div className="mt-8">
              <h3 className="text-white text-xl font-semibold mb-4">Tracking</h3>
              
              {cryptoLoading ? (
                <div className="bg-[#1c1c1e] rounded-3xl p-6 text-center">
                  <p className="text-gray-400">Cargando precios...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cryptoIds.map((crypto) => {
                    const priceData = cryptoPrices?.[crypto.id];
                    const price = priceData?.usd || 0;
                    const change = priceData?.usd_24h_change || 0;
                    const isPositive = change >= 0;

                    return (
                      <motion.div
                        key={crypto.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`rounded-3xl p-5 ${
                          crypto.featured 
                            ? 'bg-blue-900/30 border-2 border-blue-500' 
                            : 'bg-[#1c1c1e]'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <span className={`font-bold ${
                              crypto.featured ? 'text-blue-400 text-lg' : 'text-white'
                            }`}>
                              {crypto.symbol}
                            </span>
                            {crypto.featured && (
                              <span className="ml-2 text-xs text-blue-300">⭐ Featured</span>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="text-white text-lg font-semibold">
                              ${price < 0.01 
                                ? price.toFixed(6) 
                                : price < 1 
                                ? price.toFixed(4) 
                                : price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                              }
                            </span>
                            <span className={`ml-3 font-medium ${
                              isPositive ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {isPositive ? '+' : ''}{change.toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  const Tracking = () => (
    <div className="text-white text-xl pt-20 text-center">
      📊 Tracking avanzado
      <p className="text-gray-400 text-sm mt-2">Próximamente</p>
    </div>
  );

  const Settings = () => (
    <div className="text-white text-xl pt-20 text-center">
      ⚙️ Configuración
      <p className="text-gray-400 text-sm mt-2">Próximamente</p>
    </div>
  );

  return (
    <div className="bg-[#0f0f10] min-h-screen px-5 pb-24">
      {tab === "dashboard" && <Dashboard />}
      {tab === "tracking" && <Tracking />}
      {tab === "settings" && <Settings />}

      {/* TAB BAR */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#1c1c1e]/90 backdrop-blur-lg border-t border-gray-800">
        <div className="flex justify-around items-center py-4 max-w-2xl mx-auto">
          <button
            onClick={() => setTab("dashboard")}
            className={`flex flex-col items-center gap-1 transition-colors ${
              tab === "dashboard" ? "text-blue-400" : "text-gray-400"
            }`}
          >
            <span className="text-2xl">🏠</span>
            <span className="text-xs font-medium">Dashboard</span>
          </button>
          <button
            onClick={() => setTab("tracking")}
            className={`flex flex-col items-center gap-1 transition-colors ${
              tab === "tracking" ? "text-blue-400" : "text-gray-400"
            }`}
          >
            <span className="text-2xl">📊</span>
            <span className="text-xs font-medium">Tracking</span>
          </button>
          <button
            onClick={() => setTab("settings")}
            className={`flex flex-col items-center gap-1 transition-colors ${
              tab === "settings" ? "text-blue-400" : "text-gray-400"
            }`}
          >
            <span className="text-2xl">⚙️</span>
            <span className="text-xs font-medium">Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
}