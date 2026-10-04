import React from 'react';
import {spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, MONO, SANS, prog} from '../theme';
import {useLayout} from '../ui';
import {BizArt} from './anim';

/** Light theme for this video: cream ground, ink type, deep green accents. */
export const L = {
  bg: C.cream,
  ink: C.ink,
  accent: C.green,
  muted: 'rgba(10,10,10,0.55)',
  card: '#ffffff',
  line: 'rgba(10,10,10,0.1)',
};

export type Biz = {
  key: 'cafe' | 'auto' | 'dental' | 'florist';
  tag: string;
  line: string;
  tint: string;
};

export const CAST: Biz[] = [
  {key: 'cafe', tag: 'The cafe on 5th', line: 'You open at 6.', tint: '#e9dcc8'},
  {key: 'auto', tag: 'The auto shop', line: 'You fix it right.', tint: '#d5ddd8'},
  {key: 'dental', tag: 'The dentist down the street', line: 'You remember every name.', tint: '#dbe9e1'},
  {key: 'florist', tag: 'The flower shop', line: "You make people's day.", tint: '#ecdcd9'},
];

/** Per-layout value. */
export const useV = () => {
  const layout = useLayout();
  return <T,>(vertical: T, wide: T) => (layout === 'vertical' ? vertical : wide);
};

/** Text column and visual box positions for each cut. */
export const useBoxes = () => {
  const v = useV();
  return {
    text: v({left: 90, top: 200, width: 900}, {left: 130, top: 300, width: 820}),
    visual: v({left: 90, top: 700, size: 900}, {left: 1020, top: 110, size: 860}),
  };
};

type Word = {w: string; color?: string};

/**
 * Kinetic type: each word springs up into place with a stagger, and the whole
 * set can leave (words lift and fade, staggered) at `out`.
 */
export const Words: React.FC<{
  lines: (string | Word[])[];
  at: number;
  stagger?: number;
  size: number;
  out?: number;
  color?: string;
  align?: 'left' | 'center';
  lineGap?: number;
}> = ({lines, at, stagger = 4, size, out, color = L.ink, align = 'left', lineGap = 1.02}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  let i = 0;
  return (
    <div style={{textAlign: align}}>
      {lines.map((line, li) => {
        const words: Word[] = typeof line === 'string' ? line.split(' ').map((w) => ({w})) : line;
        return (
          <div key={li} style={{lineHeight: lineGap}}>
            {words.map((word, wi) => {
              const n = i++;
              const t = spring({frame: frame - at - n * stagger, fps, config: {damping: 13, mass: 0.6}});
              const o = out === undefined ? 0 : prog(frame, out + n * 1.5, 10);
              return (
                <span
                  key={wi}
                  style={{
                    display: 'inline-block',
                    marginRight: '0.24em',
                    fontFamily: SANS,
                    fontWeight: 600,
                    fontSize: size,
                    letterSpacing: '-0.03em',
                    color: word.color ?? color,
                    opacity: Math.min(1, t * 1.5) * (1 - o),
                    transform: `translateY(${(1 - t) * size * 0.7 - o * size * 0.5}px)`,
                  }}
                >
                  {word.w}
                </span>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

export const Tag: React.FC<{children: React.ReactNode; style?: React.CSSProperties; dark?: boolean}> = ({
  children,
  style,
  dark,
}) => (
  <div
    style={{
      display: 'inline-block',
      fontFamily: MONO,
      fontWeight: 700,
      fontSize: 22,
      letterSpacing: '0.18em',
      textTransform: 'uppercase',
      color: dark ? C.cream : L.ink,
      background: dark ? C.ink : 'rgba(244,250,246,0.94)',
      padding: '10px 16px',
      borderRadius: 10,
      ...style,
    }}
  >
    {children}
  </div>
);

/** A business card: its animated vignette in a rounded tile, with an optional name tag. */
export const Portrait: React.FC<{biz: Biz; size: number; frame: number; tag?: boolean; style?: React.CSSProperties; children?: React.ReactNode}> = ({
  biz,
  size,
  frame,
  tag = true,
  style,
  children,
}) => (
  <div
    style={{
      position: 'relative',
      width: size,
      height: size,
      borderRadius: size * 0.05,
      overflow: 'hidden',
      background: biz.tint,
      boxShadow: '0 30px 70px rgba(10,10,10,0.18)',
      ...style,
    }}
  >
    <BizArt kind={biz.key} frame={frame} />
    {tag ? <Tag style={{position: 'absolute', left: size * 0.04, bottom: size * 0.04, fontSize: Math.max(14, size * 0.024)}}>{biz.tag}</Tag> : null}
    {children}
  </div>
);
