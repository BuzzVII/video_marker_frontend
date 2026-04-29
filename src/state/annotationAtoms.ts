import { atom } from "jotai";
import type { AnnotationState, ImageSet, PointPosition, ToolMode } from "../types/annotations";

export const emptyAnnotations: AnnotationState = {
  pointsById: {},
  pointPositionsByPointId: {},
  linesById: {},
  lineOccurrencesByLineId: {},
};

export const selectedProjectIdAtom = atom<string | null>(null);
export const selectedImageSetIdAtom = atom<string | null>(null);
export const imageSetAtom = atom<ImageSet | null>(null);
export const selectedFrameIdAtom = atom<string | null>(null);
export const annotationsAtom = atom<AnnotationState>(structuredClone(emptyAnnotations));
export const toolModeAtom = atom<ToolMode>("new-point");
export const activePointIdAtom = atom<string | null>(null);
export const activeLinePointStartAtom = atom<string | null>(null);

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

export function makeObservationKey(imageSetId: string, imageId: string): string {
  return `${imageSetId}:${imageId}`;
}

export function upsertPointPosition(state: AnnotationState, position: PointPosition): AnnotationState {
  const observationKey = makeObservationKey(position.imageSetId, position.imageId);
  return {
    ...state,
    pointPositionsByPointId: {
      ...state.pointPositionsByPointId,
      [position.pointId]: {
        ...(state.pointPositionsByPointId[position.pointId] ?? {}),
        [observationKey]: position,
      },
    },
  };
}
