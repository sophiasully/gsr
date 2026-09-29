import React from 'react';
import {AbsoluteFill, Sequence, interpolate, useCurrentFrame} from 'remotion';
import {loadFonts} from './fonts';
import {Closing} from './scenes/Closing';
import {End} from './scenes/End';
import {Growth} from './scenes/Growth';
import {Reply} from './scenes/Reply';
import {C} from './theme';
import {SCENES, XFADE} from './timeline';

loadFonts();

/** Cross-dissolve wrapper: fades in over XFADE (unless first) and out over XFADE (unless last). */
const Fade: React.FC<{dur: number; first?: boolean; last?: boolean; children: React.ReactNode}> = ({
  dur,
  first,
  last,
  children,
}) => {
  const frame = useCurrentFrame();
  const inO = first ? 1 : interpolate(frame, [0, XFADE], [0, 1], {extrapolateRight: 'clamp'});
  const outO = last ? 1 : interpolate(frame, [dur - XFADE, dur], [1, 0], {extrapolateLeft: 'clamp'});
  return <AbsoluteFill style={{opacity: Math.min(inO, outO)}}>{children}</AbsoluteFill>;
};

export const Explainer: React.FC = () => (
  <AbsoluteFill style={{background: C.ink}}>
    <Sequence from={SCENES.closing.from} durationInFrames={SCENES.closing.dur}>
      <Fade dur={SCENES.closing.dur} first>
        <Closing dur={SCENES.closing.dur} />
      </Fade>
    </Sequence>
    <Sequence from={SCENES.reply.from} durationInFrames={SCENES.reply.dur}>
      <Fade dur={SCENES.reply.dur}>
        <Reply dur={SCENES.reply.dur} />
      </Fade>
    </Sequence>
    <Sequence from={SCENES.growth.from} durationInFrames={SCENES.growth.dur}>
      <Fade dur={SCENES.growth.dur}>
        <Growth dur={SCENES.growth.dur} />
      </Fade>
    </Sequence>
    <Sequence from={SCENES.end.from} durationInFrames={SCENES.end.dur}>
      <Fade dur={SCENES.end.dur} last>
        <End />
      </Fade>
    </Sequence>
  </AbsoluteFill>
);
