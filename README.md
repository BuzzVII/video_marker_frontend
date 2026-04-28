# Video Marker Frontend

A React frontend for marking correspondence points and lines across image frames extracted from video.

The goal of this app is to help identify shared visual features across multiple views of a house, then use those correspondences as input data for generating floor plans and simple 3D reconstructions.

## Purpose

The app is designed for workflows where a user has video or image frames of a house interior and wants to mark features that appear in more than one frame.

Examples include:

```text
Point 1: same room corner visible in frame 3, frame 7, and frame 12
Point 2: same window corner visible in frame 4 and frame 9
Line 1: wall edge between point 1 and point 2 in frame 7
```

These marked correspondences can later be used by geometry, optimisation, or reconstruction algorithms to estimate camera positions, infer wall layouts, and generate floor plans.

## Current Status

This is an early frontend scaffold.

It currently includes:

- Two mirrored side by side panes
- Image set selector
- Mock video frame preview list
- Selected frame viewer
- Toolbar for annotation tools
- Point creation
- Point movement
- Point deletion
- Point saving
- Active point colour display
- Line creation by joining two points
- Mock API layer
- TanStack Query for server style data fetching
- Jotai for local UI and annotation state

The API calls are currently mocked. Real endpoints can be filled in later in:

```text
src/api/endpoints.js
src/api/mockApi.ts
```

## Data Model

Points are global identities that can appear in multiple images.

A point is stored by point id, then image id, then position in that image.

```ts
pointsById[pointId] = {
  id,
  color,
}

pointPositionsByPointId[pointId][imageId] = {
  pointId,
  imageId,
  x,
  y,
}
```

This means one point can be observed in many frames, while each point can only appear once in a given image.

Lines are stored similarly.

```ts
linesById[lineId] = {
  id,
}

lineOccurrencesByLineId[lineId][imageId] = {
  lineId,
  imageId,
  startPointId,
  endPointId,
}
```

A line occurrence connects two existing point ids in a specific image.

## Intended Workflow

1. Load an image set or upload a video.
2. Select a frame in the left pane.
3. Mark a point on the left frame.
4. Select a corresponding frame in the right pane.
5. Mark the matching point in the right frame using the same active point id and colour.
6. Repeat across as many frames as needed.
7. Join two points to create a line where an edge, wall, doorway, or other structural feature is visible.
8. Save the annotation data.
9. Use the saved points and lines as input to downstream floor plan generation algorithms.

## Install

This project uses `pnpm`.

```bash
corepack enable
pnpm install
```

## Development

```bash
pnpm dev
```

The app will usually be available at:

```text
http://localhost:5173/
```

## Build

```bash
pnpm build
```

## Preview Production Build

```bash
pnpm preview
```

## Main Dependencies

```text
React
Vite
TypeScript
TanStack Query
Jotai
```

## Project Structure

```text
src/
  api/
    endpoints.js
    mockApi.ts
    mockData.ts

  components/
    AppLayout.tsx
    FrameCanvas.tsx
    ImagePreviewList.tsx
    Pane.tsx
    Toolbar.tsx

  state/
    annotationAtoms.ts

  types/
    annotations.ts

  App.tsx
  main.tsx
  index.css
```

## API Layer

Endpoint names are defined in:

```text
src/api/endpoints.js
```

Mock API behaviour is implemented in:

```text
src/api/mockApi.ts
```

When the backend exists, replace the mock functions with real `fetch` or client calls while keeping the component layer mostly unchanged.

## Notes for Future Development

Useful next steps:

- Add real video upload and frame extraction
- Add backend persistence for image sets and annotations
- Add zoom and pan support for frame inspection
- Add point and line editing panels
- Add keyboard shortcuts
- Add export to JSON
- Add import from JSON
- Add validation for incomplete correspondences
- Add camera pose and geometry solving experiments
- Add floor plan generation output view
- Add 2D and 3D reconstruction previews

## Annotation Semantics

Coordinates are currently stored as percentages of image width and height.

```ts
x: 0 to 100
y: 0 to 100
```

This keeps annotations independent of display size and makes them easier to map back onto the source image dimensions later.

## Long Term Goal

The long term goal is to turn hand marked visual correspondences into structured geometric constraints.

Those constraints can then be used to estimate house layout geometry, including:

- Wall directions
- Wall intersections
- Room boundaries
- Door and window positions
- Camera poses
- Approximate scale
- 2D floor plans
- Simple 3D meshes

This frontend is the data collection and review tool for that reconstruction workflow.
