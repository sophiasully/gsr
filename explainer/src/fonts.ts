import {continueRender, delayRender, staticFile} from 'remotion';
import '@fontsource/instrument-sans/400.css';
import '@fontsource/instrument-sans/500.css';
import '@fontsource/instrument-sans/600.css';

const faces: [string, string, string][] = [
  ['Space Mono', 'fonts/space-mono/SpaceMono-Regular.woff2', '400'],
  ['Space Mono', 'fonts/space-mono/SpaceMono-Bold.woff2', '700'],
];

let started = false;

export const loadFonts = () => {
  if (started) return;
  started = true;
  const handle = delayRender('Loading fonts');
  Promise.allSettled(
    faces.map(async ([family, file, weight]) => {
      const face = new FontFace(family, `url(${staticFile(file)})`, {weight});
      await face.load();
      document.fonts.add(face);
    }),
  )
    .then(() => document.fonts.ready)
    .then(() => continueRender(handle));
};
