import { useState } from "react";
import { BellPlus, Trash2, CheckCircle2, Clock } from "lucide-react";

export default function AlertsPanel({
  crops,
  markets,
  alerts,
  alertNote,
  onCreateAlert,
  onDeleteAlert
}) {
  const [commodityId, setCommodityId] = useState(crops[0]?.id || 1);
  const [marketId, setMarketId] = useState(markets[0]?.id || 1);
  const [targetPrice, setTargetPrice] = useState("");
  const [direction, setDirection] = useState("above");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    const numericTarget = Number(targetPrice);
    if (!numericTarget || numericTarget <= 0) {
      setFormError("Please enter a valid target price in ₹/Quintal.");
      return;
    }

    setSubmitting(true);
    try {
      await onCreateAlert({
        commodity_id: Number(commodityId),
        market_id: Number(marketId),
        target_price: numericTarget,
        direction
      });
      setTargetPrice("");
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.85rem" }}>
          <BellPlus size={18} color="#AEB5A8" />
          <span className="muted-label">Create Price-Threshold Alert</span>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "0.75rem",
            alignItems: "end"
          }}
        >
          <div>
            <label className="muted-label" style={{ display: "block", marginBottom: "0.3rem", fontSize: "0.72rem" }}>
              Crop
            </label>
            <select
              value={commodityId}
              onChange={(e) => setCommodityId(Number(e.target.value))}
              style={inputStyle}
            >
              {crops.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="muted-label" style={{ display: "block", marginBottom: "0.3rem", fontSize: "0.72rem" }}>
              Mandi
            </label>
            <select
              value={marketId}
              onChange={(e) => setMarketId(Number(e.target.value))}
              style={inputStyle}
            >
              {markets.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="muted-label" style={{ display: "block", marginBottom: "0.3rem", fontSize: "0.72rem" }}>
              Condition
            </label>
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value)}
              style={inputStyle}
            >
              <option value="above">At or Above (≥)</option>
              <option value="below">At or Below (≤)</option>
            </select>
          </div>

          <div>
            <label className="muted-label" style={{ display: "block", marginBottom: "0.3rem", fontSize: "0.72rem" }}>
              Target Price (₹ / Quintal)
            </label>
            <input
              type="number"
              placeholder="e.g. 2550"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              style={inputStyle}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: "0.6rem 1rem",
              borderRadius: "8px",
              border: "1px solid rgba(241, 240, 239, 0.3)",
              backgroundColor: "var(--gold-accent)",
              color: "var(--text-primary)",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            {submitting ? "Saving..." : "Save Alert"}
          </button>
        </form>

        {formError && (
          <p style={{ color: "#F2A6A6", fontSize: "0.84rem", marginTop: "0.6rem" }}>
            {formError}
          </p>
        )}
      </div>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
          <span className="muted-label">Saved Price Alerts ({alerts.length})</span>
          {alertNote && (
            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
              {alertNote}
            </span>
          )}
        </div>

        {alerts.length === 0 ? (
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            No price alerts set yet. Create one above to monitor target mandi prices.
          </p>
        ) : (
          <div style={{ display: "grid", gap: "0.65rem" }}>
            {alerts.map((alert) => {
              const triggered = alert.evaluation?.triggered;
              return (
                <div
                  key={alert.id}
                  className="card-deep"
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "0.75rem",
                    borderColor: triggered ? "#D4B459" : "var(--border-subtle)"
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      {alert.crop_name} • {alert.market_name}
                    </div>
                    <div style={{ fontSize: "0.84rem", color: "var(--text-secondary)" }}>
                      Trigger when price is{" "}
                      <strong>
                        {alert.direction === "above" ? "at or above" : "at or below"} ₹
                        {alert.target_price}/{alert.unit}
                      </strong>
                    </div>
                    {alert.evaluation?.latest_price && (
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.35rem",
                          marginTop: "0.35rem",
                          fontSize: "0.78rem",
                          color: triggered ? "#D4B459" : "var(--text-secondary)"
                        }}
                      >
                        {triggered ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                        {triggered
                          ? `Triggered! Latest reported price: ₹${alert.evaluation.latest_price} (${alert.evaluation.price_date})`
                          : `Monitoring — Latest reported price: ₹${alert.evaluation.latest_price} (${alert.evaluation.price_date})`}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => onDeleteAlert(alert.id)}
                    title="Delete alert"
                    style={{
                      background: "transparent",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "8px",
                      padding: "0.45rem",
                      color: "#F2A6A6",
                      cursor: "pointer"
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "0.55rem 0.75rem",
  borderRadius: "8px",
  border: "1px solid var(--border-subtle)",
  backgroundColor: "var(--bg-deep)",
  color: "var(--text-primary)",
  fontSize: "0.9rem"
};