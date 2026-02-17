export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  try {
    const response = await fetch(
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

    if (!response.ok) {
      return res.status(200).json({ 
        price: null, 
        error: `API p2p.army error ${response.status}` 
      });
    }

    const data = await response.json();
    
    if (!data || data.status !== 1 || !data.ads || data.ads.length < 3) {
      return res.status(200).json({ 
        price: null, 
        error: "No hay suficientes compradores disponibles" 
      });
    }

    const third = data.ads[2];

    res.status(200).json({
      price: parseFloat(third.price),
      seller: third.user_name,
      minAmount: parseFloat(third.min_fiat),
      maxAmount: parseFloat(third.max_fiat),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ 
      price: null,
      error: error.message 
    });
  }
}