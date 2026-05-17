import { API_ENDPOINTS, apiUrl } from "./endpoints.js";
import type { AnnotationState, ImageSet, ImageSetSummary, ProjectSummary } from "../types/annotations";
import { normalizeAnnotations } from "../state/annotationAtoms";
import type { EdgeLengthConstraint, ReconstructionModel } from "../types/reconstruction";
import type { RadianceField, RadianceFieldJob, StartRadianceFieldJobPayload } from "../types/radiance";
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
      // Keep status text.
    }
    throw new Error(`${response.status} ${detail}`);
  }

  return response.json() as Promise<T>;
}

function modelDataJson(model: ReconstructionModel) {
  return {
    cuboidsById: model.cuboidsById ?? {},
    pointVertexConstraintsById: model.pointVertexConstraintsById ?? {},
    imageLineEdgeConstraintsById: model.imageLineEdgeConstraintsById ?? {},
    edgeLengthConstraintsById: model.edgeLengthConstraintsById ?? {},
    faceAssociationsById: model.faceAssociationsById ?? {},
    wallFeaturesById: model.wallFeaturesById ?? {},
    activeCuboidId: model.activeCuboidId ?? null,
    activeVertex: model.activeVertex ?? null,
    activeEdge: model.activeEdge ?? null,
    activeFaces: model.activeFaces ?? [],
  };
}

function modelWritePayload(model: ReconstructionModel) {
  return {
    data_json: modelDataJson(model),
    source: "manual",
  };
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
  try {
    const raw = await requestJson<Partial<AnnotationState> | null>(API_ENDPOINTS.annotations(projectId));
    return normalizeAnnotations(raw);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("404 ")) {
      return normalizeAnnotations(null);
    }
    throw error;
  }
}

export async function saveAnnotations(projectId: string, annotations: AnnotationState): Promise<AnnotationState> {
  const raw = await requestJson<Partial<AnnotationState> | null>(API_ENDPOINTS.saveAnnotations(projectId), {
    method: "PUT",
    body: JSON.stringify(normalizeAnnotations(annotations)),
  });
  return normalizeAnnotations(raw);
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
  try {
    const raw = await requestJson(API_ENDPOINTS.latestModel(projectId));
    return normalizeReconstructionModel(raw, projectId);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("404 ")) {
      return null;
    }
    throw error;
  }
}

export async function createModel(projectId: string, model: ReconstructionModel): Promise<ReconstructionModel> {
  const raw = await requestJson(API_ENDPOINTS.models(projectId), {
    method: "POST",
    body: JSON.stringify(modelWritePayload(model)),
  });
  const normalized = normalizeReconstructionModel(raw, projectId);
  if (!normalized) throw new Error("Backend returned an empty reconstruction model after create.");
  return normalized;
}

export async function saveModel(projectId: string, model: ReconstructionModel): Promise<ReconstructionModel> {
  const raw = await requestJson(API_ENDPOINTS.model(projectId, model.id), {
    method: "PUT",
    body: JSON.stringify(modelWritePayload(model)),
  });
  const normalized = normalizeReconstructionModel(raw, projectId);
  if (!normalized) throw new Error("Backend returned an empty reconstruction model after save.");
  return normalized;
}

export async function createEdgeLengthConstraint(
  projectId: string,
  modelId: string,
  constraint: EdgeLengthConstraint,
): Promise<EdgeLengthConstraint> {
  return requestJson(API_ENDPOINTS.edgeLengthConstraints(projectId, modelId), {
    method: "POST",
    body: JSON.stringify(constraint),
  });
}


export async function fetchRadianceFields(projectId: string): Promise<RadianceField[]> {
  return requestJson(API_ENDPOINTS.radianceFields(projectId));
}

export async function fetchRadianceField(projectId: string, radianceFieldId: string): Promise<RadianceField> {
  const field = await requestJson<RadianceField>(API_ENDPOINTS.radianceField(projectId, radianceFieldId));
  return {
    ...field,
    asset_url: apiUrl(field.asset_url),
  };
}

export async function fetchRadianceFieldJobs(projectId: string): Promise<RadianceFieldJob[]> {
  return requestJson(API_ENDPOINTS.radianceFieldJobs(projectId));
}

export async function fetchRadianceFieldJob(projectId: string, jobId: string): Promise<RadianceFieldJob> {
  return requestJson(API_ENDPOINTS.radianceFieldJob(projectId, jobId));
}

export async function startRadianceFieldJob(
  projectId: string,
  payload: StartRadianceFieldJobPayload,
): Promise<RadianceFieldJob> {
  return requestJson(API_ENDPOINTS.radianceFieldJobs(projectId), {
    method: "POST",
    body: JSON.stringify({
      ...payload,
      config: payload.config ?? {},
    }),
  });
}
