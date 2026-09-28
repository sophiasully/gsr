import {Easing, interpolate} from 'remotion';

export const C = {
  ink: '#0a0a0a',
  cream: '#f4faf6',
  green: '#22a06b',
  green2: '#4fc08d',
  muted: 'rgba(244,250,246,0.62)',
  line: 'rgba(244,250,246,0.18)',
  inkSoft: '#161a18',
  mint: '#e3f2ea',
};

export const SANS = "'General Sans', 'Instrument Sans', system-ui, sans-serif";
export const MONO = "'Space Mono', ui-monospace, monospace";

export const ease = Easing.bezier(0.2, 0.7, 0.2, 1);
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/** 0 -> 1 over [start, start + dur] with the house ease-out. */
export const prog = (frame: number, start: number, dur = 18, easing = ease) =>
  interpolate(frame, [start, start + dur], [0, 1], {...clamp, easing});

/** Fade + rise in at `start`, optionally fade out at `out`. */
export const fadeUp = (
  frame: number,
  start: number,
  opts: {dist?: number; dur?: number; out?: number; outDur?: number} = {},
): React.CSSProperties => {
  const {dist = 28, dur = 20, out, outDur = 12} = opts;
  const t = prog(frame, start, dur);
  const o = out === undefined ? 1 : 1 - prog(frame, out, outDur);
  return {
    opacity: t * o,
    transform: `translateY(${(1 - t) * dist - (1 - o) * 12}px)`,
  };
};
