import { useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAtom, useAtomValue } from "jotai";
import { saveAnnotations, saveModel, uploadVideoToProject } from "../api/client";
import {
  activeLineIdAtom,
  activePointIdAtom,
  annotationsAtom,
  hideFramesWithoutMarkupAtom,
  pruneEmptyAnnotations,
  selectedProjectIdAtom,
  toolModeAtom,
} from "../state/annotationAtoms";
import { newestModelAtom } from "../state/modelAtoms";

type ColorOption = { id: string; color: string | null; label: string };

function fallbackColorFromId(id: string, hueOffset = 0): string {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }
  return `hsl(${(hash + hueOffset) % 360}, 85%, 55%)`;
}

function ActiveSelect({
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
  const selected = value ? options.find(option => option.id === value) ?? null : null;

  return (
    <label className="toolbar-field">
      {label}
      <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
        <span
          aria-hidden="true"
          style={{
            width: "0.8rem",
            height: "0.8rem",
            borderRadius: "999px",
            border: "1px solid #c9d3e1",
            background: selected?.color ?? "transparent",
            flex: "0 0 auto",
          }}
        />
        <select value={value ?? ""} onChange={event => onChange(event.target.value || null)}>
          <option value="">{emptyLabel}</option>
          {options.map(option => (
            <option key={option.id} value={option.id} style={{ color: option.color ?? undefined }}>
              {`● ${option.label}`}
            </option>
          ))}
        </select>
      </span>
    </label>
  );
}

export function Toolbar() {
  const queryClient = useQueryClient();
  const selectedProjectId = useAtomValue(selectedProjectIdAtom);
  const [annotations, setAnnotations] = useAtom(annotationsAtom);
  const [model, setModel] = useAtom(newestModelAtom);
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
    const ids = new Set([
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
    mutationFn: async () => {
      if (!selectedProjectId) throw new Error("No project selected");
      const cleanedAnnotations = pruneEmptyAnnotations(annotations);
      const savedAnnotations = await saveAnnotations(selectedProjectId, cleanedAnnotations);
      const savedModel = model ? await saveModel(selectedProjectId, model) : null;
      return { savedAnnotations, savedModel };
    },
    onSuccess: ({ savedAnnotations, savedModel }) => {
      setAnnotations(savedAnnotations);
      if (savedModel) setModel(savedModel);
      queryClient.setQueryData(["annotations", selectedProjectId], savedAnnotations);
      queryClient.invalidateQueries({ queryKey: ["annotations", selectedProjectId] });
      queryClient.invalidateQueries({ queryKey: ["latestModel", selectedProjectId] });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadVideoToProject(selectedProjectId!, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projectImageSets", selectedProjectId] }),
  });

  return (
    <div className="toolbar">
      <div className="toolbar-group" style={{ flexBasis: "100%" }}>
        <label className="upload-button">
          Upload video
          <input
            type="file"
            accept="video/*"
            hidden
            disabled={!selectedProjectId || uploadMutation.isPending}
            onChange={event => {
              const file = event.target.files?.[0];
              if (file) uploadMutation.mutate(file);
              event.currentTarget.value = "";
            }}
          />
        </label>

        <button type="button" onClick={() => setHideFramesWithoutMarkup(value => !value)}>
          {hideFramesWithoutMarkup ? "Show all frames" : "Hide unmarked frames"}
        </button>

        <button type="button" disabled={!selectedProjectId || saveMutation.isPending} onClick={() => saveMutation.mutate()}>
          {saveMutation.isPending ? "Saving..." : "Save"}
        </button>
      </div>

      <div className="toolbar-group" style={{ flexBasis: "100%" }}>
        <button data-active={toolMode === "new-point"} type="button" onClick={() => setToolMode("new-point")}>
          New point
        </button>
        <button data-active={toolMode === "delete-point"} type="button" onClick={() => setToolMode("delete-point")}>
          Delete point
        </button>
        <ActiveSelect
          label="Active point"
          emptyLabel="Next new point"
          value={activePointId}
          options={pointOptions}
          onChange={value => {
            setActivePointId(value);
            if (value) setActiveLineId(null);
          }}
        />
      </div>

      <div className="toolbar-group" style={{ flexBasis: "100%" }}>
        <button data-active={toolMode === "new-line"} type="button" onClick={() => setToolMode("new-line")}>
          New line
        </button>
        <button data-active={toolMode === "delete-line"} type="button" onClick={() => setToolMode("delete-line")}>
          Delete line
        </button>
        <ActiveSelect
          label="Active line"
          emptyLabel="Next new line"
          value={activeLineId}
          options={lineOptions}
          onChange={value => {
            setActiveLineId(value);
            if (value) setActivePointId(null);
          }}
        />
      </div>

      {saveMutation.error ? <div className="inline-error">Save failed: {saveMutation.error.message}</div> : null}
    </div>
  );
}
