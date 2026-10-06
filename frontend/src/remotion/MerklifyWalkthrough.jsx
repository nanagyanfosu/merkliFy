import { AbsoluteFill, Series, useVideoConfig } from "remotion";
import { SceneTransition } from "./components/Motion";
import { DigitalSignatureScene } from "./scenes/DigitalSignatureScene";
import { FinalScene } from "./scenes/FinalScene";
import { HashingScene } from "./scenes/HashingScene";
import { IntroductionScene } from "./scenes/IntroductionScene";
import { MerkleTreeScene } from "./scenes/MerkleTreeScene";
import { ProblemScene } from "./scenes/ProblemScene";
import { VerificationScene } from "./scenes/VerificationScene";
import { sceneDurations } from "./videoTokens";

export default function MerklifyWalkthrough() {
  const { fps } = useVideoConfig();
  const transition = (children) => <SceneTransition>{children}</SceneTransition>;
  return (
    <AbsoluteFill>
      <Series layout="absolute-fill">
      <Series.Sequence name="Problem" durationInFrames={sceneDurations.problem} premountFor={fps}>{transition(<ProblemScene />)}</Series.Sequence>
      <Series.Sequence name="Introduction" durationInFrames={sceneDurations.introduction} premountFor={fps}>{transition(<IntroductionScene />)}</Series.Sequence>
      <Series.Sequence name="Hashing" durationInFrames={sceneDurations.hashing} premountFor={fps}>{transition(<HashingScene />)}</Series.Sequence>
      <Series.Sequence name="Merkle Tree" durationInFrames={sceneDurations.merkleTree} premountFor={fps}>{transition(<MerkleTreeScene />)}</Series.Sequence>
      <Series.Sequence name="Digital Signature" durationInFrames={sceneDurations.digitalSignature} premountFor={fps}>{transition(<DigitalSignatureScene />)}</Series.Sequence>
      <Series.Sequence name="Verification" durationInFrames={sceneDurations.verification} premountFor={fps}>{transition(<VerificationScene />)}</Series.Sequence>
      <Series.Sequence name="Final" durationInFrames={sceneDurations.final} premountFor={fps}>{transition(<FinalScene />)}</Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
}
