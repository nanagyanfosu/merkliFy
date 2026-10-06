import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { videoLayout, videoTokens as t } from "../videoTokens";

export function FadeUp({ children, delay = 0, style = {} }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 18, stiffness: 120, mass: 0.7 },
  });

  return (
    <div
      style={{
        opacity: interpolate(progress, [0, 1], [0, 1]),
        translate: `0px ${interpolate(progress, [0, 1], [28, 0])}px`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function SceneTransition({ children }) {
  const frame = useCurrentFrame();
  return (
    <div style={{ opacity: interpolate(frame, [0, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
      {children}
    </div>
  );
}

export function SoundCue({ name }) {
  return <span aria-hidden="true" data-sound-cue={name} style={{ display: "none" }} />;
}

export function SceneCaption({ children, secondary, opacity = 1 }) {
  return (
    <div style={{ bottom: videoLayout.safeBottom, left: videoLayout.safeLeft, opacity, position: "absolute", right: videoLayout.safeRight, textAlign: "center" }}>
      <div style={{ color: t.body, fontSize: 46, fontWeight: 750, letterSpacing: "-0.025em", lineHeight: 1.15 }}>{children}</div>
      {secondary && <div style={{ color: t.muted, fontSize: 29, lineHeight: 1.25, margin: "14px auto 0", maxWidth: 1500 }}>{secondary}</div>}
    </div>
  );
}
