import { ChangeEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAtom, useAtomValue } from "jotai";
import { fetchProjectImageSets, uploadVideoToProject } from "../api/client";
import {
  selectedFrameByPaneAtom,
  selectedImageSetIdByPaneAtom,
  selectedProjectIdAtom,
  imageSetByPaneAtom,
} from "../state/annotationAtoms";
import type { PaneSide } from "../types/annotations";

type Props = {
  side: PaneSide;
};

export function ImagePreviewList({ side }: Props) {
  const queryClient = useQueryClient();

  const selectedProjectId = useAtomValue(selectedProjectIdAtom);
  const imageSetByPane = useAtomValue(imageSetByPaneAtom);
  const [selectedImageSetIdByPane, setSelectedImageSetIdByPane] = useAtom(
    selectedImageSetIdByPaneAtom,
  );
  const [selectedFrameByPane, setSelectedFrameByPane] = useAtom(selectedFrameByPaneAtom);

  const imageSet = imageSetByPane[side];
  const selectedImageSetId = selectedImageSetIdByPane[side];

  const imageSetsQuery = useQuery({
    queryKey: ["projectImageSets", selectedProjectId],
    queryFn: () => fetchProjectImageSets(selectedProjectId!),
    enabled: selectedProjectId !== null,
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadVideoToProject(selectedProjectId!, file),
    onSuccess: uploadedSet => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["projectImageSets", selectedProjectId] });
      setSelectedImageSetIdByPane(current => ({ ...current, [side]: uploadedSet.id }));
    },
  });

  function onImageSetChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextId = event.target.value || null;
    setSelectedImageSetIdByPane(current => ({ ...current, [side]: nextId }));
    setSelectedFrameByPane(current => ({ ...current, [side]: null }));
  }

  function onVideoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (file && selectedProjectId) {
      uploadMutation.mutate(file);
    }

    event.target.value = "";
  }

  function selectFrame(frameId: string) {
    setSelectedFrameByPane({
      ...selectedFrameByPane,
      [side]: frameId,
    });
  }

  return (
    <aside className="preview-column">
      <div className="image-set-controls">
        <select
          value={selectedImageSetId ?? ""}
          onChange={onImageSetChange}
          disabled={!selectedProjectId || imageSetsQuery.isLoading}
        >
          <option value="" disabled>
            {imageSetsQuery.isLoading ? "Loading image sets..." : "Select image set"}
          </option>

          {(imageSetsQuery.data ?? []).map(set => (
            <option key={set.id} value={set.id}>
              {set.name} ({set.frame_count})
            </option>
          ))}
        </select>

        <label className="upload-button">
          {uploadMutation.isPending ? "Uploading..." : "Upload video"}
          <input
            type="file"
            accept="video/*"
            disabled={!selectedProjectId || uploadMutation.isPending}
            onChange={onVideoUpload}
          />
        </label>

        {uploadMutation.error ? (
          <div className="inline-error">Upload failed: {uploadMutation.error.message}</div>
        ) : null}
      </div>

      <div className="preview-list">
        {(imageSet?.frames ?? []).map(frame => {
          const selected = selectedFrameByPane[side] === frame.id;

          return (
            <button
              key={frame.id}
              className={selected ? "preview-item selected" : "preview-item"}
              onClick={() => selectFrame(frame.id)}
            >
              <img src={frame.url} alt={frame.label} />
              <span>{frame.label}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
