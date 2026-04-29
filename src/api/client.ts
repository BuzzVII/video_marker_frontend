import { API_ENDPOINTS, apiUrl } from "./endpoints.js";
import type { AnnotationState, ImageSet, ImageSetSummary, ProjectSummary } from "../types/annotations";
import type { EdgeLengthConstraint, ReconstructionModel } from "../types/reconstruction";
import { normalizeReconstructionModel } from "../utils/reconstructionModel";

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = await response.json();
      detail = body.detail ?? JSON.stringify(body);
    } catch {
      // Keep the status text.
    }
    throw new Error(`${response.status} ${detail}`);
  }

  return response.json() as Promise<T>;
}

export async function fetchHealth(): Promise<{ ok: boolean }> {
  return requestJson(API_ENDPOINTS.health);
}

export async function fetchProjects(): Promise<ProjectSummary[]> {
  return requestJson(API_ENDPOINTS.projects);
}

export async function createProject(name: string): Promise<ProjectSummary> {
  return requestJson(API_ENDPOINTS.projects, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function fetchProject(projectId: string): Promise<ProjectSummary> {
  return requestJson(API_ENDPOINTS.project(projectId));
}

export async function fetchProjectImageSets(projectId: string): Promise<ImageSetSummary[]> {
  return requestJson(API_ENDPOINTS.projectImageSets(projectId));
}

export async function fetchImageSets(): Promise<ImageSetSummary[]> {
  return requestJson(API_ENDPOINTS.imageSets);
}

export async function fetchImageSet(id: string): Promise<ImageSet> {
  const imageSet = await requestJson<ImageSet>(API_ENDPOINTS.imageSet(id));
  return {
    ...imageSet,
    frames: imageSet.frames.map(frame => ({
      ...frame,
      url: apiUrl(frame.url),
    })),
  };
}

export async function fetchAnnotations(projectId: string): Promise<AnnotationState> {
  return requestJson(API_ENDPOINTS.annotations(projectId));
}

export async function saveAnnotations(projectId: string, annotations: AnnotationState): Promise<AnnotationState> {
  return requestJson(API_ENDPOINTS.saveAnnotations(projectId), {
    method: "PUT",
    body: JSON.stringify(annotations),
  });
}

export async function uploadVideoToProject(projectId: string, file: File): Promise<ImageSetSummary> {
  const formData = new FormData();
  formData.append("file", file);
  return requestJson(API_ENDPOINTS.uploadVideoToProject(projectId), {
    method: "POST",
    body: formData,
  });
}

export async function fetchReconstructionExport(projectId: string) {
  return requestJson(API_ENDPOINTS.exportAnnotations(projectId));
}

export async function fetchLatestModel(projectId: string): Promise<ReconstructionModel | null> {
  const raw = await requestJson<unknown | null>(API_ENDPOINTS.latestModel(projectId));
  return normalizeReconstructionModel(raw, projectId);
}

export async function createModel(projectId: string, model: ReconstructionModel): Promise<ReconstructionModel> {
  return requestJson(API_ENDPOINTS.models(projectId), {
    method: "POST",
    body: JSON.stringify(model),
  });
}

export async function saveModel(projectId: string, model: ReconstructionModel): Promise<ReconstructionModel> {
  return requestJson(API_ENDPOINTS.model(projectId, model.id), {
    method: "PUT",
    body: JSON.stringify(model),
  });
}

export async function createEdgeLengthConstraint(projectId: string, modelId: string, constraint: EdgeLengthConstraint): Promise<EdgeLengthConstraint> {
  return requestJson(API_ENDPOINTS.edgeLengthConstraints(projectId, modelId), {
    method: "POST",
    body: JSON.stringify(constraint),
  });
}
