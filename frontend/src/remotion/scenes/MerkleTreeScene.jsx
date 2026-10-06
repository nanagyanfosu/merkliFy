import { interpolate, useCurrentFrame } from "remotion";
import { MerkleTree } from "../components/MerkleTree";
import { Eyebrow, VideoBackground } from "../components/VideoBackground";
import { SoundCue } from "../components/Motion";
import { videoTokens as t } from "../videoTokens";

function ProofPanel({ visible, valid }) {
  return (
    <div style={{ background: t.panel, border: `1px solid ${visible ? t.accentBright : t.border}`, borderRadius: t.radiusCard, boxShadow: visible ? `0 0 28px ${t.accentBright}22` : "none", opacity: visible ? 1 : 0, padding: "20px 22px", width: 270 }}>
      <div style={{ color: t.accentBright, fontSize: 14, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase" }}>Merkle Proof</div>
      <div style={{ color: t.muted, fontSize: 14, marginTop: 7 }}>For Certificate 03</div>
      <div style={{ borderTop: `1px solid ${t.border}`, marginTop: 15, paddingTop: 12 }}>
        {["H4", "H12", "H5678"].map((hash, index) => (
          <div key={hash} style={{ alignItems: "center", color: t.body, display: "flex", fontFamily: "monospace", fontSize: 18, gap: 10, marginTop: index ? 10 : 0 }}>
            <span style={{ color: t.accentBright }}>+</span>{hash}
          </div>
        ))}
      </div>
      <div style={{ color: t.muted, fontSize: 14, lineHeight: 1.45, marginTop: 17 }}>Only the required proof path is needed.</div>
      {valid && <div style={{ background: "#134e4a", borderRadius: t.radiusControl, color: "#d1fae5", fontSize: 14, fontWeight: 700, marginTop: 17, padding: "9px 10px" }}>✓ Merkle proof valid</div>}
    </div>
  );
}

export function MerkleTreeScene() {
  const frame = useCurrentFrame();
  const selected = frame >= 195;
  const valid = frame >= 268;
  const titleOpacity = interpolate(frame, [0, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <VideoBackground>
      <SoundCue name="merkle-root-created" />
      <div style={{ height: "100%", padding: "52px 115px", position: "relative" }}>
        <div style={{ opacity: titleOpacity }}>
          <Eyebrow>04 / Build the proof</Eyebrow>
          <div style={{ fontSize: 43, fontWeight: 800, letterSpacing: "-0.05em", marginTop: 10 }}>
            Multiple hashes. One <span style={{ color: t.accentBright }}>Merkle Root.</span>
          </div>
        </div>
        <div style={{ alignItems: "center", display: "flex", gap: 25, marginTop: 6 }}>
          <div>
            <div style={{ color: selected ? t.body : t.muted, fontSize: 16, height: 28 }}>
              {!selected ? "Hashes are combined and hashed again." : "What if we only need to verify Certificate 03?"}
            </div>
            <MerkleTree frame={frame} />
          </div>
          <ProofPanel valid={valid} visible={selected} />
        </div>
        <div style={{ bottom: 35, left: 115, position: "absolute" }}>
          <div style={{ color: selected ? t.body : t.muted, fontSize: 17 }}>
            {valid ? "Calculated Root  =  Stored Merkle Root" : selected ? "Follow H3's proof path to the root." : "Now imagine thousands of certificates."}
          </div>
          {valid && <div style={{ color: t.accentBright, fontSize: 20, fontWeight: 700, marginTop: 8 }}>The certificate belongs to the verified batch.</div>}
          {valid && frame >= 282 && <div style={{ color: t.heading, fontSize: 19, fontWeight: 700, marginTop: 10 }}>But who signed that root?</div>}
        </div>
      </div>
    </VideoBackground>
  );
}
