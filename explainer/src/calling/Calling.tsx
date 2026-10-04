import React from 'react';
import {AbsoluteFill, Sequence} from 'remotion';
import {Fade} from '../fade';
import {loadFonts} from '../fonts';
import {L} from './kit';
import {EndLight, Hook, Payoff, PhoneScene, Pile, RollCall} from './scenes';

loadFonts();

const XF = 10;
// [component, start, length] in frames; each scene overlaps the next by XF.
const SCENES: [React.FC, number, number][] = [
  [Hook, 0, 120],
  [RollCall, 120, 270],
  [Pile, 390, 150],
  [PhoneScene, 540, 300],
  [Payoff, 840, 150],
  [EndLight, 990, 150],
];
export const CALLING_DURATION = 1140;

export const Calling: React.FC = () => (
  <AbsoluteFill style={{background: L.bg}}>
    {SCENES.map(([Scene, from, len], i) => {
      const last = i === SCENES.length - 1;
      const dur = last ? len : len + XF;
      return (
        <Sequence key={i} from={from} durationInFrames={dur}>
          <Fade dur={dur} xfade={XF} first={i === 0} last={last}>
            <Scene />
          </Fade>
        </Sequence>
      );
    })}
  </AbsoluteFill>
);
