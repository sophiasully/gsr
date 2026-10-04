import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';

/** Cross-dissolve wrapper: fades in over `xfade` (unless first) and out over `xfade` (unless last). */
export const Fade: React.FC<{dur: number; xfade: number; first?: boolean; last?: boolean; children: React.ReactNode}> = ({
  dur,
  xfade,
  first,
  last,
  children,
}) => {
  const frame = useCurrentFrame();
  const inO = first ? 1 : interpolate(frame, [0, xfade], [0, 1], {extrapolateRight: 'clamp'});
  const outO = last ? 1 : interpolate(frame, [dur - xfade, dur], [1, 0], {extrapolateLeft: 'clamp'});
  return <AbsoluteFill style={{opacity: Math.min(inO, outO)}}>{children}</AbsoluteFill>;
};
