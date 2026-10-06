import { videoTokens as t } from "../videoTokens";

export function VideoBackground({ children, light = false }) {
  return (
    <div
      style={{
        background: light ? t.surfaceMuted : t.background,
        color: light ? t.darkText : t.heading,
        fontFamily: t.font,
        height: 1080,
        overflow: "hidden",
        position: "relative",
        width: 1920,
      }}
    >
      <div
        style={{
          backgroundImage: light
            ? "linear-gradient(rgba(15,118,110,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(15,118,110,0.04) 1px, transparent 1px)"
            : "linear-gradient(rgba(148,163,184,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.05) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          inset: 0,
          opacity: 0.8,
          position: "absolute",
        }}
      />
      <div style={{ height: 1080, position: "relative", width: 1920 }}>{children}</div>
    </div>
  );
}

export function Eyebrow({ children }) {
  return (
    <div
      style={{
        color: t.accentBright,
        fontSize: 18,
        fontWeight: 700,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
      }}
    >
      {children}
    </div>
  );
}
