import { atom } from "jotai";
import type {
  AnnotationState,
  ImageSet,
  LineOccurrence,
  PointPosition,
  ToolMode,
} from "../types/annotations";

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
export const activeLineIdAtom = atom<string | null>(null);
export const activeLinePointStartAtom = atom<string | null>(null);
export const hideFramesWithoutMarkupAtom = atom(false);

export const activePointAtom = atom(get => {
  const annotations = get(annotationsAtom);
  const activePointId = get(activePointIdAtom);
  if (!activePointId) return null;
  return annotations.pointsById[activePointId] ?? null;
});

export const activeLineAtom = atom(get => {
  const annotations = get(annotationsAtom);
  const activeLineId = get(activeLineIdAtom);
  if (!activeLineId) return null;
  return annotations.linesById[activeLineId] ?? null;
});

export function makePointColor(index: number): string {
  const hue = (index * 137.508) % 360;
  return `hsl(${hue}, 85%, 55%)`;
}

export function makeLineColor(index: number): string {
  const hue = (index * 137.508 + 68) % 360;
  return `hsl(${hue}, 90%, 48%)`;
}

export function makeObservationKey(imageSetId: string, imageId: string): string {
  return `${imageSetId}:${imageId}`;
}

export function pruneEmptyAnnotations(state: AnnotationState): AnnotationState {
  const pointPositionsByPointId = Object.fromEntries(
    Object.entries(state.pointPositionsByPointId)
      .map(([pointId, byImage]) => [pointId, Object.fromEntries(Object.entries(byImage ?? {}))])
      .filter(([, byImage]) => Object.keys(byImage as Record<string, PointPosition>).length > 0),
  ) as AnnotationState["pointPositionsByPointId"];

  const lineOccurrencesByLineId = Object.fromEntries(
    Object.entries(state.lineOccurrencesByLineId)
      .map(([lineId, byImage]) => [lineId, Object.fromEntries(Object.entries(byImage ?? {}))])
      .filter(([, byImage]) => Object.keys(byImage as Record<string, LineOccurrence>).length > 0),
  ) as AnnotationState["lineOccurrencesByLineId"];

  const pointsById = Object.fromEntries(
    Object.entries(state.pointsById).filter(([pointId]) => Boolean(pointPositionsByPointId[pointId])),
  ) as AnnotationState["pointsById"];

  const linesById = Object.fromEntries(
    Object.entries(state.linesById).filter(([lineId]) => Boolean(lineOccurrencesByLineId[lineId])),
  ) as AnnotationState["linesById"];

  return {
    pointsById,
    pointPositionsByPointId,
    linesById,
    lineOccurrencesByLineId,
  };
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

export function upsertLineOccurrence(state: AnnotationState, occurrence: LineOccurrence): AnnotationState {
  const observationKey = makeObservationKey(occurrence.imageSetId, occurrence.imageId);
  return {
    ...state,
    lineOccurrencesByLineId: {
      ...state.lineOccurrencesByLineId,
      [occurrence.lineId]: {
        ...(state.lineOccurrencesByLineId[occurrence.lineId] ?? {}),
        [observationKey]: occurrence,
      },
    },
  };
}

export function frameHasMarkup(state: AnnotationState, imageSetId: string, imageId: string): boolean {
  const observationKey = makeObservationKey(imageSetId, imageId);
  const hasPoint = Object.values(state.pointPositionsByPointId).some(byImage =>
    Boolean(byImage?.[observationKey]),
  );
  if (hasPoint) return true;
  return Object.values(state.lineOccurrencesByLineId).some(byImage => Boolean(byImage?.[observationKey]));
}
