import {Composition} from 'remotion';
import {Explainer} from './Explainer';
import {CALLING_DURATION, Calling} from './calling/Calling';
import {DURATION, FPS} from './timeline';

export const Root: React.FC = () => (
  <>
    <Composition
      id="Explainer-Vertical"
      component={Explainer}
      durationInFrames={DURATION}
      fps={FPS}
      width={1080}
      height={1920}
    />
    <Composition
      id="Explainer-Wide"
      component={Explainer}
      durationInFrames={DURATION}
      fps={FPS}
      width={1920}
      height={1080}
    />
    <Composition
      id="Calling-Vertical"
      component={Calling}
      durationInFrames={CALLING_DURATION}
      fps={FPS}
      width={1080}
      height={1920}
    />
    <Composition
      id="Calling-Wide"
      component={Calling}
      durationInFrames={CALLING_DURATION}
      fps={FPS}
      width={1920}
      height={1080}
    />
  </>
);
