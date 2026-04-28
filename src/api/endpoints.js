export const API_ENDPOINTS = {
  imageSets: "/api/image-sets",
  imageSet: id => `/api/image-sets/${id}`,
  uploadVideo: "/api/videos/upload",
  annotations: imageSetId => `/api/image-sets/${imageSetId}/annotations`,
  saveAnnotations: imageSetId => `/api/image-sets/${imageSetId}/annotations/save`,
};
