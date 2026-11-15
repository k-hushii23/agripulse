import { BarChart3 } from "lucide-react";

export default function EstimatedRangeCard({ rangeData, unit = "Quintal" }) {
  if (!rangeData) return null;

  return (
    <div className="card">
      <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
        <BarChart3 size={17} color="#AEB5A8" />
        <span className="muted-label">Model-Estimated Future Price Range</span>
      </div>

      {!rangeData.supported ? (
        <p style={{ marginTop: "0.75rem", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
          {rangeData.message}
        </p>
      ) : (
        <>
          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
            Horizon: {rangeData.horizon}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "0.6rem",
              margin: "1rem 0 0.75rem"
            }}
          >
            <span style={{ fontSize: "1.65rem", fontWeight: 700 }}>
              ₹{rangeData.estimated_min.toLocaleString("en-IN")} – ₹{rangeData.estimated_max.toLocaleString("en-IN")}
            </span>
            <span style={{ color: "var(--text-secondary)", fontSize: "0.88rem" }}>
              / {unit}
            </span>
          </div>

          <div className="card-deep" style={{ fontSize: "0.84rem", marginBottom: "0.75rem" }}>
            <span style={{ color: "var(--text-secondary)" }}>Projected Center: </span>
            <strong>₹{rangeData.projected_center.toLocaleString("en-IN")}</strong>
            <span style={{ color: "var(--text-secondary)" }}>
              {" "}• Latest Actual Modal: ₹{rangeData.observed_today.modal_price.toLocaleString("en-IN")}
            </span>
          </div>

          <p style={{ fontSize: "0.76rem", color: "var(--text-secondary)" }}>
            {rangeData.disclaimer}
          </p>
        </>
      )}
    </div>
  );
}