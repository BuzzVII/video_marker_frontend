import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAtom, useAtomValue } from "jotai";
import { fetchAnnotations, fetchLatestModel, fetchProjectImageSets, fetchProjects } from "../api/client";
import { annotationsAtom, emptyAnnotations, imageSetAtom, selectedFrameIdAtom, selectedImageSetIdAtom, selectedProjectIdAtom } from "../state/annotationAtoms";
import { makeEmptyModel, newestModelAtom } from "../state/modelAtoms";
import { ImageAnnotationPanel } from "./ImageAnnotationPanel";
import { ReconstructionModelView } from "./ReconstructionModelView";
import { TopNav } from "./TopNav";

export function AppLayout() {
  const [selectedProjectId, setSelectedProjectId] = useAtom(selectedProjectIdAtom);
  const selectedProjectIdValue = useAtomValue(selectedProjectIdAtom);
  const [, setSelectedImageSetId] = useAtom(selectedImageSetIdAtom);
  const [, setImageSet] = useAtom(imageSetAtom);
  const [, setSelectedFrameId] = useAtom(selectedFrameIdAtom);
  const [, setAnnotations] = useAtom(annotationsAtom);
  const [, setNewestModel] = useAtom(newestModelAtom);

  const projectsQuery = useQuery({ queryKey: ["projects"], queryFn: fetchProjects });

  useEffect(() => {
    if (selectedProjectId) return;
    const firstProjectId = projectsQuery.data?.[0]?.id;
    if (firstProjectId) setSelectedProjectId(firstProjectId);
  }, [projectsQuery.data, selectedProjectId, setSelectedProjectId]);

  const imageSetsQuery = useQuery({
    queryKey: ["projectImageSets", selectedProjectIdValue],
    queryFn: () => fetchProjectImageSets(selectedProjectIdValue!),
    enabled: selectedProjectIdValue !== null,
  });

  const annotationQuery = useQuery({
    queryKey: ["annotations", selectedProjectIdValue],
    queryFn: () => fetchAnnotations(selectedProjectIdValue!),
    enabled: selectedProjectIdValue !== null,
  });

  const modelQuery = useQuery({
    queryKey: ["latestModel", selectedProjectIdValue],
    queryFn: () => fetchLatestModel(selectedProjectIdValue!),
    enabled: selectedProjectIdValue !== null,
    retry: false,
  });

  useEffect(() => {
    setAnnotations(annotationQuery.data ?? structuredClone(emptyAnnotations));
  }, [annotationQuery.data, setAnnotations]);

  useEffect(() => {
    setSelectedImageSetId(null);
    setSelectedFrameId(null);
    setImageSet(null);
  }, [selectedProjectIdValue, setImageSet, setSelectedFrameId, setSelectedImageSetId]);

  useEffect(() => {
    const first = imageSetsQuery.data?.[0]?.id ?? null;
    if (first) setSelectedImageSetId(current => current ?? first);
  }, [imageSetsQuery.data, setSelectedImageSetId]);

  useEffect(() => {
    if (!selectedProjectIdValue) {
      setNewestModel(null);
      return;
    }
    setNewestModel(modelQuery.data ?? makeEmptyModel(selectedProjectIdValue));
  }, [modelQuery.data, selectedProjectIdValue, setNewestModel]);

  return (
    <div className="app-root">
      <TopNav projects={projectsQuery.data ?? []} />

      {!selectedProjectIdValue ? (
        <div className="empty-state">Select a project or create a new one to start marking correspondences.</div>
      ) : projectsQuery.error ? (
        <div className="error-state">Failed to load projects: {projectsQuery.error.message}</div>
      ) : annotationQuery.error ? (
        <div className="error-state">Failed to load annotations: {annotationQuery.error.message}</div>
      ) : (
        <main className="split-workspace">
          <ImageAnnotationPanel imageSetSummaries={imageSetsQuery.data ?? []} />
          <ReconstructionModelView />
        </main>
      )}
    </div>
  );
}
