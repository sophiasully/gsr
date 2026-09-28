import {continueRender, delayRender, staticFile} from 'remotion';

const faces: [string, string, string][] = [
  ['General Sans', 'fonts/general-sans/GeneralSans-Regular.woff2', '400'],
  ['General Sans', 'fonts/general-sans/GeneralSans-Medium.woff2', '500'],
  ['General Sans', 'fonts/general-sans/GeneralSans-Semibold.woff2', '600'],
  ['General Sans', 'fonts/general-sans/GeneralSans-Bold.woff2', '700'],
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
