import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from "recharts";
import { LineChart as LineChartIcon } from "lucide-react";

export default function HistoricalPriceChart({ historyData, predictionData, cropName, marketName }) {
  const series = historyData?.series || [];

  return (
    <div className="card">
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "0.5rem",
          marginBottom: "1rem"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
          <LineChartIcon size={18} color="#AEB5A8" />
          <span className="muted-label">
            Historical Price Trends — {cropName} ({marketName})
          </span>
        </div>

        {predictionData?.supported && (
          <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
            5-Day Avg: <strong>₹{predictionData.moving_average_price}</strong> • Direction:{" "}
            <strong style={{ textTransform: "capitalize" }}>{predictionData.expected_direction}</strong>
          </span>
        )}
      </div>

      {series.length === 0 ? (
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
          No historical price series available for this crop and mandi yet.
        </p>
      ) : (
        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer>
            <LineChart data={series} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(241, 240, 239, 0.1)" />
              <XAxis
                dataKey="date"
                stroke="#AEB5A8"
                tick={{ fontSize: 12, fill: "#AEB5A8" }}
              />
              <YAxis
                stroke="#AEB5A8"
                tick={{ fontSize: 12, fill: "#AEB5A8" }}
                domain={["auto", "auto"]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1E2C22",
                  border: "1px solid rgba(241, 240, 239, 0.2)",
                  borderRadius: "8px",
                  color: "#F1F0EF"
                }}
              />
              <Legend wrapperStyle={{ fontSize: "0.85rem", color: "#F1F0EF" }} />
              <Line
                type="monotone"
                dataKey="modal_price"
                name="Modal Price (₹)"
                stroke="#D4B459"
                strokeWidth={3}
                dot={{ r: 4, fill: "#D4B459" }}
              />
              <Line
                type="monotone"
                dataKey="max_price"
                name="Observed Max (₹)"
                stroke="#8FB996"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="min_price"
                name="Observed Min (₹)"
                stroke="#AEB5A8"
                strokeDasharray="4 4"
                strokeWidth={1.8}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <p style={{ fontSize: "0.76rem", color: "var(--text-secondary)", marginTop: "0.75rem" }}>
        Seasonal statements are generated only when multi-year historical data supports them.
      </p>
    </div>
  );
}