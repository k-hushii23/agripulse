import { Compass, AlertCircle } from "lucide-react";

export default function RecommendationCard({ recommendation }) {
  if (!recommendation) return null;

  return (
    <div className="card-gold">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "0.5rem"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
          <Compass size={18} color="#F1F0EF" />
          <span className="muted-label" style={{ color: "rgba(241, 240, 239, 0.85)" }}>
            Selling Decision Support
          </span>
        </div>

        {recommendation.confidence && (
          <span
            style={{
              fontSize: "0.75rem",
              padding: "0.2rem 0.6rem",
              borderRadius: "999px",
              backgroundColor: "rgba(30, 44, 34, 0.55)",
              color: "#F1F0EF"
            }}
          >
            Confidence: {recommendation.confidence}
          </span>
        )}
      </div>

      <h2 style={{ fontSize: "1.75rem", margin: "0.65rem 0 0.75rem" }}>
        {recommendation.suggestion}
      </h2>

      <ul style={{ paddingLeft: "1.15rem", display: "grid", gap: "0.4rem", fontSize: "0.92rem" }}>
        {recommendation.reasons.map((reason, idx) => (
          <li key={idx}>{reason}</li>
        ))}
      </ul>

      <div
        style={{
          display: "flex",
          gap: "0.45rem",
          alignItems: "flex-start",
          marginTop: "1rem",
          paddingTop: "0.75rem",
          borderTop: "1px solid rgba(241, 240, 239, 0.2)",
          fontSize: "0.78rem",
          color: "rgba(241, 240, 239, 0.9)"
        }}
      >
        <AlertCircle size={15} style={{ flexShrink: 0, marginTop: "2px" }} />
        <span>
          {recommendation.practical_constraints_note || recommendation.farmer_note}
        </span>
      </div>
    </div>
  );
}