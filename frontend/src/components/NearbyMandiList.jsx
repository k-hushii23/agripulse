import { Store } from "lucide-react";

export default function NearbyMandiList({ nearbyData, onSelectMarket }) {
  if (!nearbyData) return null;

  return (
    <div className="card">
      <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.75rem" }}>
        <Store size={17} color="#AEB5A8" />
        <span className="muted-label">Nearby Mandi Comparison ({nearbyData.crop})</span>
      </div>

      {nearbyData.markets.length === 0 ? (
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
          No comparable mandi records available for this crop.
        </p>
      ) : (
        <div style={{ display: "grid", gap: "0.6rem" }}>
          {nearbyData.markets.map((m) => (
            <div
              key={m.market_id}
              onClick={() => onSelectMarket(m.market_id)}
              className="card-deep"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer",
                borderColor: m.is_selected
                  ? "rgba(241, 240, 239, 0.45)"
                  : "var(--border-subtle)"
              }}
            >
              <div>
                <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span>{m.market_name}</span>
                  {m.is_highest && (
                    <span
                      style={{
                        fontSize: "0.7rem",
                        padding: "0.15rem 0.5rem",
                        borderRadius: "999px",
                        backgroundColor: "var(--gold-accent)",
                        color: "var(--text-primary)"
                      }}
                    >
                      Highest Reported
                    </span>
                  )}
                  {m.is_selected && (
                    <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                      (Selected)
                    </span>
                  )}
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                  {m.district}, {m.state} • Reported: {m.price_date}
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>
                  ₹{m.modal_price.toLocaleString("en-IN")}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                  Range: ₹{m.min_price}–₹{m.max_price}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p style={{ fontSize: "0.76rem", color: "var(--text-secondary)", marginTop: "0.85rem" }}>
        {nearbyData.disclaimer}
      </p>
    </div>
  );
}