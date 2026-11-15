const pool = require("../config/db");

// GET /api/crops — returns commodities that have verified spot_prices data (PRD 7.1)
const getCrops = async (req, res, next) => {
  try {
    const query = `
      SELECT
        c.id,
        c.name,
        c.variety,
        c.grade,
        COALESCE(NULLIF(c.unit, ''), 'Quintal') AS unit,
        COUNT(sp.id)::int AS price_count,
        TRUE AS has_price_data
      FROM commodities c
      JOIN spot_prices sp ON sp.commodity_id = c.id
      GROUP BY c.id, c.name, c.variety, c.grade, c.unit
      ORDER BY price_count DESC, c.name ASC
      LIMIT 30;
    `;

    const { rows } = await pool.query(query);

    res.status(200).json({
      count: rows.length,
      data: rows
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/markets — returns markets with verified spot_prices data, with optional ?state= or ?search= filters (PRD 7.2)
const getMarkets = async (req, res, next) => {
  try {
    const { state, search } = req.query;
    const values = [];
    const conditions = [];

    if (state) {
      values.push(state);
      conditions.push(`LOWER(m.state) = LOWER($${values.length})`);
    }

    if (search) {
      values.push(`%${search}%`);
      conditions.push(
        `(m.name ILIKE $${values.length} OR m.district ILIKE $${values.length})`
      );
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const query = `
      SELECT
        m.id,
        m.name,
        m.district,
        m.state,
        COUNT(sp.id)::int AS price_count
      FROM markets m
      JOIN spot_prices sp ON sp.market_id = m.id
      ${whereClause}
      GROUP BY m.id, m.name, m.district, m.state
      ORDER BY price_count DESC, m.name ASC;
    `;

    const { rows } = await pool.query(query, values);

    res.status(200).json({
      count: rows.length,
      data: rows
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getCrops, getMarkets };