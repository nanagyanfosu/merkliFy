import { interpolate, useCurrentFrame } from "remotion";
import { Eyebrow, VideoBackground } from "../components/VideoBackground";
import { SceneCaption, SoundCue } from "../components/Motion";
import { videoLayout, videoTokens as t } from "../videoTokens";

const checks = ["Certificate found", "Hash matches", "Merkle proof valid", "Signature valid", "University trusted", "Certificate active"];

function Stage({ title, value, x, y, opacity = 1, active = false, width = 330 }) {
  return (
    <div style={{ left: x, opacity, position: "absolute", top: y, transform: "translate(-50%, -50%)", width }}>
      <div style={{ background: active ? "#134e4a" : t.panel, border: `2px solid ${active ? t.accentBright : t.border}`, borderRadius: t.radiusCard, boxShadow: active ? `0 0 32px ${t.accentBright}33` : "none", padding: "22px 26px", textAlign: "center" }}>
        <div style={{ color: active ? t.accentBright : t.muted, fontSize: 16, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>{title}</div>
        <div style={{ color: t.body, fontFamily: "monospace", fontSize: 20, marginTop: 12 }}>{value}</div>
      </div>
    </div>
  );
}

function Certificate({ x, opacity = 1, verified = false }) {
  return (
    <div style={{ background: t.surfaceMuted, border: `1px solid ${t.borderLight}`, borderRadius: t.radiusCard, boxShadow: "0 24px 70px rgba(0,0,0,.3)", color: t.darkText, left: x, opacity, padding: "26px 30px", position: "absolute", top: 490, transform: "translate(-50%, -50%)", width: 390 }}>
      <div style={{ color: t.accent, fontSize: 15, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase" }}>Certificate</div>
      <div style={{ borderBottom: `1px solid ${t.borderLight}`, fontSize: 27, fontWeight: 800, marginTop: 19, paddingBottom: 14 }}>Kwame Mensah</div>
      <div style={{ color: "#64748b", fontSize: 18, lineHeight: 1.65, marginTop: 15 }}>BSc Computer Science · 2026<br />UG2026-004821<br />University of Ghana</div>
      {verified && <div style={{ background: t.accentSoft, border: `2px solid ${t.accent}`, borderRadius: "50%", bottom: 25, color: t.accent, fontSize: 28, height: 58, lineHeight: "54px", position: "absolute", right: 25, textAlign: "center", width: 58 }}>✓</div>}
    </div>
  );
}

function Pipeline({ progress, opacity = 1 }) {
  return (
    <div style={{ left: 1320, opacity, position: "absolute", top: 350, width: 430 }}>
      {checks.map((check, index) => {
        const active = progress >= (index + 1) / checks.length;
        return <div key={check} style={{ alignItems: "center", borderBottom: `1px solid ${active ? "#245c5b" : t.border}`, color: active ? "#d1fae5" : t.muted, display: "flex", fontSize: 23, gap: 16, opacity: active ? 1 : 0.35, padding: "13px 4px" }}><span style={{ alignItems: "center", background: active ? t.accentBright : t.border, borderRadius: "50%", color: t.darkText, display: "flex", fontSize: 16, fontWeight: 800, height: 28, justifyContent: "center", width: 28 }}>✓</span>{check}</div>;
      })}
    </div>
  );
}

export function VerificationScene() {
  const frame = useCurrentFrame();
  const canonical = frame >= 35;
  const hash = frame >= 70;
  const merkle = frame >= 105;
  const proof = frame >= 140;
  const signature = frame >= 170;
  const status = frame >= 205;
  const verified = frame >= 245;
  const collapse = interpolate(frame, [245, 275], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const certificateX = interpolate(frame, [0, 38, 78], [320, 430, 570], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const movingX = interpolate(frame, [0, 32, 75, 115, 155, 190], [1530, 1210, 850, 850, 1050, 1160], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const pipelineProgress = interpolate(frame, [45, 225], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const caption = frame < 80 ? "The same certificate information is checked again." : frame < 155 ? "The fingerprint returns to its Merkle proof path." : frame < 225 ? "The root, signature, trusted key and status must all agree." : "Not a guess. A cryptographic proof.";

  return (
    <VideoBackground>
      <SoundCue name="verification-checks" />
      <div style={{ height: "100%", padding: `${videoLayout.safeTop}px ${videoLayout.safeLeft}px`, position: "relative" }}>
        <Eyebrow>06 / Verify the certificate</Eyebrow>
        <div style={{ fontSize: 58, fontWeight: 800, letterSpacing: "-0.05em", marginTop: 18 }}>Now, verify the <span style={{ color: t.accentBright }}>certificate.</span></div>
        <div style={{ borderTop: `1px solid ${t.border}`, left: videoLayout.safeLeft, position: "absolute", right: videoLayout.safeRight, top: 290 }} />
        <Certificate opacity={1 - collapse} verified={verified} x={certificateX} />
        <Stage active={canonical && !hash} opacity={canonical && !hash ? 1 : 0} title="Canonical data" value="UG2026-004821|Kwame Mensah|..." x={760} y={490} width={420} />
        <Stage active={hash && !merkle} opacity={hash && !merkle ? 1 : 0} title="SHA-256 hash" value="8f4c9a2e7b1d6f03..." x={760} y={490} />
        <Stage active={merkle && !proof} opacity={merkle && !proof ? 1 : 0} title="Merkle proof path" value="H3 + H4 → H34 → ROOT" x={900} y={490} width={420} />
        <Stage active={proof && !signature} opacity={proof && !signature ? 1 : 0} title="Calculated root = stored root" value="8f72...c91a  ✓" x={1050} y={490} width={420} />
        <Stage active={signature && !status} opacity={signature && !status ? 1 : 0} title="Signed root + public key" value="SIGNATURE VALID" x={1120} y={490} width={420} />
        <Stage active={status && !verified} opacity={status && !verified ? 1 : 0} title="Certificate status" value="ACTIVE  ✓" x={1180} y={490} />
        <div style={{ color: t.accentBright, fontFamily: "monospace", fontSize: 18, left: movingX, opacity: frame < 225 ? 1 : 0, position: "absolute", top: 650, transform: "translateX(-50%)" }}>SIGNED MERKLE ROOT</div>
        <Pipeline opacity={1 - collapse} progress={pipelineProgress} />
        <div style={{ alignItems: "center", display: "flex", flexDirection: "column", left: "50%", opacity: verified ? 1 : 0, position: "absolute", top: 430, transform: `translateX(-50%) scale(${0.82 + collapse * 0.18})` }}>
          <div style={{ color: t.accentBright, fontSize: 92, fontWeight: 850, letterSpacing: "-0.07em" }}>VERIFIED</div>
          <div style={{ color: t.body, fontSize: 28, marginTop: 15 }}>Cryptographic verification successful</div>
          <div style={{ color: t.muted, fontSize: 25, marginTop: 12 }}>University trusted · Certificate active</div>
        </div>
        <SceneCaption secondary={frame >= 225 ? "MerkliFy checks the data, Merkle proof, university signature and current status." : "Each stage depends on the one before it."}>{caption}</SceneCaption>
      </div>
    </VideoBackground>
  );
}
