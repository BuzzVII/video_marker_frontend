# Video Marker Frontend

React frontend for marking correspondence points on video frames and inspecting a simple 3D reconstruction made from rectangular cuboids.

The goal of the app is to collect shared visual features across multiple views of a house, then use those correspondences and metric constraints as input data for floor plan generation and simple 3D reconstruction.

## UI in this version

This version changes the old two pane marker into a single image marker plus a 3D model view.

The left side contains:

* One project scoped image set selector.
* One scrollable frame preview list.
* One selected frame canvas.
* Point creation, movement, deletion, and joining.
* An active point dropdown so an existing point can be selected when adding observations in more frames.
* Frame preview highlighting when a frame already has a point observation.

The right side contains:

* A Three.js 3D canvas using `@react-three/fiber`.
* Orbit controls for pan, zoom, and rotate.
* The newest reconstruction model.
* Multiple rectangular cuboids.
* Vertex hit targets.
* Edge hit targets.
* A bottom control pill with:
  * Select point.
  * Delete point.
  * Add cuboid.
  * Delete cuboid.
  * Add length to edge.
  * Save model.

The edge length workflow is:

1. Select `Add length to edge`.
2. Click an edge in the 3D view.
3. Enter the measured length in the modal.
4. Save the edge length constraint into the active reconstruction model.

## Backend model

This frontend targets the project scoped backend API from:

    https://github.com/BuzzVII/video_marker_backend

The app assumes this ownership model:

    Project
      has many image sets
      has one annotation document
      has many reconstruction models

    ImageSet
      has many frames

    AnnotationDocument
      stores points and lines observed across any image set in the project

    ReconstructionModel
      stores cuboids and 3D constraints

Point and line observations include both `imageSetId` and `imageId`, which allows a single correspondence point to appear across frames from any image set in the selected project.

The 3D model deliberately stores cuboids parametrically instead of storing eight independent vertices. This keeps each shape rectangular and makes metric constraints simpler for later solver work.

## API endpoints used

Existing endpoints:

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

New model endpoints recommended for this version:

    GET    /api/projects/{project_id}/models/latest
    GET    /api/projects/{project_id}/models
    POST   /api/projects/{project_id}/models
    PUT    /api/projects/{project_id}/models/{model_id}
    DELETE /api/projects/{project_id}/models/{model_id}

    POST   /api/projects/{project_id}/models/{model_id}/cuboids
    PATCH  /api/projects/{project_id}/models/{model_id}/cuboids/{cuboid_id}
    DELETE /api/projects/{project_id}/models/{model_id}/cuboids/{cuboid_id}

    POST   /api/projects/{project_id}/models/{model_id}/edge-length-constraints
    PATCH  /api/projects/{project_id}/models/{model_id}/edge-length-constraints/{constraint_id}
    DELETE /api/projects/{project_id}/models/{model_id}/edge-length-constraints/{constraint_id}

    POST   /api/projects/{project_id}/models/{model_id}/point-vertex-constraints
    DELETE /api/projects/{project_id}/models/{model_id}/point-vertex-constraints/{constraint_id}

    POST   /api/projects/{project_id}/reconstruction-runs
    GET    /api/projects/{project_id}/reconstruction-runs
    GET    /api/projects/{project_id}/reconstruction-runs/{run_id}

For the first implementation, the frontend can work with a simpler whole document API:

    GET /api/projects/{project_id}/models/latest
    PUT /api/projects/{project_id}/models/{model_id}

Endpoint constants are in:

    src/api/endpoints.js

Fetch wrappers are in:

    src/api/client.ts

## Data model

Points are global within a project.

    pointsById[pointId] = {
      id,
      color,
      label,
    }

Point observations are keyed by point id, then by an observation key built from image set id and frame id.

    pointPositionsByPointId[pointId][`${imageSetId}:${imageId}`] = {
      pointId,
      imageSetId,
      imageId,
      x,
      y,
    }

Lines are also global within a project.

    linesById[lineId] = {
      id,
      label,
    }

Line observations are keyed by line id, then by the same observation key.

    lineOccurrencesByLineId[lineId][`${imageSetId}:${imageId}`] = {
      lineId,
      imageSetId,
      imageId,
      startPointId,
      endPointId,
    }

Cuboids are stored in the reconstruction model.

    cuboidsById[cuboidId] = {
      id,
      label,
      center: [x, y, z],
      size: [width, depth, height],
      rotation: [x, y, z, w],
      color,
      locked,
    }

Edge length constraints are stored separately from cuboids.

    edgeLengthConstraintsById[constraintId] = {
      id,
      edge: {
        cuboidId,
        edgeIndex,
        startVertexIndex,
        endVertexIndex,
      },
      length,
      unit,
      source,
      createdAt,
    }

Point to vertex constraints are also stored separately.

    pointVertexConstraintsById[constraintId] = {
      id,
      pointId,
      vertex: {
        cuboidId,
        vertexIndex,
      },
      confidence,
      source,
    }

Image coordinates are stored as percentages from `0` to `100` in the frontend. The backend can convert these to normalized coordinates in the reconstruction export.

## Install

This project uses `pnpm`.

    corepack enable
    pnpm install

The 3D view uses these packages:

    three
    @react-three/fiber
    @react-three/drei

## Run the backend

From the backend project:

    cp .env.example .env
    uv sync
    uv run alembic upgrade head
    uv run fastapi dev app/main.py

The backend should be available at:

    http://127.0.0.1:8000

## Run the frontend

    pnpm dev

The app will usually be available at:

    http://localhost:5173/

The Vite dev server proxies `/api` to `http://127.0.0.1:8000`.

## Build

    pnpm build

## Preview production build

    pnpm preview

## Zed editor setup

This repo includes:

    .zed/settings.json

The Zed settings enable format on save and TypeScript language server preferences for TypeScript and TSX files.

## Project structure

    src/
      api/
        client.ts
        endpoints.js

      components/
        AppLayout.tsx
        CuboidMesh.tsx
        CuboidScene.tsx
        EdgeLengthModal.tsx
        FrameCanvas.tsx
        HelpModal.tsx
        ImageAnnotationPanel.tsx
        ImagePreviewList.tsx
        ModelControlPill.tsx
        ReconstructionModelView.tsx
        Toolbar.tsx
        TopNav.tsx

      state/
        annotationAtoms.ts
        modelAtoms.ts

      types/
        annotations.ts
        reconstruction.ts

      App.tsx
      main.tsx
      index.css

## Intended workflow

1. Select a project from the top navigation bar, or create a new project.
2. Upload one or more videos into the project.
3. Select an image set in the left panel.
4. Select a frame.
5. Mark points and lines on the frame.
6. Use the right panel to inspect the newest cuboid reconstruction model.
7. Add cuboids manually where useful.
8. Select vertices for model editing and future point to vertex constraints.
9. Select edges and add measured lengths as metric constraints.
10. Save annotations and the model.
11. Use the backend export and reconstruction run endpoints for solver experiments.

## Long term goal

The long term goal is to turn manually marked visual correspondences, cuboid structure, and measured edge lengths into structured geometric constraints. Those constraints can then be used to estimate camera poses, infer wall directions and intersections, recover room boundaries, and generate 2D or 3D house layout outputs.
