import { interpolate, useCurrentFrame } from "remotion";
import { Eyebrow, VideoBackground } from "../components/VideoBackground";
import { SceneCaption, SoundCue } from "../components/Motion";
import { videoLayout, videoTokens as t } from "../videoTokens";

function ObjectLabel({ x, y, title, value, opacity = 1, accent = false }) {
  return (
    <div style={{ left: x, opacity, position: "absolute", textAlign: "center", top: y, transform: "translate(-50%, -50%)", width: 290 }}>
      <div style={{ background: accent ? "#134e4a" : t.panel, border: `2px solid ${accent ? t.accentBright : t.border}`, borderRadius: t.radiusCard, boxShadow: accent ? `0 0 36px ${t.accentBright}33` : "none", padding: "22px 25px" }}>
        <div style={{ color: accent ? t.accentBright : t.muted, fontSize: 16, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>{title}</div>
        <div style={{ color: t.body, fontFamily: "monospace", fontSize: 20, marginTop: 12 }}>{value}</div>
      </div>
    </div>
  );
}

function Connector({ x1, x2, y, opacity = 1 }) {
  return <div style={{ background: t.accentBright, height: 2, left: x1, opacity: opacity * 0.75, position: "absolute", top: y, width: Math.max(0, x2 - x1) }} />;
}

export function DigitalSignatureScene() {
  const frame = useCurrentFrame();
  const signing = frame >= 82 && frame < 145;
  const signed = frame >= 140;
  const valid = frame >= 220;
  const rootX = interpolate(frame, [0, 60, 105], [330, 650, 930], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const signedX = interpolate(frame, [140, 220], [1030, 1530], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const issuerOpacity = interpolate(frame, [48, 68, 150, 180], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const verifierOpacity = interpolate(frame, [155, 180], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const caption = frame < 76 ? "A Merkle Root represents the verified batch." : frame < 155 ? "The university signs the root with its private key." : "The signed root can be checked with the university's trusted public key.";

  return (
    <VideoBackground>
      <SoundCue name="digital-signature" />
      <div style={{ height: "100%", padding: `${videoLayout.safeTop}px ${videoLayout.safeLeft}px`, position: "relative" }}>
        <Eyebrow>05 / Prove the issuer</Eyebrow>
        <div style={{ fontSize: 58, fontWeight: 800, letterSpacing: "-0.05em", marginTop: 18 }}>From batch integrity to <span style={{ color: t.accentBright }}>issuer trust.</span></div>
        <div style={{ borderTop: `1px solid ${t.border}`, left: videoLayout.safeLeft, position: "absolute", right: videoLayout.safeRight, top: 290 }} />
        <div style={{ color: t.muted, fontSize: 16, left: 190, letterSpacing: "0.13em", position: "absolute", textTransform: "uppercase", top: 315 }}>Merkle Root</div>
        <div style={{ color: t.muted, fontSize: 16, left: 825, letterSpacing: "0.13em", opacity: issuerOpacity, position: "absolute", textTransform: "uppercase", top: 315 }}>University signing environment</div>
        <div style={{ color: t.muted, fontSize: 16, left: 1450, letterSpacing: "0.13em", opacity: verifierOpacity, position: "absolute", textTransform: "uppercase", top: 315 }}>Verification</div>

        <Connector opacity={frame > 8 ? 1 : 0} x1={330} x2={930} y={505} />
        <Connector opacity={signed ? 1 : 0} x1={1030} x2={1530} y={505} />
        <ObjectLabel accent={!signed} title="Merkle Root" value="8f72...c91a" opacity={signed ? interpolate(frame, [125, 150], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1} x={rootX} y={505} />
        <ObjectLabel title="University of Ghana" value="trusted issuer" opacity={issuerOpacity} x={930} y={405} />
        <ObjectLabel title="Private Key" value="held by university" opacity={issuerOpacity} accent={signing} x={930} y={605} />
        <ObjectLabel accent signed={signed} title="Signed Merkle Root" value="ROOT + RSA SIG" opacity={signed ? 1 : 0} x={signed ? signedX : 1030} y={505} />
        <ObjectLabel title="Public Key" value="used to validate" opacity={verifierOpacity} accent={valid} x={1530} y={405} />
        <div style={{ color: t.accentBright, fontFamily: "monospace", fontSize: 22, left: 930, opacity: interpolate(frame, [92, 112, 138, 150], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), position: "absolute", textAlign: "center", top: 720, transform: "translateX(-50%)" }}>signing root...</div>
        <div style={{ color: t.accentBright, fontSize: 28, fontWeight: 800, opacity: valid ? 1 : 0, position: "absolute", right: 230, top: 605 }}>✓ SIGNATURE VALID</div>
        <SceneCaption secondary="The private key stays with the university. Verification uses the trusted public key." opacity={1}>{caption}</SceneCaption>
      </div>
    </VideoBackground>
  );
}
