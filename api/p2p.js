export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    // Intentar con Binance directamente
    const binanceRes = await fetch(
      "https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
        },
        body: JSON.stringify({
          fiat: "COP",
          page: 1,
          rows: 5,
          tradeType: "SELL", // Tú vendes, ellos compran
          asset: "USDT",
          countries: [],
          proMerchantAds: false,
          shieldMerchantAds: false,
          publisherType: null,
          payTypes: [],
        }),
      }
    );

    const binanceData = await binanceRes.json();

    // Verificar si Binance respondió correctamente
    if (binanceData?.data && Array.isArray(binanceData.data) && binanceData.data.length >= 3) {
      const third = binanceData.data[2]; // 3er comprador (índice 2)
      
      return res.status(200).json({
        price: parseFloat(third.adv.price),
        seller: third.advertiser.nickName,
        minAmount: parseFloat(third.adv.minSingleTransAmount),
        maxAmount: parseFloat(third.adv.maxSingleTransAmount),
        updatedAt: new Date().toISOString(),
        source: "binance_direct",
      });
    }

    // Si Binance falla, intentar con p2p.army como fallback
    const armyRes = await fetch(
      "https://p2p.army/v1/api/get_p2p_order_book",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          market: "binance",
          fiat: "COP",
          asset: "USDT",
          side: "SELL",
          limit: 5,
        }),
      }
    );

    const armyData = await armyRes.json();

    if (armyData?.status === 1 && armyData.ads && armyData.ads.length >= 3) {
      const third = armyData.ads[2];
      
      return res.status(200).json({
        price: parseFloat(third.price),
        seller: third.user_name,
        minAmount: parseFloat(third.min_fiat),
        maxAmount: parseFloat(third.max_fiat),
        updatedAt: new Date().toISOString(),
        source: "p2p_army",
      });
    }

    // Si ambos fallan
    return res.status(200).json({
      price: null,
      error: "No hay suficientes compradores disponibles",
      debug: {
        binance: binanceData?.data?.length || 0,
        army: armyData?.ads?.length || 0,
      },
    });

  } catch (error) {
    return res.status(500).json({
      price: null,
      error: error.message,
      stack: error.stack,
    });
  }
}