import { useEffect, useMemo } from "react";

import { useQuery } from "@tanstack/react-query";
import { useAtom, useAtomValue } from "jotai";

import { fetchImageSet } from "../api/client";
import {
  annotationsAtom,
  hideFramesWithoutMarkupAtom,
  imageSetAtom,
  selectedFrameIdAtom,
  selectedImageSetIdAtom,
} from "../state/annotationAtoms";
import type { AnnotationState, ImageFrame, ImageSetSummary } from "../types/annotations";

import { FrameCanvas } from "./FrameCanvas";
import { ImagePreviewList } from "./ImagePreviewList";
import { Toolbar } from "./Toolbar";

type Props = {
  imageSetSummaries: ImageSetSummary[];
};

function framesWithAnyMarkup(frames: ImageFrame[], selectedImageSetId: string | null, annotations: AnnotationState) {
  const result = new Set<string>();

  if (!selectedImageSetId) return result;

  const frameIds = new Set(frames.map(frame => frame.id));

  for (const byObservation of Object.values(annotations.pointPositionsByPointId)) {
    for (const position of Object.values(byObservation)) {
      if (position.imageSetId === selectedImageSetId && frameIds.has(position.imageId)) {
        result.add(position.imageId);
      }
    }
  }

  for (const byObservation of Object.values(annotations.lineOccurrencesByLineId)) {
    for (const occurrence of Object.values(byObservation)) {
      if (occurrence.imageSetId === selectedImageSetId && frameIds.has(occurrence.imageId)) {
        result.add(occurrence.imageId);
      }
    }
  }

  return result;
}

export function ImageAnnotationPanel({ imageSetSummaries }: Props) {
  const [selectedImageSetId, setSelectedImageSetId] = useAtom(selectedImageSetIdAtom);
  const [imageSet, setImageSet] = useAtom(imageSetAtom);
  const [selectedFrameId, setSelectedFrameId] = useAtom(selectedFrameIdAtom);

  const annotations = useAtomValue(annotationsAtom);
  const hideFramesWithoutMarkup = useAtomValue(hideFramesWithoutMarkupAtom);

  const imageSetQuery = useQuery({
    queryKey: ["imageSet", selectedImageSetId],
    queryFn: () => fetchImageSet(selectedImageSetId!),
    enabled: selectedImageSetId !== null,
  });

  useEffect(() => {
    const loadedImageSet = imageSetQuery.data ?? null;

    setImageSet(loadedImageSet);

    if (!loadedImageSet) {
      setSelectedFrameId(null);
      return;
    }

    const currentFrameStillExists = loadedImageSet.frames.some(frame => frame.id === selectedFrameId);
    if (!currentFrameStillExists) setSelectedFrameId(loadedImageSet.frames[0]?.id ?? null);
  }, [imageSetQuery.data, selectedFrameId, setImageSet, setSelectedFrameId]);

  const framesWithMarkup = useMemo(() => {
    return framesWithAnyMarkup(imageSet?.frames ?? [], selectedImageSetId, annotations);
  }, [annotations, imageSet?.frames, selectedImageSetId]);

  const visibleFrames = useMemo(() => {
    if (!imageSet) return [];
    if (!hideFramesWithoutMarkup) return imageSet.frames;

    return imageSet.frames.filter(frame => framesWithMarkup.has(frame.id));
  }, [framesWithMarkup, hideFramesWithoutMarkup, imageSet]);

  useEffect(() => {
    if (!imageSet) return;

    if (visibleFrames.length === 0) {
      if (hideFramesWithoutMarkup) setSelectedFrameId(null);
      return;
    }

    const currentFrameIsVisible = visibleFrames.some(frame => frame.id === selectedFrameId);
    if (!currentFrameIsVisible) setSelectedFrameId(visibleFrames[0]?.id ?? null);
  }, [hideFramesWithoutMarkup, imageSet, selectedFrameId, setSelectedFrameId, visibleFrames]);

  const selectedFrame = imageSet?.frames.find(frame => frame.id === selectedFrameId) ?? null;

  return (
    <section className="image-panel panel-card">
      <div className="panel-header">
        <div>
          <h1>Image point selection</h1>
          <p>Select one frame and mark correspondence points.</p>
        </div>

        <label className="toolbar-field">
          Image set
          <select value={selectedImageSetId ?? ""} onChange={event => setSelectedImageSetId(event.target.value || null)}>
            <option value="">Select image set</option>

            {imageSetSummaries.map(summary => (
              <option key={summary.id} value={summary.id}>
                {summary.name} ({summary.frame_count})
              </option>
            ))}
          </select>
        </label>
      </div>

      <Toolbar />

      <div className="image-panel-body">
        {imageSet ? (
          <ImagePreviewList
            frames={visibleFrames}
            selectedFrameId={selectedFrameId}
            framesWithMarkup={framesWithMarkup}
            onSelectFrame={setSelectedFrameId}
          />
        ) : (
          <aside className="preview-list empty-preview">No image set loaded</aside>
        )}

        <div className="editor-region">
          {imageSetQuery.isLoading ? (
            <div className="empty-state">Loading frames...</div>
          ) : selectedFrame ? (
            <FrameCanvas frame={selectedFrame} />
          ) : hideFramesWithoutMarkup && imageSet ? (
            <div className="empty-state">No marked frames</div>
          ) : (
            <div className="empty-state">No frame selected</div>
          )}
        </div>
      </div>
    </section>
  );
}
