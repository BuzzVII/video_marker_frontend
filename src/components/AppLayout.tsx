import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAtom, useAtomValue } from "jotai";
import { fetchAnnotations, fetchProjectImageSets, fetchProjects } from "../api/client";
import {
  annotationsAtom,
  emptyAnnotations,
  imageSetByPaneAtom,
  selectedFrameByPaneAtom,
  selectedImageSetIdByPaneAtom,
  selectedProjectIdAtom,
} from "../state/annotationAtoms";
import { Pane } from "./Pane";
import { TopNav } from "./TopNav";

export function AppLayout() {
  const [selectedProjectId, setSelectedProjectId] = useAtom(selectedProjectIdAtom);
  const [, setSelectedImageSetIdByPane] = useAtom(selectedImageSetIdByPaneAtom);
  const [, setImageSetByPane] = useAtom(imageSetByPaneAtom);
  const [, setSelectedFrameByPane] = useAtom(selectedFrameByPaneAtom);
  const [, setAnnotations] = useAtom(annotationsAtom);

  const selectedProjectIdValue = useAtomValue(selectedProjectIdAtom);

  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: fetchProjects,
  });

  useEffect(() => {
    if (selectedProjectId) return;

    const firstProjectId = projectsQuery.data?.[0]?.id;
    if (firstProjectId) {
      setSelectedProjectId(firstProjectId);
    }
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

  useEffect(() => {
    setAnnotations(annotationQuery.data ?? structuredClone(emptyAnnotations));
  }, [annotationQuery.data, setAnnotations]);

  useEffect(() => {
    setSelectedImageSetIdByPane({ left: null, right: null });
    setSelectedFrameByPane({ left: null, right: null });
    setImageSetByPane({ left: null, right: null });
  }, [selectedProjectIdValue, setImageSetByPane, setSelectedFrameByPane, setSelectedImageSetIdByPane]);

  useEffect(() => {
    const first = imageSetsQuery.data?.[0]?.id ?? null;
    const second = imageSetsQuery.data?.[1]?.id ?? first;

    if (!first) return;

    setSelectedImageSetIdByPane(current => ({
      left: current.left ?? first,
      right: current.right ?? second,
    }));
  }, [imageSetsQuery.data, setSelectedImageSetIdByPane]);

  return (
    <div className="app-root">
      <TopNav />

      {!selectedProjectIdValue ? (
        <main className="status-screen">
          Select a project or create a new one to start marking correspondences.
        </main>
      ) : projectsQuery.error ? (
        <main className="status-screen">
          Failed to load projects: {projectsQuery.error.message}
        </main>
      ) : annotationQuery.error ? (
        <main className="status-screen">
          Failed to load annotations: {annotationQuery.error.message}
        </main>
      ) : (
        <main className="app-shell">
          <Pane side="left" />
          <Pane side="right" />
        </main>
      )}
    </div>
  );
}
