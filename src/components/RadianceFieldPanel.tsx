import { useEffect, useMemo, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAtomValue } from "jotai";

import {
  fetchProjectImageSets,
  fetchRadianceField,
  fetchRadianceFieldJobs,
  fetchRadianceFields,
  startRadianceFieldJob,
} from "../api/client";
import { selectedProjectIdAtom } from "../state/annotationAtoms";
import type { RadianceFieldJob } from "../types/radiance";

const DEFAULT_CONFIG = {
  frame_step: 5,
  max_frames: 300,
  downscale_factor: 2,
  method: "splatfacto",
  max_num_iterations: 15000,
};

function percent(job: RadianceFieldJob | null): string {
  if (!job) return "0%";
  return `${Math.round((job.progress ?? 0) * 100)}%`;
}

export function RadianceFieldPanel() {
  const queryClient = useQueryClient();
  const selectedProjectId = useAtomValue(selectedProjectIdAtom);
  const [selectedImageSetId, setSelectedImageSetId] = useState<string>("");
  const [selectedFieldId, setSelectedFieldId] = useState<string>("");
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const imageSetsQuery = useQuery({
    queryKey: ["projectImageSets", selectedProjectId],
    queryFn: () => fetchProjectImageSets(selectedProjectId!),
    enabled: selectedProjectId !== null,
  });

  const fieldsQuery = useQuery({
    queryKey: ["radianceFields", selectedProjectId],
    queryFn: () => fetchRadianceFields(selectedProjectId!),
    enabled: selectedProjectId !== null,
    refetchInterval: activeJobId ? 3000 : false,
  });

  const jobsQuery = useQuery({
    queryKey: ["radianceFieldJobs", selectedProjectId],
    queryFn: () => fetchRadianceFieldJobs(selectedProjectId!),
    enabled: selectedProjectId !== null,
    refetchInterval: activeJobId ? 2000 : false,
  });

  const selectedFieldQuery = useQuery({
    queryKey: ["radianceField", selectedProjectId, selectedFieldId],
    queryFn: () => fetchRadianceField(selectedProjectId!, selectedFieldId),
    enabled: Boolean(selectedProjectId && selectedFieldId),
  });

  const activeJob = useMemo(() => {
    if (!activeJobId) return null;
    return jobsQuery.data?.find(job => job.id === activeJobId) ?? null;
  }, [activeJobId, jobsQuery.data]);

  useEffect(() => {
    const firstImageSetId = imageSetsQuery.data?.[0]?.id;
    if (!selectedImageSetId && firstImageSetId) setSelectedImageSetId(firstImageSetId);
  }, [imageSetsQuery.data, selectedImageSetId]);

  useEffect(() => {
    const firstFieldId = fieldsQuery.data?.[0]?.id;
    if (!selectedFieldId && firstFieldId) setSelectedFieldId(firstFieldId);
  }, [fieldsQuery.data, selectedFieldId]);

  useEffect(() => {
    if (!activeJob) return;
    if (activeJob.status === "succeeded" || activeJob.status === "failed") {
      queryClient.invalidateQueries({ queryKey: ["radianceFields", selectedProjectId] });
      if (activeJob.result_radiance_field_id) setSelectedFieldId(activeJob.result_radiance_field_id);
      setActiveJobId(null);
    }
  }, [activeJob, queryClient, selectedProjectId]);

  const startMutation = useMutation({
    mutationFn: () =>
      startRadianceFieldJob(selectedProjectId!, {
        image_set_id: selectedImageSetId,
        name: `Radiance field ${new Date().toLocaleString()}`,
        config: DEFAULT_CONFIG,
      }),
    onSuccess: job => {
      setActiveJobId(job.id);
      queryClient.invalidateQueries({ queryKey: ["radianceFieldJobs", selectedProjectId] });
    },
  });

  const canStart = Boolean(selectedProjectId && selectedImageSetId && !startMutation.isPending);
  const selectedField = selectedFieldQuery.data;

  return (
    <div className="radiance-panel">
      <div className="radiance-panel-row">
        <label className="toolbar-field">
          Source video / image set
          <select value={selectedImageSetId} onChange={event => setSelectedImageSetId(event.target.value)}>
            <option value="">Select image set</option>
            {(imageSetsQuery.data ?? []).map(imageSet => (
              <option key={imageSet.id} value={imageSet.id}>
                {imageSet.name} ({imageSet.frame_count})
              </option>
            ))}
          </select>
        </label>

        <button type="button" disabled={!canStart} onClick={() => startMutation.mutate()}>
          {startMutation.isPending ? "Starting..." : "Start splat processing"}
        </button>
      </div>

      {activeJob && (
        <div className="radiance-job-status">
          <strong>{activeJob.status}</strong>
          <span>{activeJob.stage ?? "queued"}</span>
          <span>{percent(activeJob)}</span>
          {activeJob.error_message && <span className="radiance-error">{activeJob.error_message}</span>}
        </div>
      )}

      <div className="radiance-panel-row">
        <label className="toolbar-field radiance-field-select">
          Radiance field
          <select value={selectedFieldId} onChange={event => setSelectedFieldId(event.target.value)}>
            <option value="">No field loaded</option>
            {(fieldsQuery.data ?? []).map(field => (
              <option key={field.id} value={field.id}>
                {field.name} [{field.asset_format}]
              </option>
            ))}
          </select>
        </label>
      </div>

      {selectedField && (
        <div className="radiance-loaded-field">
          <span>Loaded: {selectedField.name}</span>
          <span>{selectedField.asset_format.toUpperCase()}</span>
          <a href={selectedField.asset_url} target="_blank" rel="noreferrer">
            Open asset
          </a>
        </div>
      )}

      {startMutation.error instanceof Error && <div className="radiance-error">{startMutation.error.message}</div>}
      {selectedFieldQuery.error instanceof Error && <div className="radiance-error">{selectedFieldQuery.error.message}</div>}
    </div>
  );
}
