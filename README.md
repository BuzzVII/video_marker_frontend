# Video Marker Frontend

React frontend for marking correspondence points and lines across video frames and image sets.

The goal of the app is to collect shared visual features across multiple views of a house, then use those correspondences as input data for floor plan generation and simple 3D reconstruction.

## Backend model

This frontend targets the project scoped backend API from:

```text
https://github.com/BuzzVII/video_marker_backend
```

The app assumes this ownership model:

```text
Project
  has many image sets
  has one annotation document

ImageSet
  has many frames

AnnotationDocument
  stores points and lines observed across any image set in the project
```

Point and line observations now include both `imageSetId` and `imageId`, which allows a single correspondence point to appear across frames from any image set in the selected project.

## API endpoints used

```text
GET  /api/health
GET  /api/projects
POST /api/projects
GET  /api/projects/{project_id}
GET  /api/projects/{project_id}/image-sets
POST /api/projects/{project_id}/videos/upload
GET  /api/image-sets
GET  /api/image-sets/{image_set_id}
GET  /api/image-sets/{image_set_id}/frames/{frame_id}/image
GET  /api/projects/{project_id}/annotations
PUT  /api/projects/{project_id}/annotations
GET  /api/projects/{project_id}/export
```

Endpoint constants are in:

```text
src/api/endpoints.js
```

Fetch wrappers are in:

```text
src/api/client.ts
```

## UI changes in this version

This version includes:

* Project scoped annotation loading and saving.
* A top navigation bar.
* A project selector dropdown.
* A new project button.
* A help icon using `react-icons`.
* An about modal for the app.
* A zoom box that follows the cursor over the image to help with precise point selection.
* Two mirrored annotation panes.
* Per pane image set selection.
* Per pane video upload into the current project.
* Point creation, movement, deletion, and saving.
* Line creation by joining two points.

## Data model

Points are global within a project.

```ts
pointsById[pointId] = {
  id,
  color,
}
```

Point observations are keyed by point id, then by an observation key built from the image set id and frame id.

```ts
pointPositionsByPointId[pointId][`${imageSetId}:${imageId}`] = {
  pointId,
  imageSetId,
  imageId,
  x,
  y,
}
```

Lines are also global within a project.

```ts
linesById[lineId] = {
  id,
}
```

Line observations are keyed by line id, then by the same observation key.

```ts
lineOccurrencesByLineId[lineId][`${imageSetId}:${imageId}`] = {
  lineId,
  imageSetId,
  imageId,
  startPointId,
  endPointId,
}
```

Coordinates are stored as percentages from `0` to `100` in the frontend. The backend accepts this and converts to normalized coordinates in the reconstruction export.

## Install

This project uses `pnpm`.

```bash
corepack enable
pnpm install
```

## Run the backend

From the backend project:

```bash
cp .env.example .env
uv sync
uv run alembic upgrade head
uv run fastapi dev app/main.py
```

The backend should be available at:

```text
http://127.0.0.1:8000
```

## Run the frontend

```bash
pnpm dev
```

The app will usually be available at:

```text
http://localhost:5173/
```

The Vite dev server proxies `/api` to `http://127.0.0.1:8000`.

## Build

```bash
pnpm build
```

## Preview production build

```bash
pnpm preview
```

## Project structure

```text
src/
  api/
    client.ts
    endpoints.js

  components/
    AppLayout.tsx
    FrameCanvas.tsx
    HelpModal.tsx
    ImagePreviewList.tsx
    Pane.tsx
    Toolbar.tsx
    TopNav.tsx

  state/
    annotationAtoms.ts

  types/
    annotations.ts

  App.tsx
  main.tsx
  index.css
```

## Intended workflow

1. Select a project from the top navigation bar, or create a new project.
2. Upload one or more videos into the project.
3. Select an image set in the left pane.
4. Select another image set in the right pane.
5. Select frames in each pane.
6. Mark the same physical point across frames using the same active point id and colour.
7. Join two points to mark lines such as wall edges, door edges, or window edges.
8. Save the project annotation document.
9. Use the backend export endpoint as input to reconstruction experiments.

## Long term goal

The long term goal is to turn manually marked visual correspondences into structured geometric constraints. Those constraints can then be used to estimate camera poses, infer wall directions and intersections, recover room boundaries, and generate 2D or 3D house layout outputs.
