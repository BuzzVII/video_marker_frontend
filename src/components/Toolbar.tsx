import { useMemo } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAtom, useAtomValue } from "jotai";

import { saveAnnotations, uploadVideoToProject } from "../api/client";
import {
  activeLineIdAtom,
  activePointIdAtom,
  annotationsAtom,
  hideFramesWithoutMarkupAtom,
  selectedProjectIdAtom,
  toolModeAtom,
} from "../state/annotationAtoms";

function ColorSwatch({ color }: { color: string | null }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        width: 12,
        height: 12,
        borderRadius: "50%",
        background: color ?? "transparent",
        border: color ? "1px solid rgba(255, 255, 255, 0.5)" : "1px dashed rgba(255, 255, 255, 0.35)",
        marginLeft: 8,
        verticalAlign: "middle",
      }}
    />
  );
}

export function Toolbar() {
  const queryClient = useQueryClient();

  const selectedProjectId = useAtomValue(selectedProjectIdAtom);
  const [annotations] = useAtom(annotationsAtom);

  const [toolMode, setToolMode] = useAtom(toolModeAtom);
  const [activePointId, setActivePointId] = useAtom(activePointIdAtom);
  const [activeLineId, setActiveLineId] = useAtom(activeLineIdAtom);
  const [hideFramesWithoutMarkup, setHideFramesWithoutMarkup] = useAtom(hideFramesWithoutMarkupAtom);

  const pointIds = useMemo(() => Object.keys(annotations.pointsById), [annotations.pointsById]);
  const lineIds = useMemo(() => Object.keys(annotations.linesById), [annotations.linesById]);

  const activePointColor = activePointId ? annotations.pointsById[activePointId]?.color ?? null : null;
  const activeLineColor = activeLineId ? annotations.linesById[activeLineId]?.color ?? null : null;

  const saveMutation = useMutation({
    mutationFn: () => saveAnnotations(selectedProjectId!, annotations),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["annotations", selectedProjectId] }),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadVideoToProject(selectedProjectId!, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projectImageSets", selectedProjectId] }),
  });

  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <button data-active={toolMode === "new-point"} onClick={() => setToolMode("new-point")}>
          New point
        </button>
        <button data-active={toolMode === "move-point"} onClick={() => setToolMode("move-point")}>
          Move point
        </button>
        <button data-active={toolMode === "delete-point"} onClick={() => setToolMode("delete-point")}>
          Delete point
        </button>
        <button data-active={toolMode === "join-points"} onClick={() => setToolMode("join-points")}>
          Join points
        </button>
        <button data-active={toolMode === "new-line"} onClick={() => setToolMode("new-line")}>
          New line
        </button>
        <button data-active={toolMode === "move-line"} onClick={() => setToolMode("move-line")}>
          Move line
        </button>
        <button data-active={toolMode === "delete-line"} onClick={() => setToolMode("delete-line")}>
          Delete line
        </button>
      </div>

      <label className="toolbar-field">
        <span>
          Active point
          <ColorSwatch color={activePointColor} />
        </span>
        <select value={activePointId ?? ""} onChange={event => setActivePointId(event.target.value || null)}>
          <option value="">Next new point</option>

          {pointIds.map(pointId => (
            <option key={pointId} value={pointId} style={{ color: annotations.pointsById[pointId]?.color ?? undefined }}>
              {`● ${pointId}`}
            </option>
          ))}
        </select>
      </label>

      <label className="toolbar-field">
        <span>
          Active line
          <ColorSwatch color={activeLineColor} />
        </span>
        <select value={activeLineId ?? ""} onChange={event => setActiveLineId(event.target.value || null)}>
          <option value="">No active line</option>

          {lineIds.map(lineId => (
            <option key={lineId} value={lineId} style={{ color: annotations.linesById[lineId]?.color ?? undefined }}>
              {`● ${lineId}`}
            </option>
          ))}
        </select>
      </label>

      <button type="button" data-active={hideFramesWithoutMarkup} onClick={() => setHideFramesWithoutMarkup(value => !value)}>
        {hideFramesWithoutMarkup ? "Show all frames" : "Hide unmarked frames"}
      </button>

      <label className="upload-button">
        Upload video
        <input
          type="file"
          accept="video/*"
          hidden
          disabled={!selectedProjectId}
          onChange={event => {
            const file = event.target.files?.[0];
            if (file) uploadMutation.mutate(file);
            event.currentTarget.value = "";
          }}
        />
      </label>

      <button disabled={!selectedProjectId || saveMutation.isPending} onClick={() => saveMutation.mutate()}>
        Save annotations
      </button>
    </div>
  );
}
