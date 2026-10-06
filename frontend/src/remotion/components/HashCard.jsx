import { videoTokens as t } from "../videoTokens";

export function HashCard({ label, value, changed = false, style = {} }) {
  return (
    <div style={{ background: t.panel, border: `1px solid ${changed ? "#f59e0b" : t.border}`, borderRadius: t.radiusCard, padding: "20px 24px", ...style }}>
      <div style={{ color: t.muted, fontSize: 14, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ color: changed ? "#fbbf24" : "#d1fae5", fontFamily: "monospace", fontSize: 19, marginTop: 13 }}>{value}</div>
    </div>
  );
}
