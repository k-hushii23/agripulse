import { Sprout, LayoutDashboard, TrendingUp, Bell } from "lucide-react";

export default function Navbar({ activeTab, onTabChange }) {
  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "trends", label: "Trends", icon: TrendingUp },
    { id: "alerts", label: "Alerts", icon: Bell }
  ];

  return (
    <header
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "1rem",
        paddingBottom: "1.25rem",
        marginBottom: "1.25rem",
        borderBottom: "1px solid var(--border-subtle)"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
        <div
          style={{
            backgroundColor: "var(--gold-accent)",
            padding: "0.5rem",
            borderRadius: "10px",
            display: "flex",
            alignItems: "center"
          }}
        >
          <Sprout size={22} color="#F1F0EF" />
        </div>
        <div>
          <h1 style={{ fontSize: "1.5rem", lineHeight: 1.1 }}>AgriPulse</h1>
          <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
            Agricultural Market Intelligence
          </span>
        </div>
      </div>

      <nav style={{ display: "flex", gap: "0.5rem" }}>
        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.45rem",
                padding: "0.55rem 1rem",
                borderRadius: "999px",
                border: `1px solid ${
                  isActive ? "rgba(241, 240, 239, 0.35)" : "var(--border-subtle)"
                }`,
                backgroundColor: isActive ? "var(--gold-accent)" : "var(--bg-card)",
                color: "var(--text-primary)",
                fontWeight: isActive ? 600 : 400,
                fontSize: "0.9rem",
                cursor: "pointer"
              }}
            >
              <Icon size={16} />
              {label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}