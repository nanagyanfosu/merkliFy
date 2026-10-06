import { videoTokens as t } from "../videoTokens";

export function Certificate({ compact = false, glitch = 0, style = {} }) {
  const width = compact ? 300 : 500;
  const height = compact ? 112 : 320;
  const certificate = (
    <div
      style={{
        background: t.surfaceMuted,
        border: `1px solid ${t.borderLight}`,
        borderRadius: t.radiusCard,
        boxShadow: "0 24px 70px rgba(0, 0, 0, 0.35)",
        color: t.darkText,
        height,
        padding: compact ? "16px 20px" : "28px 34px",
        position: "relative",
        width,
      }}
    >
      <div style={{ color: t.accent, fontSize: compact ? 11 : 15, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase" }}>
        University credential
      </div>
      <div style={{ borderBottom: `1px solid ${t.borderLight}`, color: "#334155", fontSize: compact ? 17 : 30, fontWeight: 800, marginTop: compact ? 18 : 34, paddingBottom: compact ? 12 : 22 }}>
        Bachelor of Science
      </div>
      <div style={{ color: "#64748b", fontSize: compact ? 12 : 18, marginTop: compact ? 12 : 22 }}>Issued to Ama Mensah</div>
      <div style={{ color: "#64748b", fontFamily: "monospace", fontSize: compact ? 10 : 14, marginTop: compact ? 14 : 34 }}>CERT-2026-003</div>
      {!compact && <div style={{ background: t.accentSoft, borderRadius: "50%", bottom: 28, height: 54, position: "absolute", right: 32, width: 54 }} />}
    </div>
  );

  return (
    <div style={{ position: "relative", ...style, transform: `translate(${glitch * 10}px, 0px) rotate(${glitch * 0.8}deg)` }}>
      {certificate}
      {glitch > 0 && (
        <>
          <div style={{ clipPath: "inset(18% 0 48% 0)", left: -glitch * 14, opacity: glitch, position: "absolute", top: 0 }}>{certificate}</div>
          <div style={{ clipPath: "inset(62% 0 12% 0)", left: glitch * 9, opacity: glitch * 0.8, position: "absolute", top: 0 }}>{certificate}</div>
        </>
      )}
    </div>
  );
}
