import { apiUrl } from "./endpoints.js";
import type { AnnotationState, ImageSet } from "../types/annotations";

export type ImageSetSummary = {
  id: string;
  name: string;
  created_at: string;
  frame_count: number;
  source_type: string;
};

async function requestJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
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

export async function fetchHealth(): Promise<{ ok: boolean }> {
  return requestJson("/api/health");
}

export async function fetchImageSets(): Promise<ImageSetSummary[]> {
  return requestJson("/api/image-sets");
}

export async function fetchImageSet(id: string): Promise<ImageSet> {
  const imageSet = await requestJson<ImageSet>(`/api/image-sets/${id}`);

  return {
    ...imageSet,
    frames: imageSet.frames.map(frame => ({
      ...frame,
      url: apiUrl(frame.url),
    })),
  };
}

export async function fetchAnnotations(
  imageSetId: string,
): Promise<AnnotationState> {
  return requestJson(`/api/image-sets/${imageSetId}/annotations`);
}

export async function saveAnnotations(
  imageSetId: string,
  annotations: AnnotationState,
): Promise<AnnotationState> {
  return requestJson(`/api/image-sets/${imageSetId}/annotations`, {
    method: "PUT",
    body: JSON.stringify(annotations),
  });
}

export async function uploadVideo(file: File): Promise<ImageSetSummary> {
  const formData = new FormData();
  formData.append("file", file);

  return requestJson("/api/videos/upload", {
    method: "POST",
    body: formData,
  });
}

export async function fetchReconstructionExport(imageSetId: string) {
  return requestJson(`/api/image-sets/${imageSetId}/export`);
}
