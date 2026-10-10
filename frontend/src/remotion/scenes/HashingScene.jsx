import { interpolate, useCurrentFrame } from "remotion";
import { Eyebrow, VideoBackground } from "../components/VideoBackground";
import { SoundCue } from "../components/Motion";
import { videoTokens as t } from "../videoTokens";

const fields = [
  ["Serial Number", "UG2026-004821"],
  ["Graduate", "Kwame Mensah"],
  ["Programme", "BSc Computer Science"],
  ["Graduation Year", "2026"],
  ["Issuing Institution", "University of Ghana"],
];
const originalHash = "8f4c9a2e7b1d6f03c5a8e21b9d4f7c62a31e8b05d9c4f6a27e1b3c8d5f902a14";
const modifiedHash = "3b7e21f94a8c6d02f51c93a7e42d8b16c8a4e2f109d7b6c3a5f8e1d2c9b047a6";

function DataField({ label, value, active, changed }) {
  return (
    <div style={{ background: active ? "#134e4a" : t.panel, border: `1px solid ${active ? t.accentBright : t.border}`, borderRadius: t.radiusControl, boxShadow: active ? `0 0 18px ${t.accentBright}22` : "none", padding: "9px 13px", scale: active ? 1.025 : 1 }}>
      <div style={{ color: active ? t.accentBright : t.muted, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ color: changed ? "#fbbf24" : t.body, fontFamily: "monospace", fontSize: 14, marginTop: 4 }}>{value}</div>
    </div>
  );
}

function CertificateDataCard({ frame }) {
  const reveal = interpolate(frame, [8, 45], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const activeField = frame < 72 ? Math.floor((frame - 20) / 10) : -1;
  const changed = frame >= 238;
  return (
    <div style={{ opacity: reveal, transform: `translateY(${interpolate(reveal, [0, 1], [20, 0])}px)`, width: 470 }}>
      <div style={{ color: t.muted, fontSize: 13, letterSpacing: "0.14em", marginBottom: 10, textTransform: "uppercase" }}>Certificate information</div>
      <div style={{ background: t.panel, border: `1px solid ${t.border}`, borderRadius: t.radiusCard, display: "grid", gap: 8, padding: 16 }}>
        {fields.map(([label, value], index) => (
          <DataField active={activeField === index || (changed && index === 3)} changed={changed && index === 3} key={label} label={label} value={changed && index === 3 ? "2025" : value} />
        ))}
      </div>
    </div>
  );
}

function CanonicalData({ frame }) {
  const reveal = interpolate(frame, [70, 100], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const changed = frame >= 238;
  const value = changed ? "UG2026-004821|Kwame Mensah|BSc Computer Science|2025|University of Ghana" : "UG2026-004821|Kwame Mensah|BSc Computer Science|2026|University of Ghana";
  return (
    <div style={{ opacity: reveal, transform: `translateY(${interpolate(reveal, [0, 1], [15, 0])}px)`, width: 670 }}>
      <div style={{ color: t.accentBright, fontSize: 13, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>Canonical certificate data</div>
      <div style={{ background: "#0b1220", border: `1px solid ${changed ? "#f59e0b" : t.border}`, borderRadius: t.radiusCard, color: changed ? "#fbbf24" : "#d1fae5", fontFamily: "monospace", fontSize: 16, lineHeight: 1.55, marginTop: 10, padding: "16px 18px" }}>{value}</div>
      <div style={{ color: t.muted, fontSize: 14, marginTop: 10 }}>Same fields. Same order. One consistent input.</div>
    </div>
  );
}

function CryptoProcessor({ frame }) {
  const reveal = interpolate(frame, [105, 135], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const pulse = 0.94 + Math.sin(frame * 0.18) * 0.04;
  return (
    <div style={{ alignItems: "center", display: "flex", gap: 20, opacity: reveal }}>
      <div style={{ color: t.accentBright, fontSize: 35 }}>→</div>
      <div style={{ background: "#134e4a", border: `1px solid ${t.accentBright}`, borderRadius: t.radiusCard, boxShadow: `0 0 28px ${t.accentBright}22`, padding: "20px 28px", scale: pulse, textAlign: "center", width: 190 }}>
        <div style={{ color: t.accentBright, fontFamily: "monospace", fontSize: 25, fontWeight: 800 }}>SHA-256</div>
        <div style={{ color: "#d1fae5", fontSize: 13, marginTop: 9 }}>processing data</div>
      </div>
      <div style={{ color: t.accentBright, fontSize: 35 }}>→</div>
    </div>
  );
}

function HashDisplay({ hash, label, progress, changed = false }) {
  const visibleCharacters = Math.floor(interpolate(progress, [0, 1], [0, hash.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  return (
    <div style={{ background: t.panel, border: `1px solid ${changed ? "#f59e0b" : t.border}`, borderRadius: t.radiusCard, padding: "18px 22px", width: 505 }}>
      <div style={{ color: changed ? "#fbbf24" : t.accentBright, fontSize: 13, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ color: changed ? "#fbbf24" : "#d1fae5", fontFamily: "monospace", fontSize: 18, letterSpacing: "0.04em", lineHeight: 1.8, marginTop: 12 }}>
        {hash.slice(0, 32).split("").map((character, index) => <span key={`a-${index}`} style={{ opacity: index < visibleCharacters ? 1 : 0.12 }}>{character}</span>)}
        <br />
        {hash.slice(32).split("").map((character, index) => <span key={`b-${index}`} style={{ opacity: index + 32 < visibleCharacters ? 1 : 0.12 }}>{character}</span>)}
      </div>
      <div style={{ color: t.muted, fontSize: 13, marginTop: 8 }}>64 hexadecimal characters</div>
    </div>
  );
}

export function HashingScene() {
  const frame = useCurrentFrame();
  const originalProgress = interpolate(frame, [142, 204], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const modifiedProgress = interpolate(frame, [254, 302], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const comparison = frame >= 220;
  const final = frame >= 330;
  return (
    <VideoBackground>
      <SoundCue name="hash-generated" />
      <div style={{ height: "100%", padding: "72px 150px", position: "relative" }}>
        <Eyebrow>03 / SHA-256 hashing</Eyebrow>
        <div style={{ fontSize: 48, fontWeight: 800, letterSpacing: "-0.05em", marginTop: 12 }}>Step 1: Create a cryptographic <span style={{ color: t.accentBright }}>fingerprint.</span></div>
        <div style={{ color: t.body, fontSize: 25, marginTop: 10 }}>MerkliFy hashes the certificate data using SHA-256.</div>
        {!comparison && (
          <div style={{ alignItems: "center", display: "flex", gap: 30, marginTop: 36 }}>
            <CertificateDataCard frame={frame} />
            <div style={{ alignItems: "center", display: "flex", flexDirection: "column", gap: 20 }}>
              <CanonicalData frame={frame} />
              <CryptoProcessor frame={frame} />
            </div>
            <HashDisplay hash={originalHash} label="SHA-256 Hash" progress={originalProgress} />
          </div>
        )}
        {comparison && !final && (
          <div style={{ marginTop: 44 }}>
            <div style={{ color: "#fbbf24", fontSize: 18, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>One field changed: Graduation Year 2026 → 2025</div>
            <div style={{ alignItems: "center", display: "flex", gap: 36, marginTop: 24 }}>
              <HashDisplay hash={originalHash} label="Original Hash" progress={1} />
              <div style={{ color: t.accentBright, fontSize: 35 }}>≠</div>
              <HashDisplay changed hash={modifiedHash} label="Modified Hash" progress={modifiedProgress} />
            </div>
            <div style={{ color: "#fbbf24", fontSize: 32, fontWeight: 700, marginTop: 28 }}>Change the data → the hash changes.</div>
          </div>
        )}
        {final && (
          <div style={{ alignItems: "center", display: "flex", gap: 65, marginTop: 75 }}>
            <div style={{ color: t.body, fontSize: 30, fontWeight: 700, lineHeight: 1.6 }}>Certificate Data<br /><span style={{ color: t.accentBright }}>↓</span><br />SHA-256<br /><span style={{ color: t.accentBright }}>↓</span><br />Cryptographic Fingerprint</div>
            <HashDisplay hash={originalHash} label="One certificate. One cryptographic fingerprint." progress={1} />
            <div style={{ color: t.body, fontSize: 25, lineHeight: 1.4, width: 360 }}>This fingerprint helps prove that the certificate data has not been altered.</div>
          </div>
        )}
      </div>
    </VideoBackground>
  );
}
