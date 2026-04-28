import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAtom } from "jotai";
import {
  fetchAnnotations,
  fetchImageSet,
  fetchImageSets,
} from "../api/client";
import {
  annotationsAtom,
  emptyAnnotations,
  imageSetAtom,
  selectedFrameByPaneAtom,
  selectedImageSetIdAtom,
} from "../state/annotationAtoms";
import { Pane } from "./Pane";

export function AppLayout() {
  const [selectedImageSetId, setSelectedImageSetId] = useAtom(selectedImageSetIdAtom);
  const [, setImageSet] = useAtom(imageSetAtom);
  const [, setAnnotations] = useAtom(annotationsAtom);
  const [, setSelectedFrameByPane] = useAtom(selectedFrameByPaneAtom);

  const imageSetsQuery = useQuery({
    queryKey: ["imageSets"],
    queryFn: fetchImageSets,
  });

  useEffect(() => {
    if (selectedImageSetId) return;

    const firstImageSet = imageSetsQuery.data?.[0];
    if (firstImageSet) {
      setSelectedImageSetId(firstImageSet.id);
    }
  }, [imageSetsQuery.data, selectedImageSetId, setSelectedImageSetId]);

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

  useEffect(() => {
    if (!imageSetQuery.data) {
      setImageSet(null);
      setSelectedFrameByPane({ left: null, right: null });
      return;
    }

    setImageSet(imageSetQuery.data);

    const firstFrameId = imageSetQuery.data.frames[0]?.id ?? null;
    setSelectedFrameByPane({
      left: firstFrameId,
      right: firstFrameId,
    });
  }, [imageSetQuery.data, setImageSet, setSelectedFrameByPane]);

  useEffect(() => {
    setAnnotations(annotationQuery.data ?? structuredClone(emptyAnnotations));
  }, [annotationQuery.data, setAnnotations]);

  if (imageSetsQuery.isLoading) {
    return <main className="status-screen">Loading image sets...</main>;
  }

  if (imageSetsQuery.error) {
    return (
      <main className="status-screen">
        Failed to load image sets: {imageSetsQuery.error.message}
      </main>
    );
  }

  return (
    <main className="app-shell">
      <Pane side="left" />
      <Pane side="right" />
    </main>
  );
}
