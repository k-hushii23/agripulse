const BASE_URL = "/api";

async function request(endpoint, options = {}) {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "API request failed");
  }
  return data;
}

export const api = {
  getCrops: () => request("/crops"),
  getMarkets: (params = "") => request(`/markets${params}`),
  getLatestPrice: (cropId, marketId) =>
    request(`/prices?cropId=${cropId}&marketId=${marketId}`),
  getPriceHistory: (cropId, marketId) =>
    request(`/prices/history?cropId=${cropId}&marketId=${marketId}`),
  getEstimatedRange: (cropId, marketId) =>
    request(`/prices/range?cropId=${cropId}&marketId=${marketId}`),
  getPredictions: (cropId, marketId) =>
    request(`/predictions?cropId=${cropId}&marketId=${marketId}`),
  getRecommendation: (cropId, marketId) =>
    request(`/recommendations?cropId=${cropId}&marketId=${marketId}`),
  getNearbyMandis: (cropId, marketId) =>
    request(`/markets/nearby?cropId=${cropId}&marketId=${marketId}`),
  getAlerts: () => request("/alerts"),
  createAlert: (payload) =>
    request("/alerts", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  deleteAlert: (id) =>
    request(`/alerts/${id}`, {
      method: "DELETE"
    })
};