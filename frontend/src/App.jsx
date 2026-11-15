import { useEffect, useState } from "react";
import { api } from "./services/api";
import Navbar from "./components/Navbar";
import CropSelector from "./components/CropSelector";
import MarketSelector from "./components/MarketSelector";
import SpotPriceCard from "./components/SpotPriceCard";
import EstimatedRangeCard from "./components/EstimatedRangeCard";
import RecommendationCard from "./components/RecommendationCard";
import NearbyMandiList from "./components/NearbyMandiList";
import HistoricalPriceChart from "./components/HistoricalPriceChart";
import AlertsPanel from "./components/AlertsPanel";

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");

  const [crops, setCrops] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [selectedCropId, setSelectedCropId] = useState(1);
  const [selectedMarketId, setSelectedMarketId] = useState(1);

  const [priceData, setPriceData] = useState(null);
  const [rangeData, setRangeData] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [nearbyData, setNearbyData] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [predictionData, setPredictionData] = useState(null);

  const [alerts, setAlerts] = useState([]);
  const [alertNote, setAlertNote] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load initial crops, markets, and alerts on mount
  useEffect(() => {
    async function loadInitialCatalog() {
      try {
        const [cropsRes, marketsRes, alertsRes] = await Promise.all([
          api.getCrops(),
          api.getMarkets(),
          api.getAlerts()
        ]);
        setCrops(cropsRes.data);
        setMarkets(marketsRes.data);
        setAlerts(alertsRes.data);
        setAlertNote(alertsRes.note || "");

        if (cropsRes.data.length > 0) setSelectedCropId(cropsRes.data[0].id);
        if (marketsRes.data.length > 0) setSelectedMarketId(marketsRes.data[0].id);
      } catch (err) {
        setError("Failed to connect to AgriPulse backend. Ensure Express server is running on port 5000.");
      }
    }
    loadInitialCatalog();
  }, []);

  // Reload market intelligence whenever selectedCropId or selectedMarketId changes
  useEffect(() => {
    if (!selectedCropId || !selectedMarketId) return;

    async function loadMarketIntelligence() {
      setLoading(true);
      setError("");
      try {
        const [priceRes, rangeRes, recRes, nearbyRes, historyRes, predRes] =
          await Promise.all([
            api.getLatestPrice(selectedCropId, selectedMarketId),
            api.getEstimatedRange(selectedCropId, selectedMarketId),
            api.getRecommendation(selectedCropId, selectedMarketId),
            api.getNearbyMandis(selectedCropId, selectedMarketId),
            api.getPriceHistory(selectedCropId, selectedMarketId),
            api.getPredictions(selectedCropId, selectedMarketId)
          ]);

        setPriceData(priceRes);
        setRangeData(rangeRes);
        setRecommendation(recRes);
        setNearbyData(nearbyRes);
        setHistoryData(historyRes);
        setPredictionData(predRes);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadMarketIntelligence();
  }, [selectedCropId, selectedMarketId]);

  const handleCreateAlert = async (payload) => {
    await api.createAlert(payload);
    const updated = await api.getAlerts();
    setAlerts(updated.data);
  };

  const handleDeleteAlert = async (id) => {
    await api.deleteAlert(id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const selectedCrop = crops.find((c) => c.id === selectedCropId);
  const selectedMarket = markets.find((m) => m.id === selectedMarketId);

  return (
    <div className="app-shell">
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />

      {error && (
        <div
          className="card"
          style={{
            borderColor: "#F2A6A6",
            color: "#F2A6A6",
            marginBottom: "1rem"
          }}
        >
          {error}
        </div>
      )}

      {activeTab !== "alerts" && (
        <>
          <CropSelector
            crops={crops}
            selectedCropId={selectedCropId}
            onSelectCrop={setSelectedCropId}
          />
          <MarketSelector
            markets={markets}
            selectedMarketId={selectedMarketId}
            onSelectMarket={setSelectedMarketId}
          />
        </>
      )}

      {loading && activeTab !== "alerts" ? (
        <div className="card" style={{ color: "var(--text-secondary)" }}>
          Loading market intelligence...
        </div>
      ) : (
        <>
          {activeTab === "dashboard" && (
            <div style={{ display: "grid", gap: "1.25rem" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                  gap: "1.25rem"
                }}
              >
                <SpotPriceCard priceData={priceData} />
                <RecommendationCard recommendation={recommendation} />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                  gap: "1.25rem"
                }}
              >
                <EstimatedRangeCard
                  rangeData={rangeData}
                  unit={selectedCrop?.unit || "Quintal"}
                />
                <NearbyMandiList
                  nearbyData={nearbyData}
                  onSelectMarket={setSelectedMarketId}
                />
              </div>
            </div>
          )}

          {activeTab === "trends" && (
            <HistoricalPriceChart
              historyData={historyData}
              predictionData={predictionData}
              cropName={selectedCrop?.name || "Crop"}
              marketName={selectedMarket?.name || "Mandi"}
            />
          )}

          {activeTab === "alerts" && (
            <AlertsPanel
              crops={crops}
              markets={markets}
              alerts={alerts}
              alertNote={alertNote}
              onCreateAlert={handleCreateAlert}
              onDeleteAlert={handleDeleteAlert}
            />
          )}
        </>
      )}
    </div>
  );
}