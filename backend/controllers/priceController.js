const {
  commodities,
  markets,
  spotPrices,
  futuresPrices
} = require("../data/mockData");

// GET /api/prices?cropId=1&marketId=1 — Latest observed spot price + futures comparison (PRD 7.3 & 7.5)
const getLatestPrice = (req, res) => {
  const cropId = Number(req.query.cropId);
  const marketId = Number(req.query.marketId);

  if (!cropId || !marketId) {
    return res.status(400).json({ error: "cropId and marketId query parameters are required" });
  }

  const crop = commodities.find((c) => c.id === cropId);
  const market = markets.find((m) => m.id === marketId);

  if (!crop || !market) {
    return res.status(404).json({ error: "Crop or market not found" });
  }

  const matchingSpots = spotPrices
    .filter((p) => p.commodity_id === cropId && p.market_id === marketId)
    .sort((a, b) => new Date(b.price_date) - new Date(a.price_date));

  if (matchingSpots.length === 0) {
    return res.status(200).json({
      available: false,
      message: `No reported price data available for ${crop.name} at ${market.name}.`
    });
  }

  const latestSpot = matchingSpots[0];
  const previousSpot = matchingSpots[1] || null;
  const dailyChange = previousSpot ? latestSpot.modal_price - previousSpot.modal_price : 0;
  const dailyChangePct = previousSpot
    ? Number(((dailyChange / previousSpot.modal_price) * 100).toFixed(2))
    : 0;

  // Optional futures signal (PRD 7.5: only show if applicable contract exists)
  const latestFutures = futuresPrices
    .filter((f) => f.commodity_id === cropId)
    .sort((a, b) => new Date(b.price_date) - new Date(a.price_date))[0] || null;

  let futuresComparison = null;
  if (latestFutures) {
    const spread = latestFutures.settlement_price - latestSpot.modal_price;
    const spreadPct = Number(((spread / latestSpot.modal_price) * 100).toFixed(2));
    futuresComparison = {
      exchange: latestFutures.exchange,
      contract_month: latestFutures.contract_month,
      expiry_date: latestFutures.expiry_date,
      price_date: latestFutures.price_date,
      settlement_price: latestFutures.settlement_price,
      spread,
      spread_pct: spreadPct,
      note: "Futures prices are market signals, not guaranteed local mandi forecasts."
    };
  }

  res.status(200).json({
    available: true,
    crop,
    market,
    spot: {
      price_date: latestSpot.price_date,
      observed_min: latestSpot.min_price,
      observed_max: latestSpot.max_price,
      modal_price: latestSpot.modal_price,
      arrival_qty: latestSpot.arrival_qty,
      unit: crop.unit,
      source: latestSpot.source,
      freshness: "Periodic daily mandi report",
      daily_change: dailyChange,
      daily_change_pct: dailyChangePct
    },
    futures: futuresComparison
  });
};

// GET /api/prices/history?cropId=1&marketId=1 — Historical series for Trends chart (PRD 9)
const getPriceHistory = (req, res) => {
  const cropId = Number(req.query.cropId);
  const marketId = Number(req.query.marketId);

  if (!cropId || !marketId) {
    return res.status(400).json({ error: "cropId and marketId query parameters are required" });
  }

  const series = spotPrices
    .filter((p) => p.commodity_id === cropId && p.market_id === marketId)
    .sort((a, b) => new Date(a.price_date) - new Date(b.price_date))
    .map((row) => ({
      date: row.price_date,
      min_price: row.min_price,
      max_price: row.max_price,
      modal_price: row.modal_price,
      arrival_qty: row.arrival_qty
    }));

  res.status(200).json({
    cropId,
    marketId,
    count: series.length,
    series
  });
};

// GET /api/markets/nearby?cropId=1&marketId=1 — Nearby mandi comparison (PRD 7.7)
const getNearbyMandis = (req, res) => {
  const cropId = Number(req.query.cropId);
  const currentMarketId = Number(req.query.marketId);

  if (!cropId) {
    return res.status(400).json({ error: "cropId query parameter is required" });
  }

  const crop = commodities.find((c) => c.id === cropId);
  if (!crop) {
    return res.status(404).json({ error: "Crop not found" });
  }

  // Get latest available record per market for this crop
  const latestByMarket = markets
    .map((m) => {
      const records = spotPrices
        .filter((p) => p.commodity_id === cropId && p.market_id === m.id)
        .sort((a, b) => new Date(b.price_date) - new Date(a.price_date));

      if (records.length === 0) return null;

      return {
        market_id: m.id,
        market_name: m.name,
        district: m.district,
        state: m.state,
        is_selected: m.id === currentMarketId,
        price_date: records[0].price_date,
        modal_price: records[0].modal_price,
        min_price: records[0].min_price,
        max_price: records[0].max_price,
        unit: crop.unit
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.modal_price - a.modal_price);

  const highestPrice = latestByMarket.length > 0 ? latestByMarket[0].modal_price : null;

  const comparisons = latestByMarket.map((item) => ({
    ...item,
    is_highest: item.modal_price === highestPrice
  }));

  res.status(200).json({
    crop: crop.name,
    unit: crop.unit,
    disclaimer: "Higher reported price does not guarantee higher net return after transport and mandi fees.",
    count: comparisons.length,
    markets: comparisons
  });
};

module.exports = { getLatestPrice, getPriceHistory, getNearbyMandis };