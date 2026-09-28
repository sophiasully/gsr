// Illustrations live in assets/explainer/. A null file renders a labelled
// placeholder so the timeline can be previewed before art exists.
type Art = {label: string; placeholder: string; files: {vertical: string | null; wide: string | null}};

export const ART: Record<'night' | 'chair' | 'lights' | 'day', Art> = {
  night: {
    label: 'salon at night, Rosa closing up',
    placeholder: 'radial-gradient(120% 80% at 40% 35%, #2d4a3e 0%, #14231d 45%, #0a0a0a 100%)',
    files: {vertical: null, wide: null},
  },
  chair: {
    label: 'Rosa in the styling chair, reading her phone',
    placeholder: 'radial-gradient(90% 60% at 45% 35%, #4a3a2a 0%, #1f1a15 50%, #0a0a0a 100%)',
    files: {vertical: null, wide: null},
  },
  lights: {
    label: 'Rosa smiling, turning off the lights',
    placeholder: 'radial-gradient(90% 60% at 45% 35%, #5c4a30 0%, #231d15 50%, #0a0a0a 100%)',
    files: {vertical: null, wide: null},
  },
  day: {
    label: 'the salon by day, busy',
    placeholder: 'radial-gradient(120% 80% at 40% 35%, #cfe6d8 0%, #7fa892 45%, #1d2a24 100%)',
    files: {vertical: null, wide: null},
  },
};
