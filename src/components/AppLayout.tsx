import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAtom } from "jotai";
import { fetchAnnotations, fetchImageSet, fetchImageSets } from "../api/mockApi";
import {
  annotationsAtom,
  imageSetAtom,
  selectedFrameByPaneAtom,
  selectedImageSetIdAtom,
} from "../state/annotationAtoms";
import { Pane } from "./Pane";

export function AppLayout() {
  const [selectedImageSetId] = useAtom(selectedImageSetIdAtom);
  const [, setImageSet] = useAtom(imageSetAtom);
  const [, setAnnotations] = useAtom(annotationsAtom);
  const [, setSelectedFrameByPane] = useAtom(selectedFrameByPaneAtom);

  useQuery({
    queryKey: ["imageSets"],
    queryFn: fetchImageSets,
  });

  const imageSetQuery = useQuery({
    queryKey: ["imageSet", selectedImageSetId],
    queryFn: () => fetchImageSet(selectedImageSetId),
  });

  const annotationQuery = useQuery({
    queryKey: ["annotations", selectedImageSetId],
    queryFn: () => fetchAnnotations(selectedImageSetId),
  });

  useEffect(() => {
    if (!imageSetQuery.data) return;

    setImageSet(imageSetQuery.data);

    const firstFrameId = imageSetQuery.data.frames[0]?.id ?? null;
    setSelectedFrameByPane({
      left: firstFrameId,
      right: firstFrameId,
    });
  }, [imageSetQuery.data, setImageSet, setSelectedFrameByPane]);

  useEffect(() => {
    if (annotationQuery.data) {
      setAnnotations(annotationQuery.data);
    }
  }, [annotationQuery.data, setAnnotations]);

  return (
    <main className="app-shell">
      <Pane side="left" />
      <Pane side="right" />
    </main>
  );
}
