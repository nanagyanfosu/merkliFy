import { AbsoluteFill, Audio, Composition, staticFile } from "remotion";
import MerklifyWalkthrough from "./MerklifyWalkthrough";
import { totalDuration } from "./videoTokens";

export default function RemotionRoot() {
  return (
    <Composition
      id="MerklifyWalkthrough"
      component={() => (
        <AbsoluteFill>
          <Audio src={staticFile("audio/merklify-ambient.wav")} volume={0.42} />
          <MerklifyWalkthrough />
        </AbsoluteFill>
      )}
      durationInFrames={totalDuration}
      fps={30}
      height={1080}
      width={1920}
    />
  );
}
