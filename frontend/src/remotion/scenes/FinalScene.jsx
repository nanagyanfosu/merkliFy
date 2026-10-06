import { interpolate, useCurrentFrame } from "remotion";
import { staticFile } from "remotion";
import { Eyebrow, VideoBackground } from "../components/VideoBackground";
import { SoundCue } from "../components/Motion";
import { videoTokens as t } from "../videoTokens";

export function FinalScene() {
  const frame = useCurrentFrame();
  const reveal = interpolate(frame, [12, 42], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <VideoBackground>
      <SoundCue name="final-verified" />
      <div style={{ alignItems: "center", display: "flex", height: "100%", justifyContent: "center", textAlign: "center" }}>
        <div style={{ opacity: reveal }}>
          <Eyebrow>MerkliFy</Eyebrow>
          <div style={{ fontSize: 84, fontWeight: 800, letterSpacing: "-0.06em", lineHeight: 1.05, marginTop: 24 }}>Proof, <span style={{ color: t.accentBright }}>not promises.</span></div>
          <div style={{ color: t.body, fontSize: 28, marginTop: 30 }}>Verify academic credentials with cryptographic proof.</div>
          <div style={{ alignItems: "center", display: "flex", gap: 13, justifyContent: "center", marginTop: 42 }}>
            <img alt="" src={staticFile("merklify.svg")} style={{ height: 40, width: 40 }} />
            <div style={{ color: t.heading, fontSize: 25, fontWeight: 800 }}>MerkliFy</div>
          </div>
        </div>
      </div>
    </VideoBackground>
  );
}
