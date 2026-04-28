import { ChangeEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAtom } from "jotai";
import { fetchImageSets, uploadVideo } from "../api/mockApi";
import {
  imageSetAtom,
  selectedFrameByPaneAtom,
  selectedImageSetIdAtom,
} from "../state/annotationAtoms";
import type { PaneSide } from "../types/annotations";

type Props = {
  side: PaneSide;
};

export function ImagePreviewList({ side }: Props) {
  const queryClient = useQueryClient();

  const [imageSet] = useAtom(imageSetAtom);
  const [selectedImageSetId, setSelectedImageSetId] = useAtom(selectedImageSetIdAtom);
  const [selectedFrameByPane, setSelectedFrameByPane] = useAtom(selectedFrameByPaneAtom);

  const imageSets = queryClient.getQueryData<Awaited<ReturnType<typeof fetchImageSets>>>([
    "imageSets",
  ]);

  const uploadMutation = useMutation({
    mutationFn: uploadVideo,
    onSuccess: uploadedSet => {
      queryClient.invalidateQueries({ queryKey: ["imageSets"] });
      setSelectedImageSetId(uploadedSet.id);
    },
  });

  function onImageSetChange(event: ChangeEvent<HTMLSelectElement>) {
    setSelectedImageSetId(event.target.value);
  }

  function onVideoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
    }
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
        <select value={selectedImageSetId} onChange={onImageSetChange}>
          {(imageSets ?? []).map(set => (
            <option key={set.id} value={set.id}>
              {set.name}
            </option>
          ))}
        </select>

        <label className="upload-button">
          Upload video
          <input type="file" accept="video/*" onChange={onVideoUpload} />
        </label>
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
