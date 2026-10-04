import React from 'react';
import {Img, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ART} from './art';
import {C, MONO, SANS, fadeUp, prog} from './theme';

export type Layout = 'vertical' | 'wide';

export const useLayout = (): Layout => {
  const {width, height} = useVideoConfig();
  return width > height ? 'wide' : 'vertical';
};

/*
 * All text and UI is designed once on a 900-unit-wide column. In the vertical
 * cut that column sits over the illustration; in the wide cut it becomes a
 * right-hand panel, scaled down, with the illustration on the left.
 */
const COL = {
  vertical: {left: 90, scale: 1, head: 150, ui: 960},
  wide: {left: 1170, scale: 0.72, head: 120, ui: 420},
};

export const Region: React.FC<{kind: 'head' | 'ui'; children: React.ReactNode}> = ({
  kind,
  children,
}) => {
  const c = COL[useLayout()];
  return (
    <div
      style={{
        position: 'absolute',
        left: c.left,
        top: kind === 'head' ? c.head : c.ui,
        width: 900,
        transform: `scale(${c.scale})`,
        transformOrigin: 'top left',
      }}
    >
      {children}
    </div>
  );
};

/** Full-bleed illustration with a slow push-in, plus the scrims text sits on. */
export const Art: React.FC<{name: keyof typeof ART; zoom?: [number, number]; dur: number}> = ({
  name,
  zoom = [1, 1.06],
  dur,
}) => {
  const frame = useCurrentFrame();
  const layout = useLayout();
  const scale = interpolate(frame, [0, dur], zoom, {extrapolateRight: 'clamp'});
  const art = ART[name];
  const file = art.files[layout];
  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden', background: C.ink}}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          // In the vertical cut the art is lifted so the subject sits between
          // the headline and the UI; the bottom scrim covers the gap.
          transform: `translateY(${layout === 'vertical' ? art.lift : 0}px) scale(${scale})`,
          transformOrigin: layout === 'wide' ? '30% 50%' : '50% 40%',
        }}
      >
        <Img
          src={staticFile(file)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: layout === 'wide' ? 'left center' : 'center',
          }}
        />
      </div>
      <Scrims />
    </div>
  );
};

const Scrims: React.FC = () => {
  const layout = useLayout();
  if (layout === 'wide') {
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(90deg, rgba(10,10,10,0) 0px, rgba(10,10,10,0) 820px, rgba(10,10,10,0.92) 1120px, ${C.ink} 1260px)`,
        }}
      />
    );
  }
  return (
    <>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(10,10,10,0.94) 0px, rgba(10,10,10,0.8) 400px, rgba(10,10,10,0) 700px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(10,10,10,0) 860px, rgba(10,10,10,0.85) 1140px, rgba(10,10,10,0.97) 1400px)',
        }}
      />
    </>
  );
};

export const Label: React.FC<{children: React.ReactNode; style?: React.CSSProperties; color?: string}> = ({
  children,
  style,
  color = C.green2,
}) => (
  <div
    style={{
      fontFamily: MONO,
      fontWeight: 700,
      fontSize: 26,
      letterSpacing: '0.2em',
      textTransform: 'uppercase',
      color,
      ...style,
    }}
  >
    {children}
  </div>
);

export type Line = {text: React.ReactNode; at: number; color?: string};

/** Label + headline lines that rise in one by one and leave together. */
export const Headline: React.FC<{
  label?: React.ReactNode;
  labelAt?: number;
  lines: Line[];
  out?: number;
  size?: number;
}> = ({label, labelAt = 0, lines, out, size = 88}) => {
  const frame = useCurrentFrame();
  return (
    <div>
      {label ? (
        <Label style={{marginBottom: 26, ...fadeUp(frame, labelAt, {dist: 14, out})}}>{label}</Label>
      ) : null}
      {lines.map((l, i) => (
        <div
          key={i}
          style={{
            fontFamily: SANS,
            fontWeight: 600,
            fontSize: size,
            lineHeight: 1.06,
            letterSpacing: '-0.025em',
            color: l.color ?? C.cream,
            ...fadeUp(frame, l.at, {out}),
          }}
        >
          {l.text}
        </div>
      ))}
    </div>
  );
};

const STAR = 'M12 2.2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17.1 5.9 20.6l1.5-6.8L2.2 9.2l6.9-.7z';

/** A row of five stars filled up to `value` (fractional allowed). */
export const Stars: React.FC<{value: number; size?: number; color?: string; empty?: string; gap?: number}> = ({
  value,
  size = 30,
  color = C.green,
  empty = 'rgba(10,10,10,0.14)',
  gap = 4,
}) => (
  <div style={{display: 'flex', gap}}>
    {[0, 1, 2, 3, 4].map((i) => {
      const fill = Math.max(0, Math.min(1, value - i));
      return (
        <div key={i} style={{position: 'relative', width: size, height: size}}>
          <svg viewBox="0 0 24 24" width={size} height={size} style={{position: 'absolute'}}>
            <path d={STAR} fill={empty} />
          </svg>
          <div style={{position: 'absolute', inset: 0, width: size * fill, overflow: 'hidden'}}>
            <svg viewBox="0 0 24 24" width={size} height={size}>
              <path d={STAR} fill={color} />
            </svg>
          </div>
        </div>
      );
    })}
  </div>
);

export const Plane: React.FC<{size?: number; color?: string}> = ({size = 34, color = C.green2}) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill={color}>
    <path d="M22 2L15 22L11 13L2 9L22 2Z" />
  </svg>
);

/** Plane + wordmark. `light` is for cream backgrounds. */
export const Wordmark: React.FC<{size?: number; light?: boolean}> = ({size = 36, light}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: size * 0.38}}>
    <Plane size={size * 0.94} color={light ? C.green : C.green2} />
    <span style={{fontFamily: SANS, fontWeight: 700, fontSize: size, letterSpacing: '-0.02em', color: light ? C.ink : C.cream}}>
      Get<span style={{color: light ? C.green : C.green2}}>Set</span>Reply
    </span>
  </div>
);

export const Check: React.FC<{t: number; size?: number; color?: string; width?: number}> = ({
  t,
  size = 34,
  color = C.cream,
  width = 3,
}) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
    <path
      d="M4.5 12.5l5 5 10-11"
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      pathLength={1}
      strokeDasharray={1}
      strokeDashoffset={1 - t}
    />
  </svg>
);

/** A cream review card. */
export const ReviewCard: React.FC<{
  source: string;
  when: string;
  name: string;
  rating: number;
  text: string;
  replied?: number; // 0..1 progress of the "Replied" tag
  compact?: boolean;
  style?: React.CSSProperties;
}> = ({source, when, name, rating, text, replied = 0, compact, style}) => (
  <div
    style={{
      background: C.cream,
      borderRadius: compact ? 28 : 36,
      padding: compact ? '26px 32px' : '40px 44px',
      color: C.ink,
      boxShadow: '0 30px 80px rgba(0,0,0,0.35)',
      ...style,
    }}
  >
    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
      <Label color="rgba(10,10,10,0.5)" style={{fontSize: compact ? 18 : 21, fontWeight: 400}}>
        {source} · {when}
      </Label>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: C.green,
          color: C.cream,
          borderRadius: 999,
          padding: compact ? '6px 14px 6px 8px' : '8px 18px 8px 10px',
          fontFamily: MONO,
          fontWeight: 700,
          fontSize: compact ? 16 : 19,
          letterSpacing: '0.14em',
          opacity: prog(replied, 0, 0.4),
          transform: `scale(${0.8 + 0.2 * prog(replied, 0, 0.6)})`,
        }}
      >
        <Check t={prog(replied, 0.3, 0.7)} size={compact ? 22 : 26} />
        REPLIED
      </div>
    </div>
    <div style={{display: 'flex', alignItems: 'center', gap: 18, marginTop: compact ? 14 : 22}}>
      <span style={{fontFamily: SANS, fontWeight: 600, fontSize: compact ? 30 : 38}}>{name}</span>
      <Stars value={rating} size={compact ? 24 : 30} />
    </div>
    <div
      style={{
        fontFamily: SANS,
        fontWeight: 400,
        fontSize: compact ? 27 : 36,
        lineHeight: 1.35,
        marginTop: compact ? 8 : 14,
        color: 'rgba(10,10,10,0.82)',
        whiteSpace: compact ? 'nowrap' : 'normal',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {text}
    </div>
  </div>
);
