import type { AnnotationState, ImageSet } from "../types/annotations";
import { emptyAnnotations, mockImageSets } from "./mockData";
import { API_ENDPOINTS } from "./endpoints.js";

let annotationStore: Record<string, AnnotationState> = {};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function fetchImageSets(): Promise<ImageSet[]> {
  console.log("GET", API_ENDPOINTS.imageSets);
  await delay(150);
  return mockImageSets;
}

export async function fetchImageSet(id: string): Promise<ImageSet> {
  console.log("GET", API_ENDPOINTS.imageSet(id));
  await delay(150);

  const set = mockImageSets.find(item => item.id === id);
  if (!set) {
    throw new Error(`Image set not found: ${id}`);
  }

  return set;
}

export async function fetchAnnotations(imageSetId: string): Promise<AnnotationState> {
  console.log("GET", API_ENDPOINTS.annotations(imageSetId));
  await delay(150);

  return annotationStore[imageSetId] ?? structuredClone(emptyAnnotations);
}

export async function saveAnnotations(
  imageSetId: string,
  annotations: AnnotationState,
): Promise<AnnotationState> {
  console.log("POST", API_ENDPOINTS.saveAnnotations(imageSetId), annotations);
  await delay(250);

  annotationStore[imageSetId] = structuredClone(annotations);
  return annotationStore[imageSetId];
}

export async function uploadVideo(file: File): Promise<ImageSet> {
  console.log("POST", API_ENDPOINTS.uploadVideo, file.name);
  await delay(300);

  const id = `uploaded-${Date.now()}`;

  const imageSet: ImageSet = {
    id,
    name: file.name,
    frames: Array.from({ length: 8 }, (_, i) => ({
      id: `${id}-frame-${i + 1}`,
      label: `Frame ${i + 1}`,
      url: `https://picsum.photos/seed/${id}-${i + 1}/900/600`,
    })),
  };

  mockImageSets.push(imageSet);
  return imageSet;
}
