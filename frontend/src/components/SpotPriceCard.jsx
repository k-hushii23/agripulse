import { ArrowUpRight, ArrowDownRight, Minus, Clock } from "lucide-react";

export default function SpotPriceCard({ priceData }) {
  if (!priceData) return null;

  if (!priceData.available) {
    return (
      <div className="card">
        <div className="muted-label">Latest Observed Spot Price</div>
        <p style={{ marginTop: "0.75rem", color: "var(--text-secondary)" }}>
          {priceData.message}
        </p>
      </div>
    );
  }

  const { spot, futures, crop, market } = priceData;
  const isUp = spot.daily_change > 0;
  const isDown = spot.daily_change < 0;

  return (
    <div className="card">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "0.5rem"
        }}
      >
        <div>
          <div className="muted-label">Latest Observed Spot Price</div>
          <div style={{ fontSize: "0.95rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
            {crop.name} ({crop.variety}) • {market.name}
          </div>
        </div>

        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.25rem",
            padding: "0.25rem 0.6rem",
            borderRadius: "999px",
            fontSize: "0.82rem",
            fontWeight: 600,
            backgroundColor: "var(--bg-deep)",
            color: isUp ? "#A3D9A5" : isDown ? "#F2A6A6" : "var(--text-secondary)"
          }}
        >
          {isUp && <ArrowUpRight size={14} />}
          {isDown && <ArrowDownRight size={14} />}
          {!isUp && !isDown && <Minus size={14} />}
          {spot.daily_change > 0 ? `+₹${spot.daily_change}` : `₹${spot.daily_change}`} ({spot.daily_change_pct}%)
        </span>
      </div>

      <div style={{ margin: "1rem 0 0.75rem" }}>
        <span className="price-figure">₹{spot.modal_price.toLocaleString("en-IN")}</span>
        <span style={{ color: "var(--text-secondary)", marginLeft: "0.4rem" }}>
          / {spot.unit}
        </span>
      </div>

      <div
        className="card-deep"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "0.5rem",
          marginBottom: "0.85rem"
        }}
      >
        <div>
          <div className="muted-label" style={{ fontSize: "0.72rem" }}>Observed Min</div>
          <div style={{ fontWeight: 600 }}>₹{spot.observed_min}</div>
        </div>
        <div>
          <div className="muted-label" style={{ fontSize: "0.72rem" }}>Observed Max</div>
          <div style={{ fontWeight: 600 }}>₹{spot.observed_max}</div>
        </div>
        <div>
          <div className="muted-label" style={{ fontSize: "0.72rem" }}>Arrivals</div>
          <div style={{ fontWeight: 600 }}>{spot.arrival_qty} Qtl</div>
        </div>
      </div>

      {futures && (
        <div
          className="card-deep"
          style={{ marginBottom: "0.85rem", borderLeft: "3px solid var(--gold-accent)" }}
        >
          <div className="muted-label" style={{ fontSize: "0.72rem" }}>
            {futures.exchange} Futures Signal ({futures.contract_month})
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.25rem" }}>
            <span style={{ fontWeight: 600 }}>₹{futures.settlement_price} / {spot.unit}</span>
            <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
              Spread: {futures.spread >= 0 ? `+₹${futures.spread}` : `₹${futures.spread}`} ({futures.spread_pct}%)
            </span>
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
            {futures.note}
          </div>
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          gap: "0.5rem",
          fontSize: "0.78rem",
          color: "var(--text-secondary)"
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
          <Clock size={13} /> Reported: {spot.price_date} ({spot.freshness})
        </span>
        <span>Source: {spot.source}</span>
      </div>
    </div>
  );
}