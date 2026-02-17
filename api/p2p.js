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

    const data = await response.json();
    const ads = data?.ads || [];

    if (ads.length < 3) {
      return res.status(200).json({ 
        price: null, 
        error: "No hay suficientes compradores disponibles" 
      });
    }

    const third = ads[2];

    res.status(200).json({
      price: parseFloat(third.price),
      seller: third.user_name,
      minAmount: parseFloat(third.min_fiat),
      maxAmount: parseFloat(third.max_fiat),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}