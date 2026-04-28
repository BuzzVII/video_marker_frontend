import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAtom, useAtomValue } from "jotai";
import { saveAnnotations } from "../api/client";
import {
  activePointAtom,
  annotationsAtom,
  selectedProjectIdAtom,
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
  const annotations = useAtomValue(annotationsAtom);
  const selectedProjectId = useAtomValue(selectedProjectIdAtom);
  const activePoint = useAtomValue(activePointAtom);

  const saveMutation = useMutation({
    mutationFn: () => saveAnnotations(selectedProjectId!, annotations),
    onSuccess: saved => {
      queryClient.setQueryData(["annotations", selectedProjectId], saved);
    },
  });

  return (
    <div className="toolbar">
      {tools.map(tool => (
        <button
          key={tool.id}
          className={toolMode === tool.id ? "tool active" : "tool"}
          type="button"
          onClick={() => setToolMode(tool.id)}
        >
          {tool.label}
        </button>
      ))}

      <button
        className="tool save"
        type="button"
        disabled={!selectedProjectId || saveMutation.isPending}
        onClick={() => saveMutation.mutate()}
      >
        {saveMutation.isPending ? "Saving..." : "Save points"}
      </button>

      <div className="active-point">
        <span>active point</span>
        <span
          className="active-point-swatch"
          style={{ background: activePoint?.color ?? "transparent" }}
        />
        <span>{activePoint?.id ?? "none"}</span>
      </div>

      {saveMutation.error ? (
        <div className="inline-error">Save failed: {saveMutation.error.message}</div>
      ) : null}
    </div>
  );
}
