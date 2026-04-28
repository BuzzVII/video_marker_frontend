import { ChangeEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAtom } from "jotai";
import { fetchImageSets, uploadVideo } from "../api/client";
import {
  imageSetByPaneAtom,
  selectedFrameByPaneAtom,
  selectedImageSetIdByPaneAtom,
} from "../state/annotationAtoms";
import type { PaneSide } from "../types/annotations";

type Props = {
  side: PaneSide;
};

export function ImagePreviewList({ side }: Props) {
  const queryClient = useQueryClient();

  const [imageSetByPane] = useAtom(imageSetByPaneAtom);
  const [selectedImageSetIdByPane, setSelectedImageSetIdByPane] = useAtom(
    selectedImageSetIdByPaneAtom,
  );
  const [selectedFrameByPane, setSelectedFrameByPane] = useAtom(
    selectedFrameByPaneAtom,
  );

  const imageSet = imageSetByPane[side];
  const selectedImageSetId = selectedImageSetIdByPane[side];

  const imageSetsQuery = useQuery({
    queryKey: ["imageSets"],
    queryFn: fetchImageSets,
  });

  const uploadMutation = useMutation({
    mutationFn: uploadVideo,
    onSuccess: uploadedSet => {
      queryClient.invalidateQueries({ queryKey: ["imageSets"] });

      setSelectedImageSetIdByPane(current => ({
        ...current,
        [side]: uploadedSet.id,
      }));
    },
  });

  function onImageSetChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextId = event.target.value || null;

    setSelectedImageSetIdByPane(current => ({
      ...current,
      [side]: nextId,
    }));
  }

  function onVideoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (file) {
      uploadMutation.mutate(file);
    }

    event.target.value = "";
  }

  function selectFrame(frameId: string) {
    setSelectedFrameByPane(current => ({
      ...current,
      [side]: frameId,
    }));
  }

  return (
    <aside className="preview-column">
      <div className="image-set-controls">
        <select value={selectedImageSetId ?? ""} onChange={onImageSetChange}>
          <option value="" disabled>
            Select image set
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
            disabled={uploadMutation.isPending}
            onChange={onVideoUpload}
          />
        </label>

        {uploadMutation.error ? (
          <div className="inline-error">
            Upload failed: {uploadMutation.error.message}
          </div>
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
