import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAtom, useAtomValue } from "jotai";
import { fetchAnnotations, fetchImageSet } from "../api/client";
import {
  annotationsAtom,
  emptyAnnotations,
  imageSetByPaneAtom,
  mergeAnnotations,
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
  const selectedImageSetId = selectedImageSetIdByPane[side];

  const [imageSetByPane, setImageSetByPane] = useAtom(imageSetByPaneAtom);
  const [, setAnnotations] = useAtom(annotationsAtom);
  const [selectedFrameByPane, setSelectedFrameByPane] = useAtom(
    selectedFrameByPaneAtom,
  );

  const imageSetQuery = useQuery({
    queryKey: ["imageSet", selectedImageSetId],
    queryFn: () => fetchImageSet(selectedImageSetId!),
    enabled: selectedImageSetId !== null,
  });

  const annotationQuery = useQuery({
    queryKey: ["annotations", selectedImageSetId],
    queryFn: () => fetchAnnotations(selectedImageSetId!),
    enabled: selectedImageSetId !== null,
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    setImageSetByPane(current => ({
      ...current,
      [side]: imageSetQuery.data ?? null,
    }));

    const firstFrameId = imageSetQuery.data?.frames[0]?.id ?? null;

    setSelectedFrameByPane(current => ({
      ...current,
      [side]: firstFrameId,
    }));
  }, [imageSetQuery.data, side, setImageSetByPane, setSelectedFrameByPane]);

  useEffect(() => {
    const leftId = selectedImageSetIdByPane.left;
    const rightId = selectedImageSetIdByPane.right;
  
    const left = leftId
      ? queryClient.getQueryData(["annotations", leftId])
      : undefined;
  
    const right = rightId
      ? queryClient.getQueryData(["annotations", rightId])
      : undefined;
  
    setAnnotations(
      mergeAnnotations([
        (left as typeof emptyAnnotations | undefined) ?? emptyAnnotations,
        (right as typeof emptyAnnotations | undefined) ?? emptyAnnotations,
      ]),
    );
  }, [
    annotationQuery.data,
    queryClient,
    selectedImageSetIdByPane.left,
    selectedImageSetIdByPane.right,
    setAnnotations,
  ]);

  const imageSet = imageSetByPane[side];
  const selectedFrameId = selectedFrameByPane[side];
  const selectedFrame =
    imageSet?.frames.find(frame => frame.id === selectedFrameId) ?? null;

  const preview = <ImagePreviewList side={side} />;

  const editor = (
    <section className="editor-column">
      <Toolbar />
      {selectedFrame ? (
        <FrameCanvas side={side} frame={selectedFrame} />
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
