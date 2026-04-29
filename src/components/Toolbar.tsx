import { useMemo, useState } from "react";

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

type ColorOption = {
  id: string;
  color: string | null;
  label: string;
};

function fallbackColorFromId(id: string, hueOffset = 0): string {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }

  return `hsl(${(hash + hueOffset) % 360}, 85%, 55%)`;
}

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
        flex: "0 0 auto",
      }}
    />
  );
}

function ColorDropdown({
  label,
  emptyLabel,
  value,
  options,
  onChange,
}: {
  label: string;
  emptyLabel: string;
  value: string | null;
  options: ColorOption[];
  onChange: (value: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = value ? options.find(option => option.id === value) ?? null : null;

  function choose(nextValue: string | null) {
    onChange(nextValue);
    setOpen(false);
  }

  return (
    <div className="toolbar-field" style={{ position: "relative" }}>
      <span>{label}</span>

      <button
        type="button"
        onClick={() => setOpen(current => !current)}
        style={{
          minWidth: 220,
          display: "flex",
          alignItems: "center",
          gap: 8,
          justifyContent: "flex-start",
        }}
      >
        <ColorSwatch color={selected?.color ?? null} />
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selected?.label ?? emptyLabel}</span>
      </button>

      {open && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            zIndex: 50,
            top: "100%",
            left: 0,
            minWidth: 260,
            maxHeight: 260,
            overflowY: "auto",
            padding: 6,
            borderRadius: 8,
            background: "#111827",
            border: "1px solid rgba(255, 255, 255, 0.16)",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.35)",
          }}
        >
          <button
            type="button"
            onClick={() => choose(null)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 8,
              justifyContent: "flex-start",
              marginBottom: 4,
            }}
          >
            <ColorSwatch color={null} />
            {emptyLabel}
          </button>

          {options.map(option => (
            <button
              key={option.id}
              type="button"
              role="option"
              aria-selected={option.id === value}
              onClick={() => choose(option.id)}
              data-active={option.id === value}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 8,
                justifyContent: "flex-start",
                marginTop: 4,
              }}
            >
              <ColorSwatch color={option.color} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
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

  const pointOptions = useMemo(
    () =>
      Object.keys(annotations.pointsById).map(pointId => ({
        id: pointId,
        color: annotations.pointsById[pointId]?.color ?? fallbackColorFromId(pointId, 0),
        label: pointId,
      })),
    [annotations.pointsById],
  );

  const lineOptions = useMemo(() => {
    const ids = new Set<string>([
      ...Object.keys(annotations.linesById),
      ...Object.keys(annotations.lineOccurrencesByLineId),
    ]);

    return [...ids].map(lineId => {
      const firstOccurrence = Object.values(annotations.lineOccurrencesByLineId[lineId] ?? {})[0];
      return {
        id: lineId,
        color: annotations.linesById[lineId]?.color ?? firstOccurrence?.color ?? fallbackColorFromId(lineId, 68),
        label: lineId,
      };
    });
  }, [annotations.linesById, annotations.lineOccurrencesByLineId]);

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

      <ColorDropdown
        label="Active point"
        emptyLabel="Next new point"
        value={activePointId}
        options={pointOptions}
        onChange={setActivePointId}
      />

      <ColorDropdown
        label="Active line"
        emptyLabel="No active line"
        value={activeLineId}
        options={lineOptions}
        onChange={setActiveLineId}
      />

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
