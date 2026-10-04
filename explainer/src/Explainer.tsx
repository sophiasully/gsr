import React from 'react';
import {AbsoluteFill, Sequence} from 'remotion';
import {Fade} from './fade';
import {loadFonts} from './fonts';
import {Closing} from './scenes/Closing';
import {End} from './scenes/End';
import {Growth} from './scenes/Growth';
import {Reply} from './scenes/Reply';
import {C} from './theme';
import {SCENES, XFADE} from './timeline';

loadFonts();

export const Explainer: React.FC = () => (
  <AbsoluteFill style={{background: C.ink}}>
    <Sequence from={SCENES.closing.from} durationInFrames={SCENES.closing.dur}>
      <Fade xfade={XFADE} dur={SCENES.closing.dur} first>
        <Closing dur={SCENES.closing.dur} />
      </Fade>
    </Sequence>
    <Sequence from={SCENES.reply.from} durationInFrames={SCENES.reply.dur}>
      <Fade xfade={XFADE} dur={SCENES.reply.dur}>
        <Reply dur={SCENES.reply.dur} />
      </Fade>
    </Sequence>
    <Sequence from={SCENES.growth.from} durationInFrames={SCENES.growth.dur}>
      <Fade xfade={XFADE} dur={SCENES.growth.dur}>
        <Growth dur={SCENES.growth.dur} />
      </Fade>
    </Sequence>
    <Sequence from={SCENES.end.from} durationInFrames={SCENES.end.dur}>
      <Fade xfade={XFADE} dur={SCENES.end.dur} last>
        <End />
      </Fade>
    </Sequence>
  </AbsoluteFill>
);
