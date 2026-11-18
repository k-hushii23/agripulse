const pool = require("../config/db");

function formatDate(val) {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString().split("T")[0];
  return String(val).split("T")[0];
}


// GET /api/alerts — list saved alerts from PostgreSQL with live trigger evaluation against spot_prices (PRD 10)
const getAlerts = async (req, res, next) => {
  try {
    const query = `
      SELECT
        a.id,
        a.commodity_id,
        a.market_id,
        a.target_price::float,
        a.unit,
        a.direction,
        a.status,
        a.created_at,
        c.name AS crop_name,
        m.name AS market_name,
        latest.modal_price::float AS latest_price,
        latest.price_date AS latest_price_date
      FROM alerts a
      JOIN commodities c ON c.id = a.commodity_id
      JOIN markets m ON m.id = a.market_id
      LEFT JOIN LATERAL (
        SELECT modal_price, price_date
        FROM spot_prices sp
        WHERE sp.commodity_id = a.commodity_id
          AND sp.market_id = a.market_id
        ORDER BY sp.price_date DESC
        LIMIT 1
      ) latest ON TRUE
      ORDER BY a.created_at DESC;
    `;


    const { rows } = await pool.query(query);


    const enrichedAlerts = rows.map((row) => {
      const hasPrice = row.latest_price !== null;
      const triggered = hasPrice
        ? row.direction === "below"
          ? row.latest_price <= row.target_price
          : row.latest_price >= row.target_price
        : false;


      return {
        id: row.id,
        commodity_id: row.commodity_id,
        market_id: row.market_id,
        target_price: row.target_price,
        unit: row.unit,
        direction: row.direction,
        status: row.status,
        created_at: row.created_at,
        crop_name: row.crop_name,
        market_name: row.market_name,
        evaluation: {
          triggered,
          latest_price: row.latest_price,
          price_date: formatDate(row.latest_price_date),
          source: "Agmarknet (PostgreSQL)"
        }
      };
    });


    res.status(200).json({
      count: enrichedAlerts.length,
      note: "Evaluated against latest ingested mandi reports in PostgreSQL.",
      data: enrichedAlerts
    });
  } catch (err) {
    next(err);
  }
};


// POST /api/alerts — persist a new price-threshold alert in PostgreSQL (PRD 10)
const createAlert = async (req, res, next) => {
  try {
    const { commodity_id, market_id, target_price, direction = "above" } = req.body;


    const cropId = Number(commodity_id);
    const marketId = Number(market_id);
    const target = Number(target_price);


    if (!cropId || !marketId || !target || target <= 0) {
      return res.status(400).json({
        error: "Valid commodity_id, market_id, and positive target_price are required."
      });
    }


    if (!["above", "below"].includes(direction)) {
      return res.status(400).json({
        error: "direction must be either 'above' or 'below'."
      });
    }


    const [cropRes, marketRes] = await Promise.all([
      pool.query(
        `SELECT id, name, COALESCE(NULLIF(unit, ''), 'Quintal') AS unit FROM commodities WHERE id = $1`,
        [cropId]
      ),
      pool.query(`SELECT id, name FROM markets WHERE id = $1`, [marketId])
    ]);


    const crop = cropRes.rows[0];
    const market = marketRes.rows[0];


    if (!crop || !market) {
      return res.status(404).json({ error: "Crop or market not found." });
    }


    const insertRes = await pool.query(
      `INSERT INTO alerts (commodity_id, market_id, target_price, unit, direction)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, commodity_id, market_id, target_price::float, unit, direction, status, created_at`,
      [cropId, marketId, target, crop.unit, direction]
    );


    const newAlert = insertRes.rows[0];


    // Evaluate immediately against latest spot price if available
    const latestRes = await pool.query(
      `SELECT modal_price::float, price_date
       FROM spot_prices
       WHERE commodity_id = $1 AND market_id = $2
       ORDER BY price_date DESC
       LIMIT 1`,
      [cropId, marketId]
    );


    const latest = latestRes.rows[0] || null;
    const triggered = latest
      ? direction === "below"
        ? latest.modal_price <= target
        : latest.modal_price >= target
      : false;


    res.status(201).json({
      message: "Price alert saved to database.",
      data: {
        ...newAlert,
        crop_name: crop.name,
        market_name: market.name,
        evaluation: {
          triggered,
          latest_price: latest ? latest.modal_price : null,
          price_date: latest ? formatDate(latest.price_date) : null,
          source: "Agmarknet (PostgreSQL)"
        }
      }
    });
  } catch (err) {
    next(err);
  }
};


// DELETE /api/alerts/:id — delete an alert from PostgreSQL (PRD 15)
const deleteAlert = async (req, res, next) => {
  try {
    const alertId = Number(req.params.id);

    if (!alertId) {
      return res.status(400).json({ error: "Invalid alert ID." });
    }

    const { rowCount } = await pool.query(
      `DELETE FROM alerts WHERE id = $1`,
      [alertId]
    );

    if (rowCount === 0) {
      return res.status(404).json({ error: "Alert not found." });
    }

    res.status(200).json({
      message: `Alert ${alertId} deleted.`
    });

  } catch (err) {
    next(err);
  }
};

module.exports = { getAlerts, createAlert, deleteAlert };