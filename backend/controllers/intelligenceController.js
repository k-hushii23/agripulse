const pool = require("../config/db");

function formatDate(val) {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString().split("T")[0];
  return String(val).split("T")[0];
}

// Helper: query historical spot_prices from PostgreSQL and compute baseline statistics
async function computeBaselineStats(cropId, marketId) {
  const { rows: history } = await pool.query(
    `SELECT price_date, min_price::float, max_price::float, modal_price::float, arrival_qty::float
     FROM spot_prices
     WHERE commodity_id = $1 AND market_id = $2
     ORDER BY price_date ASC`,
    [cropId, marketId]
  );

  if (history.length < 3) {
    return { sufficient: false, count: history.length, history };
  }

  const recent = history.slice(-5);
  const prices = recent.map((r) => r.modal_price);
  const arrivals = recent.map((r) => r.arrival_qty ?? 0);

  const mean = prices.reduce((sum, val) => sum + val, 0) / prices.length;
  const variance =
    prices.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / prices.length;
  const stdDev = Math.sqrt(variance);

  const firstPrice = prices[0];
  const latestPrice = prices[prices.length - 1];
  const pctChange = firstPrice > 0 ? ((latestPrice - firstPrice) / firstPrice) * 100 : 0;

  const arrivalTrend =
    arrivals[arrivals.length - 1] < arrivals[0] ? "falling" : "rising";

  return {
    sufficient: true,
    count: history.length,
    latestRecord: history[history.length - 1],
    movingAverage: Math.round(mean),
    stdDev: Math.round(stdDev),
    pctChange: Number(pctChange.toFixed(2)),
    arrivalTrend
  };
}

// GET /api/prices/range?cropId=...&marketId=... — Estimated future price range (PRD 7.4)
const getEstimatedRange = async (req, res, next) => {
  try {
    const cropId = Number(req.query.cropId);
    const marketId = Number(req.query.marketId);

    if (!cropId || !marketId) {
      return res.status(400).json({ error: "cropId and marketId query parameters are required" });
    }

    const stats = await computeBaselineStats(cropId, marketId);
    if (!stats.sufficient) {
      return res.status(200).json({
        supported: false,
        message: "Insufficient historical records (minimum 3 days required) to estimate a price range."
      });
    }

    const dailyStep = (stats.latestRecord.modal_price * (stats.pctChange / 100)) / stats.count;
    const projectedCenter = Math.round(stats.latestRecord.modal_price + dailyStep);
    const band = Math.max(stats.stdDev, 20);

    res.status(200).json({
      supported: true,
      horizon: "Next 3–5 days (statistical baseline estimate)",
      is_estimate: true,
      estimated_min: projectedCenter - band,
      estimated_max: projectedCenter + band,
      projected_center: projectedCenter,
      observed_today: {
        observed_min: stats.latestRecord.min_price,
        observed_max: stats.latestRecord.max_price,
        modal_price: stats.latestRecord.modal_price,
        price_date: formatDate(stats.latestRecord.price_date)
      },
      disclaimer: "Model-estimated range only; distinct from actual reported mandi min/max."
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/predictions?cropId=...&marketId=... — Short-term trend & forecast baseline (PRD 12)
const getPredictions = async (req, res, next) => {
  try {
    const cropId = Number(req.query.cropId);
    const marketId = Number(req.query.marketId);

    if (!cropId || !marketId) {
      return res.status(400).json({ error: "cropId and marketId query parameters are required" });
    }

    const stats = await computeBaselineStats(cropId, marketId);
    if (!stats.sufficient) {
      return res.status(200).json({
        supported: false,
        message: "Insufficient historical data for baseline forecast."
      });
    }

    let direction = "sideways";
    if (stats.pctChange > 1.2) direction = "upward";
    else if (stats.pctChange < -1.2) direction = "downward";

    const confidence = stats.count >= 5 && stats.stdDev < 60 ? "Moderate" : "Low";

    res.status(200).json({
      supported: true,
      method: "5-Day Moving Average & Linear Momentum Baseline",
      is_estimate: true,
      expected_direction: direction,
      recent_momentum_pct: stats.pctChange,
      moving_average_price: stats.movingAverage,
      volatility_std_dev: stats.stdDev,
      confidence,
      sample_size_days: stats.count
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/recommendations?cropId=...&marketId=... — Explainable selling suggestion (PRD 7.6 & 8)
const getRecommendation = async (req, res, next) => {
  try {
    const cropId = Number(req.query.cropId);
    const marketId = Number(req.query.marketId);

    if (!cropId || !marketId) {
      return res.status(400).json({ error: "cropId and marketId query parameters are required" });
    }

    const [cropRes, marketRes, stats, futuresRes] = await Promise.all([
      pool.query(
        `SELECT id, name, COALESCE(NULLIF(unit, ''), 'Quintal') AS unit FROM commodities WHERE id = $1`,
        [cropId]
      ),
      pool.query(`SELECT id, name FROM markets WHERE id = $1`, [marketId]),
      computeBaselineStats(cropId, marketId),
      pool.query(
        `SELECT contract_month, settlement_price::float FROM futures_prices WHERE commodity_id = $1 ORDER BY price_date DESC LIMIT 1`,
        [cropId]
      )
    ]);

    const crop = cropRes.rows[0];
    const market = marketRes.rows[0];

    if (!crop || !market) {
      return res.status(404).json({ error: "Crop or market not found" });
    }

    if (!stats.sufficient) {
      return res.status(200).json({
        supported: false,
        suggestion: "Insufficient data",
        reasons: ["Not enough recent price reports at this mandi to generate an evidence-based suggestion."],
        farmer_note: "Check nearby mandis or wait for additional daily reports."
      });
    }

    const futures = futuresRes.rows[0] || null;
    const reasons = [];
    let suggestion = "Monitor the market";
    let confidence = "Moderate";

    if (stats.pctChange > 1.5 && stats.arrivalTrend === "falling") {
      suggestion = "Consider waiting";
      reasons.push(`Modal prices rose ${stats.pctChange}% over the last ${stats.count} reported days.`);
      reasons.push("Daily mandi arrivals are tapering off, indicating tightening local supply.");
    } else if (stats.pctChange < -1.5 && stats.arrivalTrend === "rising") {
      suggestion = "Consider selling today";
      reasons.push(`Modal prices declined ${Math.abs(stats.pctChange)}% over recent sessions.`);
      reasons.push("Incoming mandi arrivals are increasing, which can pressure spot prices further.");
    } else {
      suggestion = "Monitor the market";
      reasons.push(`Prices have remained relatively steady (${stats.pctChange}% net shift) near ₹${stats.movingAverage}/${crop.unit}.`);
      confidence = "Low-to-Moderate";
    }

    if (futures) {
      const spread = Number((futures.settlement_price - stats.latestRecord.modal_price).toFixed(2));
      if (spread > 0) {
        reasons.push(`NCDEX futures (${formatDate(futures.contract_month)}) trade ₹${spread}/${crop.unit} above local spot, signaling firmer broader sentiment.`);
      }
    }

    res.status(200).json({
      supported: true,
      crop: crop.name,
      market: market.name,
      suggestion,
      confidence,
      reasons,
      practical_constraints_note:
        "Advisory only—not a guaranteed price. Factor in storage capacity, spoilage risk, and transport costs before holding produce."
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getEstimatedRange, getPredictions, getRecommendation };