import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, SANS, easeInOut, prog} from '../theme';
import {Art, Headline, Label, Region, ReviewCard, Stars} from '../ui';

const FEED = [
  {name: 'Jess K.', rating: 5, source: 'Google', text: 'Rosa listened to exactly what I wanted.'},
  {name: 'Tom W.', rating: 5, source: 'Yelp', text: 'Friendly, on time, great fade.'},
  {name: 'Ana M.', rating: 4, source: 'Google', text: 'Lovely color. A little pricey but worth it.'},
  {name: 'Dana R.', rating: 5, source: 'Google', text: 'Came back after a rough first visit. So glad I did.'},
  {name: 'Leo P.', rating: 5, source: 'Yelp', text: 'Best haircut in the neighborhood.'},
  {name: 'Sam O.', rating: 5, source: 'Google', text: 'Booked my whole bridal party here.'},
];

const FIRST = 44;
const EVERY = 26;
const CARD = 176;
const GROW = [30, 216] as const;

export const Growth: React.FC<{dur: number}> = ({dur}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const g = interpolate(frame, GROW, [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: easeInOut,
  });
  const rating = 4.1 + Math.floor(g * 6 + 0.0001) / 10;
  const count = Math.round(86 + g * 45);
  const week = 1 + Math.floor(g * 7 + 0.0001);

  const blockIn = prog(frame, 16, 20);

  // Each new card pushes the feed up by one slot.
  const arrivals = FEED.map((_, i) =>
    spring({frame: frame - (FIRST + i * EVERY), fps, config: {damping: 200}, durationInFrames: 18}),
  );
  const shift = arrivals.reduce((a, b) => a + b, 0);

  return (
    <>
      <Art name="day" dur={dur} zoom={[1.02, 1.08]} />
      <Region kind="head">
        <Headline
          label={`Week ${week}`}
          labelAt={4}
          lines={[
            {text: 'The reviews kept coming.', at: 8},
            {text: 'So did the replies.', at: 40, color: C.green2},
          ]}
        />
      </Region>
      <Region kind="ui">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 34,
            opacity: blockIn,
            transform: `translateY(${(1 - blockIn) * 24}px)`,
          }}
        >
          <div
            style={{
              fontFamily: SANS,
              fontWeight: 600,
              fontSize: 190,
              lineHeight: 1,
              letterSpacing: '-0.04em',
              color: C.cream,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {rating.toFixed(1)}
          </div>
          <div>
            <Stars value={rating} size={56} color={C.green2} empty="rgba(244,250,246,0.18)" gap={6} />
            <Label color={C.muted} style={{marginTop: 16, fontSize: 22, fontWeight: 400}}>
              Google rating · {count} reviews
            </Label>
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            top: 250,
            left: 0,
            right: 0,
            height: 760,
            overflow: 'hidden',
            maskImage: 'linear-gradient(180deg, transparent 0, black 90px, black 100%)',
            WebkitMaskImage: 'linear-gradient(180deg, transparent 0, black 90px, black 100%)',
          }}
        >
          {FEED.map((r, i) => {
            const at = FIRST + i * EVERY;
            // Slot from the bottom: newest card sits lowest, older cards rise.
            const y = 760 - CARD + (i + 1) * CARD - shift * CARD;
            return (
              <ReviewCard
                key={i}
                compact
                source={`${r.source} review`}
                when={`week ${1 + Math.min(7, Math.floor((i / (FEED.length - 1)) * 7))}`}
                name={r.name}
                rating={r.rating}
                text={r.text}
                replied={prog(frame, at + 14, 16)}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: y,
                  height: CARD - 20,
                  boxSizing: 'border-box',
                  opacity: arrivals[i],
                }}
              />
            );
          })}
        </div>
      </Region>
    </>
  );
};
