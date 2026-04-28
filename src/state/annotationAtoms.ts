import { atom } from "jotai";
import type {
  AnnotationState,
  ImageSet,
  PaneSide,
  PointPosition,
  ToolMode,
} from "../types/annotations";

export const emptyAnnotations: AnnotationState = {
  pointsById: {},
  pointPositionsByPointId: {},
  linesById: {},
  lineOccurrencesByLineId: {},
};

export const selectedImageSetIdByPaneAtom = atom<Record<PaneSide, string | null>>({
  left: null,
  right: null,
});

export const imageSetByPaneAtom = atom<Record<PaneSide, ImageSet | null>>({
  left: null,
  right: null,
});

export const annotationsAtom = atom<AnnotationState>(
  structuredClone(emptyAnnotations),
);

export const toolModeAtom = atom<ToolMode>("new-point");

export const activePointIdAtom = atom<string | null>(null);

export const activeLinePointStartAtom = atom<string | null>(null);

export const selectedFrameByPaneAtom = atom<Record<PaneSide, string | null>>({
  left: null,
  right: null,
});

export const activePointAtom = atom(get => {
  const annotations = get(annotationsAtom);
  const activePointId = get(activePointIdAtom);

  if (!activePointId) return null;
  return annotations.pointsById[activePointId] ?? null;
});

export function makePointColor(index: number): string {
  const hue = (index * 137.508) % 360;
  return `hsl(${hue}, 85%, 55%)`;
}

export function upsertPointPosition(
  state: AnnotationState,
  position: PointPosition,
): AnnotationState {
  return {
    ...state,
    pointPositionsByPointId: {
      ...state.pointPositionsByPointId,
      [position.pointId]: {
        ...(state.pointPositionsByPointId[position.pointId] ?? {}),
        [position.imageId]: position,
      },
    },
  };
}

export function mergeAnnotations(
  annotations: AnnotationState[],
): AnnotationState {
  const merged = structuredClone(emptyAnnotations);

  for (const annotation of annotations) {
    Object.assign(merged.pointsById, annotation.pointsById);
    Object.assign(merged.linesById, annotation.linesById);

    for (const [pointId, byImage] of Object.entries(
      annotation.pointPositionsByPointId,
    )) {
      merged.pointPositionsByPointId[pointId] = {
        ...(merged.pointPositionsByPointId[pointId] ?? {}),
        ...byImage,
      };
    }

    for (const [lineId, byImage] of Object.entries(
      annotation.lineOccurrencesByLineId,
    )) {
      merged.lineOccurrencesByLineId[lineId] = {
        ...(merged.lineOccurrencesByLineId[lineId] ?? {}),
        ...byImage,
      };
    }
  }

  return merged;
}
