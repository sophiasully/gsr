import {Composition} from 'remotion';
import {Explainer} from './Explainer';
import {DURATION, FPS} from './timeline';
import {defaultVariants} from './variants';

export const Root: React.FC = () => (
  <>
    <Composition
      id="Explainer-Vertical"
      component={Explainer}
      defaultProps={defaultVariants}
      durationInFrames={DURATION}
      fps={FPS}
      width={1080}
      height={1920}
    />
    <Composition
      id="Explainer-Wide"
      component={Explainer}
      defaultProps={defaultVariants}
      durationInFrames={DURATION}
      fps={FPS}
      width={1920}
      height={1080}
    />
  </>
);
