import React from 'react';
import {interpolate, spring, useVideoConfig} from 'remotion';
import {C} from '../theme';
import type {Biz} from './kit';

/*
 * Animated vector vignettes, one per business. Each takes a local `frame`
 * (0 = the moment its card arrives): intro beats play once, ambient motion loops.
 * Drawn on a 200x200 viewBox so they scale to any card size.
 */

const P = {
  coffee: '#6b4a32',
  latte: '#d9b48f',
  gold: '#e5b85c',
  coral: '#e98f7f',
  coralDeep: '#d9715f',
  clay: '#c97b5a',
  steel: '#2d3a34',
  white: '#ffffff',
};

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const lin = (f: number, a: number, b: number) => interpolate(f, [a, b], [0, 1], clamp);

const useSpring = (frame: number, delay: number, damping = 12) => {
  const {fps} = useVideoConfig();
  return spring({frame: frame - delay, fps, config: {damping, mass: 0.6}});
};

/** Gear outline with `teeth` teeth, centered on 0,0. */
const gearPath = (r: number, teeth: number, depth: number) => {
  const pts: string[] = [];
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const corners = [
      [a - step * 0.28, r],
      [a - step * 0.18, r + depth],
      [a + step * 0.18, r + depth],
      [a + step * 0.28, r],
    ];
    for (const [ang, rad] of corners) pts.push(`${(Math.cos(ang) * rad).toFixed(2)},${(Math.sin(ang) * rad).toFixed(2)}`);
  }
  return `M${pts.join('L')}Z`;
};

const Cafe: React.FC<{frame: number}> = ({frame}) => {
  const sun = useSpring(frame, 0, 200);
  const cup = useSpring(frame, 6);
  const heart = useSpring(frame, 22);
  return (
    <>
      {/* sun rising: "you open at 6" */}
      <g transform={`translate(152 ${interpolate(sun, [0, 1], [150, 46])})`}>
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <rect key={i} x={-2} y={-36} width={4} height={9} rx={2} fill={P.gold} transform={`rotate(${i * 45 + frame * 0.6})`} />
        ))}
        <circle r={22} fill={P.gold} />
      </g>
      <rect x={0} y={150} width={200} height={50} fill="#d8c3a3" />
      <g transform={`translate(0 ${(1 - cup) * 60})`} opacity={Math.min(1, cup * 2)}>
        <ellipse cx={100} cy={152} rx={60} ry={10} fill={C.cream} />
        <circle cx={141} cy={118} r={12} fill="none" stroke={C.cream} strokeWidth={7} />
        <path d="M60 96 H140 L130 146 Q100 154 70 146 Z" fill={C.cream} />
        <rect x={64} y={116} width={72} height={9} fill={C.green} />
        <ellipse cx={100} cy={96} rx={40} ry={8} fill={P.coffee} />
        <path
          d="M100 100 C90 92 92 86 97 87 C99 87.5 100 89 100 90 C100 89 101 87.5 103 87 C108 86 110 92 100 100 Z"
          fill={P.latte}
          transform={`translate(100 93) scale(${heart}) translate(-100 -93)`}
        />
      </g>
      {[0, 1, 2].map((i) => {
        const t = ((frame + i * 15) % 45) / 45;
        return (
          <path
            key={i}
            d={`M${86 + i * 14} 84 q -6 -9 0 -18 q 6 -9 0 -18`}
            fill="none"
            stroke={C.cream}
            strokeWidth={4}
            strokeLinecap="round"
            opacity={lin(frame, 26, 34) * Math.sin(t * Math.PI) * 0.9}
            transform={`translate(0 ${-t * 14})`}
          />
        );
      })}
    </>
  );
};

const Auto: React.FC<{frame: number}> = ({frame}) => {
  const inT = useSpring(frame, 0);
  const spin = frame * 1.6;
  const wrench = Math.sin(frame / 9) * 18 - 20;
  return (
    <g transform={`translate(100 100) scale(${0.6 + 0.4 * inT}) translate(-100 -100)`} opacity={Math.min(1, inT * 2)}>
      <rect x={0} y={162} width={200} height={38} fill="#bfcac3" />
      <g transform={`translate(88 104) rotate(${spin})`}>
        <path d={gearPath(44, 12, 9)} fill={C.green} />
        <circle r={16} fill="#d5ddd8" />
        <circle r={6} fill={C.green} />
      </g>
      <g transform={`translate(148 52) rotate(${-spin * (44 / 26) + 8})`}>
        <path d={gearPath(26, 8, 7)} fill={P.steel} />
        <circle r={9} fill="#d5ddd8" />
      </g>
      {/* ring wrench turning the big gear's center bolt */}
      <g transform={`translate(88 104) rotate(${wrench})`}>
        <rect x={-5} y={-74} width={10} height={58} rx={5} fill={C.cream} />
        <circle r={15} fill="none" stroke={C.cream} strokeWidth={8} />
      </g>
    </g>
  );
};

const Sparkle: React.FC<{x: number; y: number; s: number; color: string}> = ({x, y, s, color}) => (
  <path
    d="M0 -10 C1.5 -2 2 -1.5 10 0 C2 1.5 1.5 2 0 10 C-1.5 2 -2 1.5 -10 0 C-2 -1.5 -1.5 -2 0 -10 Z"
    fill={color}
    transform={`translate(${x} ${y}) scale(${s})`}
  />
);

const Dental: React.FC<{frame: number}> = ({frame}) => {
  const inT = useSpring(frame, 0, 9);
  const blink = frame % 70 > 64 ? 0.15 : 1;
  const smile = lin(frame, 10, 22);
  const sparkles = [
    {x: 46, y: 52, d: 16, c: C.green},
    {x: 158, y: 66, d: 22, c: P.gold},
    {x: 150, y: 150, d: 28, c: C.green2},
    {x: 44, y: 140, d: 34, c: P.gold},
  ];
  return (
    <>
      <g transform={`translate(100 108) scale(${inT}) translate(-100 -108)`}>
        <ellipse cx={100} cy={172} rx={44} ry={7} fill="rgba(10,10,10,0.08)" />
        <path
          d="M100 52 C82 40 52 46 52 78 C52 100 62 112 66 132 C70 152 76 166 84 166 C92 166 92 140 100 140 C108 140 108 166 116 166 C124 166 130 152 134 132 C138 112 148 100 148 78 C148 46 118 40 100 52 Z"
          fill={P.white}
        />
        <ellipse cx={86} cy={88} rx={4.5} ry={6 * blink} fill={C.ink} />
        <ellipse cx={114} cy={88} rx={4.5} ry={6 * blink} fill={C.ink} />
        <path
          d="M86 104 Q100 118 114 104"
          fill="none"
          stroke={C.ink}
          strokeWidth={4}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - smile}
        />
        <circle cx={78} cy={102} r={5} fill={P.coral} opacity={0.5} />
        <circle cx={122} cy={102} r={5} fill={P.coral} opacity={0.5} />
      </g>
      {sparkles.map((s, i) => {
        const loop = ((frame - s.d) % 50) / 50;
        const pop = frame < s.d ? 0 : Math.sin(Math.min(1, loop * 1.4) * Math.PI);
        return <Sparkle key={i} x={s.x} y={s.y} s={pop * 1.1} color={s.c} />;
      })}
    </>
  );
};

const Florist: React.FC<{frame: number}> = ({frame}) => {
  const pot = useSpring(frame, 0);
  const stem = lin(frame, 6, 26);
  const leafL = useSpring(frame, 18);
  const leafR = useSpring(frame, 24);
  const bloom = useSpring(frame, 28, 10);
  const sway = Math.sin(frame / 22) * 3 * lin(frame, 30, 50);
  const fall = ((frame - 50) % 80) / 80;
  return (
    <>
      <rect x={0} y={170} width={200} height={30} fill="#e0c7c2" />
      <g transform={`rotate(${sway} 100 150)`}>
        <path
          d="M100 150 C100 125 94 105 100 72"
          fill="none"
          stroke={C.green}
          strokeWidth={5}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - stem}
        />
        <ellipse cx={86} cy={120} rx={14} ry={6} fill={C.green2} transform={`rotate(-30 98 124) translate(98 124) scale(${leafL}) translate(-98 -124)`} />
        <ellipse cx={114} cy={106} rx={14} ry={6} fill={C.green} transform={`rotate(28 100 110) translate(100 110) scale(${leafR}) translate(-100 -110)`} />
        <g transform={`translate(100 68) scale(${bloom}) rotate(${(1 - bloom) * -60})`}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <ellipse key={i} cx={0} cy={-17} rx={10} ry={17} fill={i % 2 ? P.coral : P.coralDeep} transform={`rotate(${i * 60})`} />
          ))}
          <circle r={9} fill={P.gold} />
        </g>
      </g>
      <g transform={`translate(0 ${(1 - pot) * 50})`} opacity={Math.min(1, pot * 2)}>
        <path d="M74 146 H126 L120 180 H80 Z" fill={P.clay} />
        <rect x={70} y={142} width={60} height={10} rx={3} fill={P.clay} />
      </g>
      {frame > 50 ? (
        <ellipse
          cx={130 + Math.sin(fall * 6) * 10}
          cy={70 + fall * 100}
          rx={5}
          ry={8}
          fill={P.coral}
          opacity={Math.sin(fall * Math.PI) * 0.9}
          transform={`rotate(${fall * 200} ${130 + Math.sin(fall * 6) * 10} ${70 + fall * 100})`}
        />
      ) : null}
    </>
  );
};

const SCENES: Record<Biz['key'], React.FC<{frame: number}>> = {cafe: Cafe, auto: Auto, dental: Dental, florist: Florist};

export const BizArt: React.FC<{kind: Biz['key']; frame: number}> = ({kind, frame}) => {
  const Scene = SCENES[kind];
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%" style={{position: 'absolute', inset: 0}}>
      <Scene frame={Math.max(0, frame)} />
    </svg>
  );
};
