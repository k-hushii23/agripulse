const pool = require("../config/db");

// Helper: format PostgreSQL DATE or timestamp cleanly to YYYY-MM-DD
function formatDate(val) {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString().split("T")[0];
  return String(val).split("T")[0];
}

// GET /api/prices?cropId=...&marketId= — Latest observed spot price + futures comparison (PRD 7.3 & 7.5)
const getLatestPrice = async (req, res, next) => {
  try {
    const cropId = Number(req.query.cropId);
    const marketId = Number(req.query.marketId);

    if (!cropId || !marketId) {
      return res.status(400).json({ error: "cropId and marketId query parameters are required" });
    }

    const [cropRes, marketRes] = await Promise.all([
      pool.query(
        `SELECT id, name, variety, grade, COALESCE(NULLIF(unit, ''), 'Quintal') AS unit
         FROM commodities WHERE id = $1`,
        [cropId]
      ),
      pool.query(
        `SELECT id, name, district, state FROM markets WHERE id = $1`,
        [marketId]
      )
    ]);

    const crop = cropRes.rows[0];
    const market = marketRes.rows[0];

    if (!crop || !market) {
      return res.status(404).json({ error: "Crop or market not found" });
    }

    // Fetch the 2 most recent spot price reports for this crop + mandi
    const spotRes = await pool.query(
      `SELECT price_date, min_price::float, max_price::float, modal_price::float, arrival_qty::float
       FROM spot_prices
       WHERE commodity_id = $1 AND market_id = $2
       ORDER BY price_date DESC
       LIMIT 2`,
      [cropId, marketId]
    );

    if (spotRes.rows.length === 0) {
      return res.status(200).json({
        available: false,
        message: `No reported price data available for ${crop.name} at ${market.name}.`
      });
    }

    const latestSpot = spotRes.rows[0];
    const previousSpot = spotRes.rows[1] || null;
    const dailyChange = previousSpot
      ? Number((latestSpot.modal_price - previousSpot.modal_price).toFixed(2))
      : 0;
    const dailyChangePct =
      previousSpot && previousSpot.modal_price > 0
        ? Number(((dailyChange / previousSpot.modal_price) * 100).toFixed(2))
        : 0;

    // Optional futures signal (PRD 7.5: only show if applicable contract exists in futures_prices)
    const futuresRes = await pool.query(
      `SELECT contract_month, expiry_date, price_date, settlement_price::float
       FROM futures_prices
       WHERE commodity_id = $1
       ORDER BY price_date DESC
       LIMIT 1`,
      [cropId]
    );

    let futuresComparison = null;
    if (futuresRes.rows.length > 0) {
      const latestFutures = futuresRes.rows[0];
      const spread = Number((latestFutures.settlement_price - latestSpot.modal_price).toFixed(2));
      const spreadPct =
        latestSpot.modal_price > 0
          ? Number(((spread / latestSpot.modal_price) * 100).toFixed(2))
          : 0;

      futuresComparison = {
        exchange: "NCDEX",
        contract_month: formatDate(latestFutures.contract_month),
        expiry_date: formatDate(latestFutures.expiry_date),
        price_date: formatDate(latestFutures.price_date),
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
        price_date: formatDate(latestSpot.price_date),
        observed_min: latestSpot.min_price,
        observed_max: latestSpot.max_price,
        modal_price: latestSpot.modal_price,
        arrival_qty: latestSpot.arrival_qty ?? 0,
        unit: crop.unit,
        source: "Agmarknet (PostgreSQL)",
        freshness: "Periodic daily mandi report",
        daily_change: dailyChange,
        daily_change_pct: dailyChangePct
      },
      futures: futuresComparison
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/prices/history?cropId=...&marketId=... — Historical series for Trends chart (PRD 9)
const getPriceHistory = async (req, res, next) => {
  try {
    const cropId = Number(req.query.cropId);
    const marketId = Number(req.query.marketId);

    if (!cropId || !marketId) {
      return res.status(400).json({ error: "cropId and marketId query parameters are required" });
    }

    const { rows } = await pool.query(
      `SELECT price_date, min_price::float, max_price::float, modal_price::float, arrival_qty::float
       FROM spot_prices
       WHERE commodity_id = $1 AND market_id = $2
       ORDER BY price_date ASC`,
      [cropId, marketId]
    );

    const series = rows.map((row) => ({
      date: formatDate(row.price_date),
      min_price: row.min_price,
      max_price: row.max_price,
      modal_price: row.modal_price,
      arrival_qty: row.arrival_qty ?? 0
    }));

    res.status(200).json({
      cropId,
      marketId,
      count: series.length,
      series
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/markets/nearby?cropId=...&marketId=... — Nearby mandi comparison (PRD 7.7)
const getNearbyMandis = async (req, res, next) => {
  try {
    const cropId = Number(req.query.cropId);
    const currentMarketId = Number(req.query.marketId);

    if (!cropId) {
      return res.status(400).json({ error: "cropId query parameter is required" });
    }

    const cropRes = await pool.query(
      `SELECT id, name, COALESCE(NULLIF(unit, ''), 'Quintal') AS unit
       FROM commodities WHERE id = $1`,
      [cropId]
    );

    const crop = cropRes.rows[0];
    if (!crop) {
      return res.status(404).json({ error: "Crop not found" });
    }

    // DISTINCT ON (market_id) retrieves the single latest reported price per market
    const { rows } = await pool.query(
      `SELECT DISTINCT ON (sp.market_id)
         m.id AS market_id,
         m.name AS market_name,
         m.district,
         m.state,
         sp.price_date,
         sp.modal_price::float,
         sp.min_price::float,
         sp.max_price::float
       FROM spot_prices sp
       JOIN markets m ON m.id = sp.market_id
       WHERE sp.commodity_id = $1
       ORDER BY sp.market_id, sp.price_date DESC`,
      [cropId]
    );

    const sorted = rows
      .map((r) => ({
        market_id: r.market_id,
        market_name: r.market_name,
        district: r.district,
        state: r.state,
        is_selected: r.market_id === currentMarketId,
        price_date: formatDate(r.price_date),
        modal_price: r.modal_price,
        min_price: r.min_price,
        max_price: r.max_price,
        unit: crop.unit
      }))
      .sort((a, b) => b.modal_price - a.modal_price);

    const highestPrice = sorted.length > 0 ? sorted[0].modal_price : null;

    const comparisons = sorted.map((item) => ({
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
  } catch (err) {
    next(err);
  }
};

module.exports = { getLatestPrice, getPriceHistory, getNearbyMandis }; 