import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAtom, useAtomValue } from "jotai";
import { fetchImageSet } from "../api/client";
import { annotationsAtom, imageSetAtom, makeObservationKey, selectedFrameIdAtom, selectedImageSetIdAtom } from "../state/annotationAtoms";
import type { ImageSetSummary } from "../types/annotations";
import { FrameCanvas } from "./FrameCanvas";
import { ImagePreviewList } from "./ImagePreviewList";
import { Toolbar } from "./Toolbar";

type Props = {
  imageSetSummaries: ImageSetSummary[];
};

export function ImageAnnotationPanel({ imageSetSummaries }: Props) {
  const [selectedImageSetId, setSelectedImageSetId] = useAtom(selectedImageSetIdAtom);
  const [imageSet, setImageSet] = useAtom(imageSetAtom);
  const [selectedFrameId, setSelectedFrameId] = useAtom(selectedFrameIdAtom);
  const annotations = useAtomValue(annotationsAtom);

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

  const selectedFrame = imageSet?.frames.find(frame => frame.id === selectedFrameId) ?? null;

  const framesWithPoints = useMemo(() => {
    const result = new Set<string>();
    if (!selectedImageSetId) return result;
    for (const byObservation of Object.values(annotations.pointPositionsByPointId)) {
      for (const position of Object.values(byObservation)) {
        if (position.imageSetId === selectedImageSetId) result.add(position.imageId);
      }
    }
    return result;
  }, [annotations.pointPositionsByPointId, selectedImageSetId]);

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
            frames={imageSet.frames}
            selectedFrameId={selectedFrameId}
            framesWithPoints={framesWithPoints}
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
          ) : (
            <div className="empty-state">No frame selected</div>
          )}
        </div>
      </div>
    </section>
  );
}
