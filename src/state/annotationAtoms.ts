import { atom } from "jotai";
import type {
  AnnotationState,
  ImageSet,
  PointPosition,
  ToolMode,
} from "../types/annotations";
import { emptyAnnotations } from "../api/mockData";

export const selectedImageSetIdAtom = atom<string>("set-a");

export const imageSetAtom = atom<ImageSet | null>(null);

export const annotationsAtom = atom<AnnotationState>(
  structuredClone(emptyAnnotations),
);

export const toolModeAtom = atom<ToolMode>("new-point");

export const activePointIdAtom = atom<string | null>(null);

export const activeLinePointStartAtom = atom<string | null>(null);

export const selectedFrameByPaneAtom = atom<Record<"left" | "right", string | null>>({
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
