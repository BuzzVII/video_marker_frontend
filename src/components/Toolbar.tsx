import { ChangeEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAtom, useAtomValue } from "jotai";
import { saveAnnotations } from "../api/client";
import {
  activePointIdAtom,
  annotationsAtom,
  selectedImageSetIdByPaneAtom,
  toolModeAtom,
} from "../state/annotationAtoms";
import type { ToolMode } from "../types/annotations";

const tools: Array<{ id: ToolMode; label: string }> = [
  { id: "new-point", label: "New point" },
  { id: "move-point", label: "Move point" },
  { id: "delete-point", label: "Delete point" },
  { id: "join-points", label: "Join points" },
];

export function Toolbar() {
  const queryClient = useQueryClient();

  const [toolMode, setToolMode] = useAtom(toolModeAtom);
  const [activePointId, setActivePointId] = useAtom(activePointIdAtom);
  const annotations = useAtomValue(annotationsAtom);
  const selectedImageSetIdByPane = useAtomValue(selectedImageSetIdByPaneAtom);

  const pointOptions = Object.values(annotations.pointsById);

  const selectedImageSetIds = Array.from(
    new Set(
      Object.values(selectedImageSetIdByPane).filter(
        (id): id is string => id !== null,
      ),
    ),
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      const results = await Promise.all(
        selectedImageSetIds.map(imageSetId =>
          saveAnnotations(imageSetId, annotations),
        ),
      );

      return results;
    },
    onSuccess: savedDocuments => {
      for (let i = 0; i < selectedImageSetIds.length; i += 1) {
        queryClient.setQueryData(
          ["annotations", selectedImageSetIds[i]],
          savedDocuments[i],
        );
      }
    },
  });

  function onActivePointChange(event: ChangeEvent<HTMLSelectElement>) {
    setActivePointId(event.target.value || null);
  }

  return (
    <div className="toolbar">
      {tools.map(tool => (
        <button
          key={tool.id}
          className={toolMode === tool.id ? "tool active" : "tool"}
          onClick={() => setToolMode(tool.id)}
        >
          {tool.label}
        </button>
      ))}

      <label className="active-point-select">
        <span>active point</span>
        <select value={activePointId ?? ""} onChange={onActivePointChange}>
          <option value="">none</option>

          {pointOptions.map(point => (
            <option key={point.id} value={point.id}>
              {point.id}
            </option>
          ))}
        </select>

        <span
          className="active-point-swatch"
          style={{
            background:
              activePointId && annotations.pointsById[activePointId]
                ? annotations.pointsById[activePointId].color
                : "transparent",
          }}
        />
      </label>

      <button
        className="tool save"
        disabled={selectedImageSetIds.length === 0 || saveMutation.isPending}
        onClick={() => saveMutation.mutate()}
      >
        {saveMutation.isPending ? "Saving..." : "Save points"}
      </button>
    </div>
  );
}
