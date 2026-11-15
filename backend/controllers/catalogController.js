const { commodities, markets, spotPrices } = require("../data/mockData");

// GET /api/crops — returns crops with verified price availability (PRD 7.1)
const getCrops = (req, res) => {
  const cropsWithAvailability = commodities.map((crop) => {
    const hasPriceData = spotPrices.some((p) => p.commodity_id === crop.id);
    return {
      ...crop,
      has_price_data: hasPriceData
    };
  });

  res.status(200).json({
    count: cropsWithAvailability.length,
    data: cropsWithAvailability
  });
};

// GET /api/markets — returns markets, with optional ?state= or ?search= filters (PRD 7.2)
const getMarkets = (req, res) => {
  const { state, search } = req.query;
  let filteredMarkets = [...markets];

  if (state) {
    filteredMarkets = filteredMarkets.filter(
      (m) => m.state.toLowerCase() === state.toLowerCase()
    );
  }

  if (search) {
    const q = search.toLowerCase();
    filteredMarkets = filteredMarkets.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.district.toLowerCase().includes(q)
    );
  }

  res.status(200).json({
    count: filteredMarkets.length,
    data: filteredMarkets
  });
};

module.exports = { getCrops, getMarkets };