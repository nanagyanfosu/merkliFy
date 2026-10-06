import { videoTokens as t } from "../videoTokens";

export function VerificationChecks({ items, progress = 1 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {items.map((item, index) => {
        const visible = progress > index / items.length;
        return (
          <div key={item} style={{ alignItems: "center", background: visible ? "#134e4a" : t.panel, border: `1px solid ${visible ? t.accentBright : t.border}`, borderRadius: t.radiusCard, color: visible ? "#d1fae5" : t.muted, display: "flex", fontSize: 20, gap: 16, minWidth: 390, opacity: visible ? 1 : 0.45, padding: "14px 19px" }}>
            <span style={{ alignItems: "center", background: visible ? t.accentBright : t.border, borderRadius: "50%", color: t.darkText, display: "flex", fontSize: 16, fontWeight: 800, height: 26, justifyContent: "center", width: 26 }}>✓</span>
            {item}
          </div>
        );
      })}
    </div>
  );
}
