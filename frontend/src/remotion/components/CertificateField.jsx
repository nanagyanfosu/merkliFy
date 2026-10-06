import { videoTokens as t } from "../videoTokens";

export function CertificateField({ label, value, active = false, compact = false, style = {} }) {
  return (
    <div
      style={{
        background: active ? "#ccfbf122" : "transparent",
        border: `1px solid ${active ? t.accentBright : "transparent"}`,
        borderRadius: t.radiusControl,
        boxShadow: active ? `0 0 20px ${t.accentBright}22` : "none",
        padding: compact ? "8px 10px" : "11px 13px",
        ...style,
      }}
    >
      <div style={{ color: active ? t.accentBright : "#64748b", fontSize: compact ? 10 : 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ color: active ? "#f8fafc" : "#334155", fontSize: compact ? 14 : 16, fontWeight: 700, marginTop: 5 }}>
        {value}
      </div>
    </div>
  );
}
