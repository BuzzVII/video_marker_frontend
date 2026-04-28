export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export const API_ENDPOINTS = {
  health: "/api/health",

  imageSets: "/api/image-sets",
  imageSet: id => `/api/image-sets/${id}`,

  uploadVideo: "/api/videos/upload",

  frameImage: (imageSetId, frameId) =>
    `/api/image-sets/${imageSetId}/frames/${frameId}/image`,

  annotations: imageSetId => `/api/image-sets/${imageSetId}/annotations`,

  saveAnnotations: imageSetId => `/api/image-sets/${imageSetId}/annotations`,

  exportAnnotations: imageSetId => `/api/image-sets/${imageSetId}/export`,
};

export function apiUrl(path) {
  return `${API_BASE_URL}${path}`;
}
