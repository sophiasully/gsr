import {Config} from '@remotion/cli/config';

// The GetSetReply explainer lives in explainer/. Static files (fonts,
// illustrations) are served from assets/ so the reels and the explainer share
// one font folder.
Config.setEntryPoint('explainer/src/index.ts');
Config.setPublicDir('assets');
// Use the preinstalled Playwright Chromium instead of letting Remotion download
// its own headless shell.
Config.setBrowserExecutable(
  process.env.REMOTION_CHROME ??
    '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell',
);
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
Config.setCodec('h264');
Config.setCrf(16);
