export const videoTokens = {
  accent: "#0d9488",
  accentBright: "#2dd4bf",
  accentSoft: "#ccfbf1",
  background: "#0f172a",
  panel: "#1e293b",
  surface: "#ffffff",
  surfaceMuted: "#f8fafc",
  border: "#334155",
  borderLight: "#e2e8f0",
  heading: "#f8fafc",
  body: "#cbd5e1",
  muted: "#94a3b8",
  darkText: "#0f172a",
  radiusControl: 8,
  radiusCard: 12,
  font: "Inter, ui-sans-serif, system-ui, sans-serif",
};

export const videoLayout = {
  frameWidth: 1920,
  frameHeight: 1080,
  safeLeft: 120,
  safeRight: 120,
  safeTop: 90,
  safeBottom: 100,
  captionTop: 850,
};

export const sceneDurations = {
  problem: 150,
  introduction: 240,
  hashing: 360,
  merkleTree: 300,
  digitalSignature: 270,
  verification: 300,
  final: 210,
};

export const totalDuration = Object.values(sceneDurations).reduce(
  (total, duration) => total + duration,
  0,
);
