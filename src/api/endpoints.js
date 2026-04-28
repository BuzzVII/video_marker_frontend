export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export const API_ENDPOINTS = {
  health: "/api/health",
  projects: "/api/projects",
  project: id => `/api/projects/${id}`,
  projectImageSets: projectId => `/api/projects/${projectId}/image-sets`,
  uploadVideoToProject: projectId => `/api/projects/${projectId}/videos/upload`,
  imageSets: "/api/image-sets",
  imageSet: id => `/api/image-sets/${id}`,
  frameImage: (imageSetId, frameId) =>
    `/api/image-sets/${imageSetId}/frames/${frameId}/image`,
  annotations: projectId => `/api/projects/${projectId}/annotations`,
  saveAnnotations: projectId => `/api/projects/${projectId}/annotations`,
  exportAnnotations: projectId => `/api/projects/${projectId}/export`,
};

export function apiUrl(path) {
  return `${API_BASE_URL}${path}`;
}
