import { interpolate, useCurrentFrame } from "remotion";
import { CertificateField } from "../components/CertificateField";
import { Eyebrow, VideoBackground } from "../components/VideoBackground";
import { SoundCue } from "../components/Motion";
import { videoTokens as t } from "../videoTokens";

const fields = [
  ["Graduate Name", "Ama Mensah"],
  ["Programme", "Bachelor of Science"],
  ["Graduation Year", "2026"],
  ["Serial Number", "CERT-2026-003"],
  ["University", "University of Business"],
];

const stages = ["CERTIFICATE", "DATA", "CRYPTOGRAPHIC PROOF", "VERIFICATION"];

function Stage({ label, index, active, complete }) {
  return (
    <div style={{ alignItems: "center", display: "flex", gap: 14 }}>
      <div
        style={{
          alignItems: "center",
          background: active || complete ? t.accent : t.panel,
          border: `1px solid ${active || complete ? t.accentBright : t.border}`,
          borderRadius: "50%",
          boxShadow: active ? `0 0 22px ${t.accentBright}55` : "none",
          color: active || complete ? t.darkText : t.muted,
          display: "flex",
          fontFamily: "monospace",
          fontSize: 14,
          fontWeight: 800,
          height: 31,
          justifyContent: "center",
          width: 31,
        }}
      >
        {complete ? "✓" : index + 1}
      </div>
      <div style={{ color: active ? t.heading : complete ? t.body : t.muted, fontSize: 15, fontWeight: 700, letterSpacing: "0.1em" }}>
        {label}
      </div>
    </div>
  );
}

export function IntroductionScene() {
  const frame = useCurrentFrame();
  const titleProgress = interpolate(frame, [8, 28], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const certificateProgress = interpolate(frame, [28, 58], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const activeField = frame < 150 ? Math.min(4, Math.max(-1, Math.floor((frame - 58) / 18))) : 4;
  const dataProgress = interpolate(frame, [148, 180], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const proofProgress = interpolate(frame, [178, 212], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const finalProgress = interpolate(frame, [210, 238], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <VideoBackground>
      <SoundCue name="introduction-arrival" />
      <div style={{ height: "100%", padding: "88px 150px", position: "relative" }}>
        <div style={{ opacity: titleProgress }}>
          <Eyebrow>02 / Meet MerkliFy</Eyebrow>
          <div style={{ fontSize: 58, fontWeight: 800, letterSpacing: "-0.05em", lineHeight: 1.05, marginTop: 15 }}>
            Meet <span style={{ color: t.accentBright }}>MerkliFy.</span>
          </div>
          <div style={{ color: t.body, fontSize: 24, marginTop: 14 }}>Academic certificates, backed by cryptographic proof.</div>
        </div>

        <div style={{ alignItems: "center", display: "flex", gap: 72, marginTop: 34 }}>
          <div
            style={{
              background: t.surfaceMuted,
              border: `1px solid ${t.borderLight}`,
              borderRadius: t.radiusCard,
              boxShadow: "0 20px 55px rgba(0, 0, 0, 0.28)",
              color: t.darkText,
              opacity: certificateProgress,
              padding: "22px 25px",
              transform: `translateY(${interpolate(certificateProgress, [0, 1], [24, 0])}px)`,
              width: 490,
            }}
          >
            <div style={{ alignItems: "center", borderBottom: `1px solid ${t.borderLight}`, display: "flex", justifyContent: "space-between", paddingBottom: 15 }}>
              <div style={{ color: t.accent, fontSize: 12, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase" }}>University credential</div>
              <div style={{ color: "#64748b", fontFamily: "monospace", fontSize: 11 }}>CERTIFICATE</div>
            </div>
            <div style={{ color: "#334155", fontSize: 25, fontWeight: 800, margin: "18px 0 10px" }}>Bachelor of Science</div>
            <div style={{ display: "grid", gap: 4, gridTemplateColumns: "1fr 1fr" }}>
              {fields.map(([label, value], index) => (
                <CertificateField
                  active={index === activeField}
                  compact
                  key={label}
                  label={label}
                  style={index === 4 ? { gridColumn: "1 / -1" } : {}}
                  value={value}
                />
              ))}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 15, opacity: certificateProgress, width: 310 }}>
            {stages.map((stage, index) => {
              const stageActive = index === 0 ? frame >= 58 && frame < 152 : index === 1 ? dataProgress > 0.15 : index === 2 ? proofProgress > 0.15 : finalProgress > 0.15;
              const complete = index === 0 ? frame > 152 : index === 1 ? frame > 180 : index === 2 ? frame > 214 : false;
              return (
                <div key={stage}>
                  <Stage active={stageActive} complete={complete} index={index} label={stage} />
                  {index < stages.length - 1 && <div style={{ background: complete ? t.accent : t.border, height: 17, marginLeft: 15, width: 1 }} />}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ bottom: 60, left: 150, opacity: finalProgress, position: "absolute", right: 150 }}>
          <div style={{ color: t.body, fontSize: 30, fontWeight: 700 }}>Certificate data <span style={{ color: t.accentBright }}>→</span> cryptographic processing <span style={{ color: t.accentBright }}>→</span> verifiable proof</div>
          <div style={{ color: t.body, fontSize: 25, marginTop: 12 }}>The certificate stays private. MerkliFy verifies its information and cryptographic integrity.</div>
        </div>
      </div>
    </VideoBackground>
  );
}
