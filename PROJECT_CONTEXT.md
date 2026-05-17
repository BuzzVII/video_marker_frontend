# Project context

This frontend is the React and Vite UI for the video marker house plan fitting app. It currently supports project selection, video frame review, 2D point and line annotation, a 3D cuboid view, and explicit model constraints.

This package adds first pass radiance field UI support:

- start a Gaussian splat processing job from a selected project image set
- poll radiance field job status
- list available radiance fields for the selected project
- select and load a radiance field metadata object
- expose the selected asset URL for opening or future viewer integration

The frontend does not yet render the Gaussian splat inside the 3D canvas. This change deliberately avoids adding a splat viewer dependency until the backend asset format is proven. The current UI loads the selected radiance field record and exposes its asset link. The next frontend step is to add a real splat renderer to the existing 3D scene.

Important files added or changed:

- `src/types/radiance.ts`
- `src/components/RadianceFieldPanel.tsx`
- `src/components/ReconstructionModelView.tsx`
- `src/api/client.ts`
- `src/api/endpoints.js`
- `src/index.css`
