// Minimal composition showing how the kit pieces fit a beat grid. Adapt it; do not ship it as is.
// Put a transparent PNG at public/obj/hero.png (see references/prompts.md, "glossy 3D object").
import React from "react";
import { AbsoluteFill, Composition, Sequence } from "remotion";
import { Flash, HeroObject, PunchIn, SafeArea, Slam, Stage, CountUp, useBeatPulse } from "./director-kit";

const BPM = 120; // 15 frames per beat at 30fps
const FONT = "Pretendard, sans-serif";
// from: python scripts/beat_grid.py --fps 30 --bpm 120 --seconds 8 --cuts 4,4,8
const SCENES = [
  { from: 0, durationInFrames: 60 },
  { from: 60, durationInFrames: 60 },
  { from: 120, durationInFrames: 120 },
];

const Demo: React.FC<{ vertical?: boolean }> = ({ vertical = false }) => {
  const pulse = useBeatPulse(BPM);
  const W = vertical ? 696 : 1500;
  return (
    <AbsoluteFill style={{ background: "#04030C" }}>
      <Sequence from={SCENES[0].from} durationInFrames={SCENES[0].durationInFrames}>
        <PunchIn>
          <Stage color="#FF5AA5" cy={vertical ? 30 : 40} />
          <HeroObject src="obj/hero.png" x={vertical ? 540 : 960} y={vertical ? 560 : 400} size={vertical ? 460 : 480} glow="#FF5AA5" />
          <SafeArea vertical={vertical}>
            <div style={{ marginTop: vertical ? 620 : 600 }}>
              <Slam text="아직도 손으로?" at={6} size={vertical ? 110 : 130} maxWidth={W} fontFamily={FONT} />
            </div>
          </SafeArea>
        </PunchIn>
        <Flash at={0} peak={0.15} />
      </Sequence>
      <Sequence from={SCENES[1].from} durationInFrames={SCENES[1].durationInFrames}>
        <PunchIn>
          <Stage color="#FFD23F" />
          <SafeArea vertical={vertical}>
            <CountUp to={28} frames={30} style={{ fontFamily: FONT, fontSize: 260, fontWeight: 900, color: "#fff", textShadow: "0 0 " + (30 + pulse * 40) + "px #FFD23F" }} />
          </SafeArea>
        </PunchIn>
        <Flash at={0} peak={0.12} />
      </Sequence>
      <Sequence from={SCENES[2].from} durationInFrames={SCENES[2].durationInFrames}>
        <PunchIn>
          <Stage color="#46B4FF" rays={false} />
          <SafeArea vertical={vertical}>
            <Slam text="example.com" size={vertical ? 110 : 120} color="#C8F23A" maxWidth={W} fontFamily={FONT} />
          </SafeArea>
        </PunchIn>
        <Flash at={0} peak={0.12} />
      </Sequence>
    </AbsoluteFill>
  );
};

export const DirectorKitDemo: React.FC = () => (
  <>
    <Composition id="DirectorKitDemo" component={Demo} durationInFrames={240} fps={30} width={1920} height={1080} />
    <Composition id="DirectorKitDemoReels" component={Demo} defaultProps={{ vertical: true }} durationInFrames={240} fps={30} width={1080} height={1920} />
  </>
);
