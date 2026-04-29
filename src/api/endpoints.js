export const API_BASE = "/api";

export function apiUrl(path) {
  if (path.startsWith("http")) return path;
  return path.startsWith("/") ? path : `/${path}`;
}

export const API_ENDPOINTS = {
  health: `${API_BASE}/health`,
  projects: `${API_BASE}/projects`,
  project: projectId => `${API_BASE}/projects/${projectId}`,
  projectImageSets: projectId => `${API_BASE}/projects/${projectId}/image-sets`,
  uploadVideoToProject: projectId => `${API_BASE}/projects/${projectId}/videos/upload`,
  imageSets: `${API_BASE}/image-sets`,
  imageSet: imageSetId => `${API_BASE}/image-sets/${imageSetId}`,
  frameImage: (imageSetId, frameId) => `${API_BASE}/image-sets/${imageSetId}/frames/${frameId}/image`,
  annotations: projectId => `${API_BASE}/projects/${projectId}/annotations`,
  saveAnnotations: projectId => `${API_BASE}/projects/${projectId}/annotations`,
  exportAnnotations: projectId => `${API_BASE}/projects/${projectId}/export`,
  latestModel: projectId => `${API_BASE}/projects/${projectId}/models/latest`,
  models: projectId => `${API_BASE}/projects/${projectId}/models`,
  model: (projectId, modelId) => `${API_BASE}/projects/${projectId}/models/${modelId}`,
  cuboids: (projectId, modelId) => `${API_BASE}/projects/${projectId}/models/${modelId}/cuboids`,
  cuboid: (projectId, modelId, cuboidId) => `${API_BASE}/projects/${projectId}/models/${modelId}/cuboids/${cuboidId}`,
  edgeLengthConstraints: (projectId, modelId) => `${API_BASE}/projects/${projectId}/models/${modelId}/edge-length-constraints`,
  edgeLengthConstraint: (projectId, modelId, constraintId) => `${API_BASE}/projects/${projectId}/models/${modelId}/edge-length-constraints/${constraintId}`,
  pointVertexConstraints: (projectId, modelId) => `${API_BASE}/projects/${projectId}/models/${modelId}/point-vertex-constraints`,
  pointVertexConstraint: (projectId, modelId, constraintId) => `${API_BASE}/projects/${projectId}/models/${modelId}/point-vertex-constraints/${constraintId}`,
  reconstructionRuns: projectId => `${API_BASE}/projects/${projectId}/reconstruction-runs`,
  reconstructionRun: (projectId, runId) => `${API_BASE}/projects/${projectId}/reconstruction-runs/${runId}`,
};
