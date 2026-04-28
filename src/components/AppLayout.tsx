import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAtom } from "jotai";
import { fetchImageSets } from "../api/client";
import { selectedImageSetIdByPaneAtom } from "../state/annotationAtoms";
import { Pane } from "./Pane";

export function AppLayout() {
  const [selectedImageSetIdByPane, setSelectedImageSetIdByPane] = useAtom(
    selectedImageSetIdByPaneAtom,
  );

  const imageSetsQuery = useQuery({
    queryKey: ["imageSets"],
    queryFn: fetchImageSets,
  });

  useEffect(() => {
    const first = imageSetsQuery.data?.[0]?.id ?? null;
    const second = imageSetsQuery.data?.[1]?.id ?? first;

    if (!first) return;

    setSelectedImageSetIdByPane(current => ({
      left: current.left ?? first,
      right: current.right ?? second,
    }));
  }, [imageSetsQuery.data, setSelectedImageSetIdByPane]);

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
