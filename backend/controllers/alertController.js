const {
  commodities,
  markets,
  spotPrices,
  alerts
} = require("../data/mockData");

// Helper: evaluate if the latest reported price triggers an alert .
function evaluateAlertStatus(alert) {
  const latest = spotPrices
    .filter((p) => p.commodity_id === alert.commodity_id && p.market_id === alert.market_id)
    .sort((a, b) => new Date(b.price_date) - new Date(a.price_date))[0];

  if (!latest) return { triggered: false, latest_price: null, price_date: null };

  const triggered =
    alert.direction === "below"
      ? latest.modal_price <= alert.target_price
      : latest.modal_price >= alert.target_price;

  return {
    triggered,
    latest_price: latest.modal_price,
    price_date: latest.price_date,
    source: latest.source
  };
}

// GET /api/alerts — list all saved alerts with live trigger evaluation (PRD 10)
const getAlerts = (req, res) => {
  const enrichedAlerts = alerts.map((alert) => {
    const crop = commodities.find((c) => c.id === alert.commodity_id);
    const market = markets.find((m) => m.id === alert.market_id);
    const evaluation = evaluateAlertStatus(alert);

    return {
      ...alert,
      crop_name: crop ? crop.name : "Unknown",
      market_name: market ? market.name : "Unknown",
      evaluation
    };
  });

  res.status(200).json({
    count: enrichedAlerts.length,
    note: "Simulated evaluation against scheduled dataset updates.",
    data: enrichedAlerts
  });
};

// POST /api/alerts — create a new price-threshold alert (PRD 10)
const createAlert = (req, res) => {
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

  const crop = commodities.find((c) => c.id === cropId);
  const market = markets.find((m) => m.id === marketId);

  if (!crop || !market) {
    return res.status(404).json({ error: "Crop or market not found." });
  }

  const newAlert = {
    id: alerts.length > 0 ? Math.max(...alerts.map((a) => a.id)) + 1 : 1,
    commodity_id: cropId,
    market_id: marketId,
    target_price: target,
    unit: crop.unit,
    direction,
    status: "active",
    created_at: new Date().toISOString()
  };

  alerts.push(newAlert);

  res.status(201).json({
    message: "Price alert created.",
    data: {
      ...newAlert,
      crop_name: crop.name,
      market_name: market.name,
      evaluation: evaluateAlertStatus(newAlert)
    }
  });
};

// DELETE /api/alerts/:id — delete an alert by ID (PRD 15)
const deleteAlert = (req, res) => {
  const alertId = Number(req.params.id);
  const index = alerts.findIndex((a) => a.id === alertId);

  if (index === -1) {
    return res.status(404).json({ error: "Alert not found." });
  }

  alerts.splice(index, 1);
  res.status(200).json({ message: `Alert ${alertId} deleted.` });
};

module.exports = { getAlerts, createAlert, deleteAlert };