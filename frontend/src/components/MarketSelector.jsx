import { useState } from "react";
import { MapPin, Search } from "lucide-react";

export default function MarketSelector({
  markets,
  selectedMarketId,
  onSelectMarket
}) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredMarkets = markets.filter(
    (m) =>
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.district.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.state.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="card" style={{ marginBottom: "1.25rem" }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.75rem",
          alignItems: "center",
          justifyContent: "space-between"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <MapPin size={18} color="#AEB5A8" />
          <span className="muted-label">Mandi / Market Location</span>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.6rem",
            flex: "1 1 320px",
            justifyContent: "flex-end"
          }}
        >
          <div style={{ position: "relative", flex: "1 1 180px", maxWidth: "240px" }}>
            <Search
              size={15}
              color="#AEB5A8"
              style={{ position: "absolute", left: "10px", top: "11px" }}
            />
            <input
              type="text"
              placeholder="Filter mandi or state..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                padding: "0.5rem 0.75rem 0.5rem 2rem",
                borderRadius: "8px",
                border: "1px solid var(--border-subtle)",
                backgroundColor: "var(--bg-deep)",
                color: "var(--text-primary)",
                fontSize: "0.88rem"
              }}
            />
          </div>

          <select
            value={selectedMarketId || ""}
            onChange={(e) => onSelectMarket(Number(e.target.value))}
            style={{
              padding: "0.5rem 0.85rem",
              borderRadius: "8px",
              border: "1px solid var(--border-subtle)",
              backgroundColor: "var(--bg-deep)",
              color: "var(--text-primary)",
              fontSize: "0.9rem",
              minWidth: "210px",
              cursor: "pointer"
            }}
          >
            {filteredMarkets.map((market) => (
              <option key={market.id} value={market.id}>
                {market.name} — {market.district}, {market.state}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}