import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAtom, useAtomValue } from "jotai";
import { fetchImageSet } from "../api/client";
import {
  imageSetByPaneAtom,
  selectedFrameByPaneAtom,
  selectedImageSetIdByPaneAtom,
} from "../state/annotationAtoms";
import type { PaneSide } from "../types/annotations";
import { FrameCanvas } from "./FrameCanvas";
import { ImagePreviewList } from "./ImagePreviewList";
import { Toolbar } from "./Toolbar";

type Props = {
  side: PaneSide;
};

export function Pane({ side }: Props) {
  const selectedImageSetIdByPane = useAtomValue(selectedImageSetIdByPaneAtom);
  const [imageSetByPane, setImageSetByPane] = useAtom(imageSetByPaneAtom);
  const [selectedFrameByPane, setSelectedFrameByPane] = useAtom(selectedFrameByPaneAtom);

  const selectedImageSetId = selectedImageSetIdByPane[side];

  const imageSetQuery = useQuery({
    queryKey: ["imageSet", selectedImageSetId],
    queryFn: () => fetchImageSet(selectedImageSetId!),
    enabled: selectedImageSetId !== null,
  });

  useEffect(() => {
    const imageSet = imageSetQuery.data ?? null;

    setImageSetByPane(current => ({
      ...current,
      [side]: imageSet,
    }));

    if (!imageSet) {
      setSelectedFrameByPane(current => ({ ...current, [side]: null }));
      return;
    }

    const currentFrameId = selectedFrameByPane[side];
    const currentFrameStillExists = imageSet.frames.some(frame => frame.id === currentFrameId);

    if (!currentFrameStillExists) {
      setSelectedFrameByPane(current => ({
        ...current,
        [side]: imageSet.frames[0]?.id ?? null,
      }));
    }
  }, [imageSetQuery.data, selectedFrameByPane, setImageSetByPane, setSelectedFrameByPane, side]);

  const imageSet = imageSetByPane[side];
  const selectedFrameId = selectedFrameByPane[side];
  const selectedFrame = imageSet?.frames.find(frame => frame.id === selectedFrameId) ?? null;

  const preview = <ImagePreviewList side={side} />;
  const editor = (
    <section className="editor-column">
      <Toolbar />
      {imageSetQuery.isLoading ? (
        <div className="empty-frame">Loading frames...</div>
      ) : selectedFrame && imageSet ? (
        <FrameCanvas side={side} imageSetId={imageSet.id} frame={selectedFrame} />
      ) : (
        <div className="empty-frame">No frame selected</div>
      )}
    </section>
  );

  return (
    <section className="pane">
      <div className={side === "left" ? "pane-layout" : "pane-layout mirrored"}>
        {preview}
        {editor}
      </div>
    </section>
  );
}
