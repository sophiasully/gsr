import React from 'react';
import {spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, MONO, SANS, prog} from '../theme';
import {Art, Headline, Label, Region, Stars} from '../ui';

const NOTES = [
  {at: 78, source: 'Google', name: 'Priya S.', rating: 5, text: 'Best balayage I have ever had. Rosa is a genius.'},
  {at: 94, source: 'Yelp', name: 'Marcus T.', rating: 4, text: 'Great cut, easy booking. Will be back.'},
  {at: 110, source: 'Google', name: 'Elena V.', rating: 5, text: 'So calm in here. Loved my color.'},
  {at: 128, source: 'Google', name: 'Dana R.', rating: 1, text: 'Waited 40 minutes past my appointment. Nobody even said sorry.'},
];

const NOTE_H = 172;

export const Closing: React.FC<{dur: number}> = ({dur}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const phoneIn = spring({frame: frame - 56, fps, config: {damping: 200}, durationInFrames: 30});

  // A short, decaying wiggle each time a review lands.
  const buzz = NOTES.reduce((acc, n) => {
    const t = frame - n.at;
    if (t < 0 || t > 10) return acc;
    return acc + Math.sin(t * 2.4) * (1 - t / 10) * 1.1;
  }, 0);

  return (
    <>
      <Art name="night" dur={dur} zoom={[1.02, 1.1]} />
      <Region kind="head">
        <Headline
          label="9:47 PM · Studio Rosa"
          labelAt={6}
          lines={[
            {text: "The salon's closed.", at: 14},
            {text: "Her phone isn't.", at: 46, color: C.green2},
          ]}
        />
      </Region>
      <Region kind="ui">
        <div
          style={{
            position: 'absolute',
            left: 120,
            top: 20,
            width: 660,
            height: 1400,
            borderRadius: 88,
            background: 'linear-gradient(180deg, #1b231f 0%, #0f1412 100%)',
            border: '14px solid #262b29',
            boxShadow: '0 50px 120px rgba(0,0,0,0.6)',
            transform: `translateY(${(1 - phoneIn) * 700}px) rotate(${buzz}deg)`,
            opacity: phoneIn,
            overflow: 'hidden',
          }}
        >
          <div style={{textAlign: 'center', marginTop: 70}}>
            <div style={{fontFamily: MONO, fontSize: 22, letterSpacing: '0.18em', color: C.muted}}>FRIDAY, OCT 3</div>
            <div style={{fontFamily: SANS, fontWeight: 500, fontSize: 150, color: C.cream, letterSpacing: '-0.03em', lineHeight: 1.1}}>
              9:47
            </div>
          </div>
          <div style={{position: 'absolute', left: 30, right: 30, top: 330}}>
            {NOTES.map((n, i) => {
              const inT = spring({frame: frame - n.at, fps, config: {damping: 18, mass: 0.7}});
              // Newer notifications push older ones down.
              const slot = NOTES.slice(i + 1).reduce(
                (s, m) => s + spring({frame: frame - m.at, fps, config: {damping: 200}, durationInFrames: 14}),
                0,
              );
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: slot * NOTE_H,
                    height: NOTE_H - 16,
                    borderRadius: 34,
                    background: 'rgba(244,250,246,0.94)',
                    padding: '22px 28px',
                    boxSizing: 'border-box',
                    opacity: Math.min(1, inT * 1.4),
                    transform: `translateY(${(1 - inT) * -40}px) scale(${0.9 + 0.1 * inT})`,
                  }}
                >
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <Label color="rgba(10,10,10,0.5)" style={{fontSize: 17, fontWeight: 400}}>
                      {n.source} review · now
                    </Label>
                    <Stars value={n.rating} size={22} gap={3} />
                  </div>
                  <div style={{fontFamily: SANS, fontWeight: 600, fontSize: 27, color: C.ink, marginTop: 10}}>{n.name}</div>
                  <div
                    style={{
                      fontFamily: SANS,
                      fontSize: 25,
                      color: 'rgba(10,10,10,0.72)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      marginTop: 2,
                    }}
                  >
                    {n.text}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Region>
      <Region kind="head">
        <div style={{position: 'absolute', top: 290}}>
          <Label
            style={{
              opacity: prog(frame, 146, 14),
              color: C.cream,
              background: 'rgba(34,160,107,0.9)',
              padding: '10px 18px',
              borderRadius: 10,
              fontSize: 22,
            }}
          >
            4 new reviews · 0 replied
          </Label>
        </div>
      </Region>
    </>
  );
};
