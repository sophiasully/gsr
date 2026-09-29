import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, SANS, ease, fadeUp, prog} from '../theme';
import {Art, Check, Headline, Label, Plane, Region, ReviewCard, Wordmark} from '../ui';
import {useVariant} from '../variants';

const DRAFT =
  "Hi Dana, I'm so sorry about the wait on Saturday. That's not how anyone should feel in our chair. I'd love to make it right, so please message me directly. Rosa";

// Local beats (frames from the start of this scene).
const T = {
  card: 4,
  box: 62,
  draft: 156, // empty box hands off to the drafted reply
  typeStart: 176,
  typeEnd: 296,
  buttons: 300,
  tap: 352,
  approved: 360,
  lights: 350, // illustration crossfade to Rosa at the light switch
  collapse: 400,
  replied: 408,
};

export const Reply: React.FC<{dur: number}> = ({dur}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {reveal} = useVariant();

  const cardIn = spring({frame: frame - T.card, fps, config: {damping: 200}, durationInFrames: 26});
  const boxIn = prog(frame, T.box, 16);
  const handoff = prog(frame, T.draft, 18);
  const collapse = prog(frame, T.collapse, 22);

  const typed = Math.round(
    interpolate(frame, [T.typeStart, T.typeEnd], [0, DRAFT.length], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
  );
  const typing = frame >= T.typeStart && frame < T.typeEnd + 20;
  const caretOn = Math.floor(frame / 14) % 2 === 0;

  const press = frame >= T.tap && frame < T.tap + 7 ? 0.94 : 1;
  const approved = prog(frame, T.approved, 12);
  const ripple = prog(frame, T.tap, 20);

  // Review card drifts to the middle once the draft collapses into it.
  const cardShift = collapse * 150;

  return (
    <>
      <Art name="chair" dur={dur} zoom={[1.03, 1.1]} />
      <AbsoluteFill style={{opacity: prog(frame, T.lights, 24)}}>
        <Art name="lights" dur={dur - T.lights} zoom={[1.02, 1.06]} />
      </AbsoluteFill>

      <Region kind="head">
        <Headline
          lines={[
            {text: 'One of them stings.', at: 12},
            {text: 'What do you even say?', at: 44, color: C.green2},
          ]}
          out={T.draft - 8}
        />
        <div style={{position: 'absolute', top: 0}}>
          {reveal === 'now' ? (
            <Headline
              label="GetSetReply"
              labelAt={T.draft + 4}
              lines={[{text: 'A reply was already waiting.', at: T.draft + 10}]}
              out={T.tap - 10}
            />
          ) : reveal === 'X' ? (
            <Headline
              lines={[
                {text: <><span style={{color: C.green2}}>GetSetReply</span> already</>, at: T.draft + 6},
                {text: 'drafted her a reply.', at: T.draft + 18},
              ]}
              out={T.tap - 10}
            />
          ) : (
            <div
              style={{
                ...fadeUp(frame, T.draft + 4, {out: T.tap - 10}),
              }}
            >
              <div style={{transform: `scale(${0.9 + 0.1 * spring({frame: frame - T.draft - 4, fps, config: {damping: 16}})})`, transformOrigin: 'left center'}}>
                <Wordmark size={112} />
              </div>
              <div
                style={{
                  fontFamily: SANS,
                  fontWeight: 500,
                  fontSize: 58,
                  letterSpacing: '-0.02em',
                  color: C.cream,
                  marginTop: 22,
                  ...fadeUp(frame, T.draft + 20, {out: T.tap - 10}),
                }}
              >
                writes the reply for you.
              </div>
            </div>
          )}
        </div>
        <div style={{position: 'absolute', top: 0}}>
          <Headline
            label={`Approved · 0:08`}
            labelAt={T.approved + 4}
            lines={[
              {text: 'Read it. Approved it.', at: T.tap - 2},
              {text: 'Done.', at: T.approved + 14, color: C.green2},
            ]}
          />
        </div>
      </Region>

      <Region kind="ui">
        <div style={{transform: `translateY(${cardShift}px)`}}>
          <ReviewCard
            source="Google review"
            when="2 min ago"
            name="Dana R."
            rating={1}
            text="Waited 40 minutes past my appointment. Nobody even said sorry."
            replied={prog(frame, T.replied, 24)}
            style={{
              opacity: cardIn,
              transform: `translateY(${(1 - cardIn) * 60}px) scale(${0.94 + 0.06 * cardIn})`,
            }}
          />
        </div>

        {/* Empty reply box, before GetSetReply steps in */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 380,
            height: 170,
            borderRadius: 32,
            border: `2px solid ${C.line}`,
            background: 'rgba(22,26,24,0.85)',
            padding: '36px 40px',
            boxSizing: 'border-box',
            fontFamily: SANS,
            fontSize: 34,
            color: 'rgba(244,250,246,0.4)',
            opacity: boxIn * (1 - handoff),
            transform: `translateY(${(1 - boxIn) * 24}px)`,
          }}
        >
          <span style={{borderLeft: `3px solid ${caretOn ? C.cream : 'transparent'}`, paddingLeft: 6}}>
            Write a reply
          </span>
        </div>

        {/* The drafted reply */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 380,
            borderRadius: 36,
            background: C.mint,
            border: `3px solid ${C.green2}`,
            padding: '34px 40px 36px',
            color: C.ink,
            boxShadow: '0 30px 80px rgba(0,0,0,0.35)',
            opacity: handoff * (1 - collapse),
            transform: `translateY(${(1 - handoff) * 30 - collapse * 120}px) scale(${1 - collapse * 0.12})`,
            transformOrigin: 'top center',
          }}
        >
          {reveal === 'now' ? (
            <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
              <Plane size={26} color={C.green} />
              <Label color={C.green} style={{fontSize: 20}}>
                Drafted in your voice
              </Label>
            </div>
          ) : (
            <div style={{display: 'flex', alignItems: 'center', gap: 14}}>
              <Plane size={30} color={C.green} />
              <span style={{fontFamily: SANS, fontWeight: 700, fontSize: 30, letterSpacing: '-0.02em'}}>
                Get<span style={{color: C.green}}>Set</span>Reply
              </span>
              <Label color="rgba(10,10,10,0.5)" style={{fontSize: 18, fontWeight: 400}}>
                · drafted in your voice
              </Label>
            </div>
          )}
          <div style={{fontFamily: SANS, fontSize: 35, lineHeight: 1.4, marginTop: 18}}>
            <span>{DRAFT.slice(0, typed)}</span>
            {typing ? (
              <span style={{borderLeft: `3px solid ${caretOn ? C.green : 'transparent'}`}} />
            ) : null}
            <span style={{color: 'transparent'}}>{DRAFT.slice(typed)}</span>
          </div>
          <div
            style={{
              display: 'flex',
              gap: 18,
              marginTop: 30,
              justifyContent: 'flex-end',
              opacity: prog(frame, T.buttons, 14),
            }}
          >
            <div
              style={{
                fontFamily: SANS,
                fontWeight: 500,
                fontSize: 32,
                padding: '20px 36px',
                borderRadius: 999,
                border: '2px solid rgba(10,10,10,0.2)',
                color: 'rgba(10,10,10,0.7)',
              }}
            >
              Edit
            </div>
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontFamily: SANS,
                fontWeight: 600,
                fontSize: 32,
                padding: '20px 44px',
                borderRadius: 999,
                background: C.green,
                color: C.cream,
                transform: `scale(${press})`,
              }}
            >
              {/* tap ripple */}
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  width: 120,
                  height: 120,
                  marginLeft: -60,
                  marginTop: -60,
                  borderRadius: '50%',
                  background: C.cream,
                  opacity: frame >= T.tap ? 0.5 * (1 - ripple) : 0,
                  transform: `scale(${0.3 + ripple * 1.6})`,
                }}
              />
              <div style={{width: approved * 34, overflow: 'hidden', display: 'flex'}}>
                <Check t={prog(frame, T.approved + 2, 14, ease)} size={34} />
              </div>
              <span>{frame >= T.approved ? 'Approved' : 'Approve'}</span>
            </div>
          </div>
        </div>
      </Region>
    </>
  );
};

