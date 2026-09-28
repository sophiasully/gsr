export const FPS = 30;
export const XFADE = 12;

// Scene windows in frames. Each scene overlaps the next by XFADE frames so they
// cross-dissolve.
export const SCENES = {
  closing: {from: 0, dur: 180 + XFADE},
  reply: {from: 180, dur: 495 + XFADE},
  growth: {from: 675, dur: 255 + XFADE},
  end: {from: 930, dur: 150},
} as const;

export const DURATION = 1080;
