import { interpolate, useCurrentFrame } from "remotion";
import { Certificate } from "../components/Certificate";
import { Eyebrow, VideoBackground } from "../components/VideoBackground";
import { SoundCue } from "../components/Motion";
import { videoTokens as t } from "../videoTokens";

export function ProblemScene() {
  const frame = useCurrentFrame();
  const question = interpolate(frame, [18, 34], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const forged = interpolate(frame, [62, 82], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const phone = interpolate(frame, [96, 116], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const glitch = interpolate(frame, [52, 70, 88, 104], [0, 1, 0.8, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <VideoBackground>
      <SoundCue name="problem-glitch" />
      <div style={{ alignItems: "center", display: "flex", height: "100%", justifyContent: "space-between", padding: "120px 150px" }}>
        <div style={{ opacity: question, width: 620 }}>
          <Eyebrow>01 / The problem</Eyebrow>
          <div style={{ fontSize: 64, fontWeight: 800, letterSpacing: "-0.05em", lineHeight: 1.05, marginTop: 24 }}>
            Is this certificate <span style={{ color: t.accentBright }}>real?</span>
          </div>
          <div style={{ color: t.body, fontSize: 32, fontWeight: 600, marginTop: 34, opacity: forged }}>Academic credentials can be forged.</div>
          <div style={{ color: t.body, fontSize: 29, marginTop: 18, opacity: phone }}>A phone call shouldn't be your proof.</div>
        </div>
        <Certificate glitch={glitch} />
      </div>
    </VideoBackground>
  );
}
