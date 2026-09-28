// Illustrations live in assets/explainer/ (generated with Nano Banana 2).
// lift: px the art is raised in the vertical cut so the subject clears the UI.
type Art = {lift: number; files: {vertical: string; wide: string}};

export const ART: Record<'night' | 'chair' | 'lights' | 'day', Art> = {
  night: {
    lift: -260,
    files: {vertical: 'explainer/night-vertical.jpg', wide: 'explainer/night-wide.jpg'},
  },
  chair: {
    lift: -300,
    files: {vertical: 'explainer/chair-vertical.jpg', wide: 'explainer/chair-wide.jpg'},
  },
  lights: {
    lift: -280,
    files: {vertical: 'explainer/lights-vertical.jpg', wide: 'explainer/lights-wide.jpg'},
  },
  day: {
    lift: -240,
    files: {vertical: 'explainer/day-vertical.jpg', wide: 'explainer/day-wide.jpg'},
  },
};
