import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, MONO, SANS, fadeUp, prog} from '../theme';
import {Check, ReviewCard, Stars, Wordmark} from '../ui';
import {CAST, L, Portrait, Tag, Words, useBoxes, useV} from './kit';

const abs = (s: {left: number; top: number}): React.CSSProperties => ({position: 'absolute', left: s.left, top: s.top});

/* 1. "Calling all local businesses." with signal rings */
export const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const v = useV();
  const rings = [0, 22, 44, 66];
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
      {rings.map((r) => {
        const t = ((frame - r + 88) % 88) / 88;
        return (
          <div
            key={r}
            style={{
              position: 'absolute',
              width: 900,
              height: 900,
              borderRadius: '50%',
              border: `3px solid ${L.accent}`,
              opacity: frame < r ? 0 : (1 - t) * 0.35,
              transform: `scale(${0.2 + t * 1.3})`,
            }}
          />
        );
      })}
      <Words
        align="center"
        at={8}
        stagger={7}
        size={v(150, 140)}
        out={104}
        lines={v(
          ['Calling all', [{w: 'local', color: L.accent}], [{w: 'businesses.', color: L.accent}]],
          ['Calling all', [{w: 'local', color: L.accent}, {w: 'businesses.', color: L.accent}]],
        )}
      />
    </AbsoluteFill>
  );
};

/* 2. Roll call: four owners, one line each */
export const BEAT = 66;
export const RollCall: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {text, visual} = useBoxes();
  const v = useV();
  return (
    <>
      <div style={{...abs(text), width: text.width}}>
        {CAST.map((b, i) => (
          <div key={b.key} style={{position: 'absolute', top: 0, left: 0, width: text.width}}>
            <Words
              size={v(104, 96)}
              at={i * BEAT + 6}
              stagger={4}
              out={i < CAST.length - 1 ? (i + 1) * BEAT - 4 : undefined}
              lines={[b.line.split(' ').map((w, wi, all) => ({w, color: wi === all.length - 1 ? L.accent : undefined}))]}
            />
          </div>
        ))}
      </div>
      <div style={{...abs(visual), width: visual.size, height: visual.size}}>
        {CAST.map((b, i) => {
          const t = spring({frame: frame - i * BEAT, fps, config: {damping: 16, mass: 0.8}});
          // Cards already covered sink back slightly.
          const covered = CAST.slice(i + 1).reduce(
            (a, _, j) => a + spring({frame: frame - (i + 1 + j) * BEAT, fps, config: {damping: 200}}),
            0,
          );
          const rot = [-3, 2.5, -2, 1.5][i];
          return (
            <Portrait
              key={b.key}
              biz={b}
              size={visual.size}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                opacity: Math.min(1, t * 2),
                transform: `translateX(${(1 - t) * 700}px) rotate(${rot * (1 - t) * 3 + rot * 0.4 - covered * 2}deg) scale(${1 - covered * 0.05})`,
                filter: `brightness(${1 - Math.min(covered, 1) * 0.12})`,
              }}
            />
          );
        })}
      </div>
    </>
  );
};

/* 3. The pile of unanswered reviews */
const PILE = [
  {biz: 'The cafe on 5th', name: 'Jo L.', rating: 5, text: 'Best oat latte in town. They know my order.'},
  {biz: 'The auto shop', name: 'Sam P.', rating: 1, text: "Charged me for a part I didn't ask for."},
  {biz: 'The flower shop', name: 'Ari K.', rating: 4, text: 'Gorgeous bouquet, arrived a bit late.'},
  {biz: 'The dentist', name: 'Nia B.', rating: 5, text: 'Gentle and kind. Remembered my kids.'},
  {biz: 'The cafe on 5th', name: 'Dev R.', rating: 2, text: 'Waited 20 minutes for a drip coffee.'},
  {biz: 'The auto shop', name: 'Lou M.', rating: 5, text: 'Honest quote, done same day.'},
  {biz: 'The flower shop', name: 'Kim T.', rating: 5, text: 'Saved our anniversary. Thank you!'},
  {biz: 'The dentist', name: 'Raj S.', rating: 4, text: 'Great cleaning, hard to park.'},
];
export const PILE_TOTAL = 12;

export const Pile: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {text, visual} = useBoxes();
  const v = useV();
  const landed = PILE.filter((_, i) => frame >= 14 + i * 9 + 8).length;
  const count = Math.min(PILE_TOTAL, Math.round((landed / PILE.length) * PILE_TOTAL));
  return (
    <>
      <div style={{...abs(text), width: text.width}}>
        <Words size={v(96, 88)} at={4} lines={['Your customers', 'are talking.']} />
        <div style={{height: v(30, 26)}} />
        <Words size={v(96, 88)} at={46} lines={[[{w: 'Are'}, {w: 'you'}, {w: 'answering?', color: L.accent}]]} />
      </div>
      <div style={{...abs(visual), width: visual.size, height: visual.size}}>
        {PILE.map((r, i) => {
          const at = 14 + i * 9;
          const t = spring({frame: frame - at, fps, config: {damping: 14, mass: 0.7}});
          const rot = [-6, 4, -3, 7, -8, 3, -4, 6][i];
          const x = [10, 120, 40, 150, 0, 90, 60, 130][i];
          const y = 70 + i * 92;
          return (
            <ReviewCard
              key={i}
              compact
              source={r.biz}
              when="unanswered"
              name={r.name}
              rating={r.rating}
              text={r.text}
              style={{
                position: 'absolute',
                left: x * (visual.size / 900),
                top: y * (visual.size / 900) - (1 - t) * 900,
                width: visual.size * 0.78,
                boxSizing: 'border-box',
                background: L.card,
                boxShadow: '0 20px 50px rgba(10,10,10,0.16)',
                opacity: Math.min(1, t * 3),
                transform: `rotate(${rot * (0.4 + 0.6 * t)}deg)`,
              }}
            />
          );
        })}
        <Tag
          dark
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            fontSize: 26,
            opacity: prog(frame, 14, 8),
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {String(count).padStart(2, '0')} unanswered
        </Tag>
      </div>
    </>
  );
};

/* 4. Inside the phone: draft, approve, then clear the inbox */
const INBOX = [
  {biz: 'The auto shop', name: 'Sam P.', rating: 1, text: "Charged me for a part I didn't ask for."},
  {biz: 'The cafe on 5th', name: 'Jo L.', rating: 5, text: 'Best oat latte in town.'},
  {biz: 'The flower shop', name: 'Ari K.', rating: 4, text: 'Gorgeous bouquet, a bit late.'},
  {biz: 'The dentist', name: 'Nia B.', rating: 5, text: 'Gentle and kind. Remembered my kids.'},
  {biz: 'The cafe on 5th', name: 'Dev R.', rating: 2, text: 'Waited 20 minutes for a coffee.'},
  {biz: 'The auto shop', name: 'Lou M.', rating: 5, text: 'Honest quote, done same day.'},
  {biz: 'The flower shop', name: 'Kim T.', rating: 5, text: 'Saved our anniversary.'},
];
const REPLY =
  "Hi Sam, you're right. We should have called before adding that part, and that's on us. Stop by and I'll refund it. Mike";
const P = {rise: 0, tap: 34, sheet: 40, typeStart: 52, typeEnd: 122, approve: 134, sheetOut: 148, rest: 160, every: 13};

export const PhoneScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {text} = useBoxes();
  const v = useV();
  const rise = spring({frame: frame - P.rise, fps, config: {damping: 200}, durationInFrames: 26});
  const sheet = prog(frame, P.sheet, 14) * (1 - prog(frame, P.sheetOut, 14));
  const typed = Math.round(
    interpolate(frame, [P.typeStart, P.typeEnd], [0, REPLY.length], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
  );
  const repliedAt = (i: number) => (i === 0 ? P.approve + 6 : P.rest + (i - 1) * P.every);
  const allDone = prog(frame, repliedAt(INBOX.length - 1) + 10, 16);
  const ROW = 168;
  const scroll = interpolate(frame, [P.rest + 20, repliedAt(INBOX.length - 1)], [0, ROW * 2], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <>
      <div style={{...abs(text), width: text.width}}>
        <Words size={v(84, 80)} at={P.tap} lines={[[{w: 'GetSetReply', color: L.accent}, {w: 'drafts'}], 'every reply.']} />
        <div style={{height: v(24, 20)}} />
        <Words size={v(84, 80)} at={P.typeEnd - 30} lines={['In your voice.']} />
        <div style={{height: v(24, 20)}} />
        <Words size={v(84, 80)} at={P.approve - 4} lines={[[{w: 'You'}, {w: 'just'}, {w: 'approve.', color: L.accent}]]} />
      </div>

      <div
        style={{
          position: 'absolute',
          left: v(220, 1140),
          top: v(820, 90),
          width: 640,
          height: 1300,
          transform: `translateY(${(1 - rise) * 900}px) scale(${v(1, 0.8)})`,
          transformOrigin: 'top left',
          borderRadius: 86,
          border: '14px solid #0f1412',
          background: L.card,
          boxShadow: '0 50px 120px rgba(10,10,10,0.25)',
          overflow: 'hidden',
        }}
      >
        {/* app header */}
        <div style={{position: 'relative', zIndex: 2, background: L.card, padding: '56px 36px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `2px solid ${L.line}`}}>
          <Wordmark size={34} light />
          <div style={{fontFamily: MONO, fontSize: 20, letterSpacing: '0.14em', color: allDone > 0.5 ? L.accent : L.muted, fontWeight: 700}}>
            {allDone > 0.5 ? 'ALL REPLIED' : `INBOX · ${INBOX.filter((_, i) => frame < repliedAt(i)).length}`}
          </div>
        </div>
        {/* rows */}
        <div style={{transform: `translateY(${-scroll}px)`}}>
          {INBOX.map((r, i) => {
            const done = prog(frame, repliedAt(i), 10);
            const tapped = i === 0 && frame >= P.tap && frame < P.tap + 16;
            return (
              <div
                key={i}
                style={{
                  position: 'relative',
                  height: ROW,
                  padding: '24px 36px',
                  boxSizing: 'border-box',
                  borderBottom: `2px solid ${L.line}`,
                  background: tapped ? 'rgba(34,160,107,0.08)' : 'transparent',
                }}
              >
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <span style={{fontFamily: MONO, fontSize: 18, letterSpacing: '0.12em', color: L.muted, textTransform: 'uppercase'}}>{r.biz}</span>
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontFamily: MONO,
                      fontWeight: 700,
                      fontSize: 16,
                      letterSpacing: '0.12em',
                      padding: '6px 12px 6px 8px',
                      borderRadius: 999,
                      color: done > 0.5 ? C.cream : L.ink,
                      background: done > 0.5 ? L.accent : 'transparent',
                      border: `2px solid ${done > 0.5 ? L.accent : 'rgba(10,10,10,0.25)'}`,
                      transform: `scale(${1 + Math.sin(done * Math.PI) * 0.12})`,
                    }}
                  >
                    {done > 0.5 ? <Check t={prog(frame, repliedAt(i) + 3, 8)} size={20} /> : null}
                    {done > 0.5 ? 'REPLIED' : 'TO REPLY'}
                  </span>
                </div>
                <div style={{display: 'flex', alignItems: 'center', gap: 14, marginTop: 10}}>
                  <span style={{fontFamily: SANS, fontWeight: 600, fontSize: 28}}>{r.name}</span>
                  <Stars value={r.rating} size={22} />
                </div>
                <div style={{fontFamily: SANS, fontSize: 25, color: 'rgba(10,10,10,0.7)', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                  {r.text}
                </div>
                {i === 0 ? (
                  <div
                    style={{
                      position: 'absolute',
                      left: 200,
                      top: 50,
                      width: 90,
                      height: 90,
                      borderRadius: '50%',
                      background: L.accent,
                      opacity: frame >= P.tap ? 0.35 * (1 - prog(frame, P.tap, 16)) : 0,
                      transform: `scale(${0.4 + prog(frame, P.tap, 16) * 1.6})`,
                    }}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
        {/* draft sheet */}
        <div
          style={{
            position: 'absolute',
            zIndex: 3,
            left: 0,
            right: 0,
            bottom: 0,
            height: 760,
            background: C.mint,
            borderTop: `3px solid ${C.green2}`,
            borderRadius: '44px 44px 0 0',
            padding: '36px 36px',
            boxSizing: 'border-box',
            transform: `translateY(${(1 - sheet) * 780}px)`,
            boxShadow: '0 -20px 60px rgba(10,10,10,0.15)',
          }}
        >
          <div style={{fontFamily: MONO, fontWeight: 700, fontSize: 19, letterSpacing: '0.16em', color: L.accent}}>DRAFTED IN YOUR VOICE</div>
          <div style={{fontFamily: SANS, fontSize: 32, lineHeight: 1.4, marginTop: 18, color: L.ink}}>
            {REPLY.slice(0, typed)}
            <span style={{color: 'transparent'}}>{REPLY.slice(typed)}</span>
          </div>
          <div
            style={{
              position: 'absolute',
              left: 36,
              right: 36,
              top: 470,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              height: 88,
              borderRadius: 999,
              background: L.accent,
              color: C.cream,
              fontFamily: SANS,
              fontWeight: 600,
              fontSize: 32,
              opacity: prog(frame, P.typeEnd - 4, 10),
              transform: `scale(${frame >= P.approve && frame < P.approve + 6 ? 0.95 : 1})`,
            }}
          >
            {frame >= P.approve ? <Check t={prog(frame, P.approve + 1, 10)} size={34} /> : null}
            {frame >= P.approve ? 'Approved' : 'Approve'}
          </div>
        </div>
      </div>
    </>
  );
};

/* 5. Payoff: everyone back to work, every review replied */
export const Payoff: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const v = useV();
  const size = v(430, 390);
  const pos = (i: number) =>
    v({left: 90 + (i % 2) * 470, top: 700 + Math.floor(i / 2) * 470}, {left: 130 + i * 425, top: 560});
  return (
    <>
      <div style={{position: 'absolute', left: v(90, 130), top: v(200, 150), width: v(900, 1700)}}>
        <Words size={v(96, 96)} at={10} lines={v(['Back to doing', [{w: 'what'}, {w: 'you'}, {w: 'do', color: L.accent}, {w: 'best.', color: L.accent}]], ['Back to doing', [{w: 'what'}, {w: 'you'}, {w: 'do', color: L.accent}, {w: 'best.', color: L.accent}]])} />
      </div>
      {CAST.map((b, i) => {
        const t = spring({frame: frame - i * 5, fps, config: {damping: 15, mass: 0.8}});
        const badge = spring({frame: frame - 34 - i * 10, fps, config: {damping: 12}});
        const drift = Math.sin((frame + i * 20) / 30) * 6;
        const p = pos(i);
        return (
          <Portrait
            key={b.key}
            biz={b}
            size={size}
            tag={false}
            style={{
              position: 'absolute',
              left: p.left,
              top: p.top,
              opacity: Math.min(1, t * 2),
              transform: `translateY(${(1 - t) * 300 + drift}px) scale(${0.7 + 0.3 * t})`,
            }}
          >
            <Tag
              style={{
                position: 'absolute',
                left: 16,
                bottom: 16,
                fontSize: 17,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                color: C.cream,
                background: L.accent,
                opacity: Math.min(1, badge * 2),
                transform: `scale(${0.6 + 0.4 * badge})`,
                transformOrigin: 'left bottom',
              }}
            >
              <Check t={prog(frame, 40 + i * 10, 10)} size={20} />
              Replied
            </Tag>
          </Portrait>
        );
      })}
    </>
  );
};

/* 6. End card (light) */
export const EndLight: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', textAlign: 'center'}}>
      <div style={{fontFamily: MONO, fontWeight: 700, fontSize: 24, letterSpacing: '0.22em', color: L.accent, marginBottom: 40, ...fadeUp(frame, 4, {dist: 12})}}>
        CALLING ALL LOCAL BUSINESSES
      </div>
      <div style={{fontFamily: SANS, fontWeight: 600, fontSize: 96, lineHeight: 1.08, letterSpacing: '-0.03em'}}>
        <div style={{color: L.ink, ...fadeUp(frame, 14)}}>Every review answered.</div>
        <div style={{color: L.accent, ...fadeUp(frame, 30)}}>In your voice.</div>
      </div>
      <div style={{fontFamily: SANS, fontWeight: 500, fontSize: 46, color: L.ink, marginTop: 70, ...fadeUp(frame, 58, {dist: 16})}}>
        getsetreply.com
      </div>
      <div style={{fontFamily: MONO, fontWeight: 700, fontSize: 26, letterSpacing: '0.2em', color: L.muted, marginTop: 22, ...fadeUp(frame, 72, {dist: 12})}}>
        30 DAYS FREE. NO CARD.
      </div>
      <div style={{position: 'absolute', bottom: '7%', ...fadeUp(frame, 90, {dist: 10})}}>
        <Wordmark size={34} light />
      </div>
    </AbsoluteFill>
  );
};
