import type { ImageSet, AnnotationState } from "../types/annotations";

export const mockImageSets: ImageSet[] = [
  {
    id: "set-a",
    name: "Mock video A",
    frames: Array.from({ length: 12 }, (_, i) => ({
      id: `a-frame-${i + 1}`,
      label: `Frame ${i + 1}`,
      url: `https://picsum.photos/seed/video-a-${i + 1}/900/600`,
    })),
  },
  {
    id: "set-b",
    name: "Mock video B",
    frames: Array.from({ length: 10 }, (_, i) => ({
      id: `b-frame-${i + 1}`,
      label: `Frame ${i + 1}`,
      url: `https://picsum.photos/seed/video-b-${i + 1}/900/600`,
    })),
  },
];

export const emptyAnnotations: AnnotationState = {
  pointsById: {},
  pointPositionsByPointId: {},
  linesById: {},
  lineOccurrencesByLineId: {},
};
