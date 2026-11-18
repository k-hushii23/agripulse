export default function CropSelector({ crops, selectedCropId, onSelectCrop }) {
  return (
    <div style={{ marginBottom: "1rem" }}>
      <div className="muted-label" style={{ marginBottom: "0.5rem" }}>
        Select Commodity
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        {crops.map((crop) => {
          const isSelected = crop.id === selectedCropId;
          const showVariety =
            crop.variety &&
            crop.variety.toLowerCase() !== crop.name.toLowerCase() &&
            crop.variety.toLowerCase() !== "other";


          return (
            <button
              key={crop.id}
              onClick={() => onSelectCrop(crop.id)}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "999px",
                border: `1px solid ${
                  isSelected ? "rgba(241, 240, 239, 0.4)" : "var(--border-subtle)"
                }`,
                backgroundColor: isSelected ? "var(--gold-accent)" : "var(--bg-card)",
                color: "var(--text-primary)",
                fontWeight: isSelected ? 600 : 400,
                fontSize: "0.9rem",
                cursor: "pointer"
              }}
            >
              {crop.name}
              {showVariety ? ` (${crop.variety}) `: ""}
            </button>
          );
        })}
      </div>
    </div>
  );
}