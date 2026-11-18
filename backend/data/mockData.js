/**
 * AgriPulse demo/mock data.
 *
 * Base market observations come from the project's cleaned data.gov.in
 * snapshot at database/clean/normalized_mandi.json (13 Nov 2026).
 * Four earlier price points and futures records are SIMULATED for demo/testing
 * because the supplied snapshot contains only one observation date and no
 * NCDEX futures feed. They must not be presented as reported market prices.
 */
const path = require("path");
const normalizedData = require(path.join(
  __dirname,
  "../../database/clean/normalized_mandi.json"
));

const UNIT = "Quintal";
const records = Array.isArray(normalizedData.records) ? normalizedData.records : [];

const commodityMap = new Map();
const marketMap = new Map();
const commodities = [];
const markets = [];

function commodityKey(row) {
  return [row.commodity, row.variety || "", row.grade || ""].join("||").toLowerCase();
}

function marketKey(row) {
  return [row.market, row.district || "", row.state || ""].join("||").toLowerCase();
}

for (const row of records) {
  const cKey = commodityKey(row);
  if (!commodityMap.has(cKey)) {
    const commodity = {
      id: commodities.length + 1,
      name: row.commodity,
      variety: row.variety || null,
      grade: row.grade || null,
      unit: UNIT
    };
    commodityMap.set(cKey, commodity);
    commodities.push(commodity);
  }

  const mKey = marketKey(row);
  if (!marketMap.has(mKey)) {
    const market = {
      id: markets.length + 1,
      name: row.market,
      district: row.district || null,
      state: row.state || null
    };
    marketMap.set(mKey, market);
    markets.push(market);
  }
}

function parseDate(value) {
  // The normalized file uses ISO YYYY-MM-DD dates.
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid mandi date: ${value}`);
  return date;
}

function dateString(date) {
  return date.toISOString().slice(0, 10);
}

const spotPrices = [];
const seenSpotKeys = new Set();

for (let index = 0; index < records.length; index += 1) {
  const row = records[index];
  const commodity = commodityMap.get(commodityKey(row));
  const market = marketMap.get(marketKey(row));
  const actualDate = parseDate(row.arrival_date);
  const min = Number(row.min_price);
  const max = Number(row.max_price);
  const modal = Number(row.modal_price);

  if (![min, max, modal].every(Number.isFinite) || min <= 0 || max < min || modal <= 0) {
    continue;
  }

  // Add four clearly labelled simulated historical points so charting and
  // baseline-intelligence endpoints can be demonstrated with this one-day feed.
  for (let daysAgo = 4; daysAgo >= 1; daysAgo -= 1) {
    const factor = 1 + (((index + daysAgo) % 5) - 2) * 0.006;
    const historicalDate = new Date(actualDate);
    historicalDate.setUTCDate(historicalDate.getUTCDate() - daysAgo);
    const key = `${commodity.id}|${market.id}|${dateString(historicalDate)}`;
    if (!seenSpotKeys.has(key)) {
      seenSpotKeys.add(key);
      spotPrices.push({
        commodity_id: commodity.id,
        market_id: market.id,
        price_date: dateString(historicalDate),
        min_price: Number((min * factor).toFixed(2)),
        max_price: Number((max * factor).toFixed(2)),
        modal_price: Number((modal * factor).toFixed(2)),
        arrival_qty: null,
        source: "SIMULATED DEMO HISTORY — derived from data.gov.in snapshot; not a reported observation",
        is_simulated: true
      });
    }
  }

  const actualKey = `${commodity.id}|${market.id}|${dateString(actualDate)}`;
  if (!seenSpotKeys.has(actualKey)) {
    seenSpotKeys.add(actualKey);
    spotPrices.push({
      commodity_id: commodity.id,
      market_id: market.id,
      price_date: dateString(actualDate),
      min_price: min,
      max_price: max,
      modal_price: modal,
      arrival_qty: null,
      source: normalizedData.source || "data.gov.in",
      is_simulated: false
    });
  }
}

spotPrices.sort((a, b) => a.price_date.localeCompare(b.price_date));

// The supplied ZIP does not include an NCDEX futures dataset. These records
// are placeholders for UI/API demonstrations and are explicitly labelled.
const latestSpotByCommodity = new Map();
for (const spot of spotPrices) {
  if (spot.is_simulated) continue;
  const existing = latestSpotByCommodity.get(spot.commodity_id);
  if (!existing || spot.price_date > existing.price_date) {
    latestSpotByCommodity.set(spot.commodity_id, spot);
  }
}

const futuresPrices = [...latestSpotByCommodity.values()].map((spot, index) => {
  const contractDate = new Date(`${spot.price_date}T00:00:00.000Z`);
  contractDate.setUTCMonth(contractDate.getUTCMonth() + 2);
  const expiryDate = new Date(contractDate);
  expiryDate.setUTCDate(20);
  return {
    commodity_id: spot.commodity_id,
    exchange: "SIMULATED — NCDEX feed not connected",
    contract_month: dateString(contractDate),
    expiry_date: dateString(expiryDate),
    price_date: spot.price_date,
    settlement_price: Number((spot.modal_price * (1 + (index % 7 - 3) * 0.004)).toFixed(2)),
    source: "SIMULATED DEMO FUTURES — not actual NCDEX data",
    is_simulated: true
  };
});

const alerts = [
  {
    id: 1,
    commodity_id: commodities[0]?.id,
    market_id: markets[0]?.id,
    target_price: commodities[0] && spotPrices.find((p) => p.commodity_id === commodities[0].id)?.modal_price
      ? Number((spotPrices.find((p) => p.commodity_id === commodities[0].id).modal_price * 1.05).toFixed(2))
      : 1000,
    unit: UNIT,
    direction: "above",
    status: "active",
    created_at: "2026-11-18T00:00:00.000Z"
  }
].filter((alert) => alert.commodity_id && alert.market_id);

module.exports = {
  commodities,
  markets,
  spotPrices,
  futuresPrices,
  alerts,
  dataInfo: {
    baseSource: normalizedData.source || "data.gov.in",
    baseSnapshotDate: normalizedData.normalization_date || null,
    actualObservationCount: spotPrices.filter((row) => !row.is_simulated).length,
    simulatedHistoryCount: spotPrices.filter((row) => row.is_simulated).length,
    simulatedFuturesCount: futuresPrices.length,
    note: "Historical extensions and futures are simulated demo data, not reported market observations."
  }
};
