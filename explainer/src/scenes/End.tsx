import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C, SANS, fadeUp} from '../theme';
import {Label, Wordmark} from '../ui';

export const End: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(70% 45% at 50% 46%, rgba(34,160,107,0.16) 0%, rgba(10,10,10,0) 70%), ${C.ink}`,
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
      }}
    >
      <div style={{fontFamily: SANS, fontWeight: 600, fontSize: 96, lineHeight: 1.08, letterSpacing: '-0.03em'}}>
        <div style={{color: C.cream, ...fadeUp(frame, 10)}}>Every review answered.</div>
        <div style={{color: C.green2, ...fadeUp(frame, 28)}}>In your voice.</div>
      </div>
      <div style={{fontFamily: SANS, fontWeight: 500, fontSize: 46, color: C.cream, marginTop: 70, ...fadeUp(frame, 58, {dist: 16})}}>
        getsetreply.com
      </div>
      <Label color={C.muted} style={{marginTop: 22, fontSize: 26, ...fadeUp(frame, 72, {dist: 12})}}>
        30 days free. No card.
      </Label>
      <div style={{position: 'absolute', bottom: '7%', opacity: 0.85, ...fadeUp(frame, 90, {dist: 10})}}>
        <Wordmark size={34} />
      </div>
    </AbsoluteFill>
  );
};
