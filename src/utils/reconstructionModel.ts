import { makeEmptyModel } from "../state/modelAtoms";
import type { Cuboid, EdgeLengthConstraint, PointVertexConstraint, ReconstructionModel } from "../types/reconstruction";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function recordOrEmpty<T>(value: unknown): Record<string, T> {
  return isRecord(value) ? (value as Record<string, T>) : {};
}

function valueOrNull<T>(value: unknown): T | null {
  return value === undefined ? null : (value as T | null);
}

export function normalizeReconstructionModel(raw: unknown, projectId: string): ReconstructionModel {
  const fallback = makeEmptyModel(projectId);
  if (!isRecord(raw)) return fallback;

  const payload = isRecord(raw.data_json)
    ? {
        ...raw.data_json,
        id: raw.id,
        projectId: raw.project_id ?? raw.projectId,
        version: raw.version,
        createdAt: raw.created_at ?? raw.createdAt,
        updatedAt: raw.updated_at ?? raw.updatedAt,
      }
    : raw;

  return {
    ...fallback,
    id: typeof payload.id === "string" ? payload.id : fallback.id,
    projectId: typeof payload.projectId === "string" ? payload.projectId : projectId,
    version: typeof payload.version === "number" ? payload.version : fallback.version,
    cuboidsById: recordOrEmpty<Cuboid>(payload.cuboidsById),
    pointVertexConstraintsById: recordOrEmpty<PointVertexConstraint>(payload.pointVertexConstraintsById),
    edgeLengthConstraintsById: recordOrEmpty<EdgeLengthConstraint>(payload.edgeLengthConstraintsById),
    activeCuboidId: valueOrNull<string>(payload.activeCuboidId),
    activeVertex: valueOrNull(payload.activeVertex),
    activeEdge: valueOrNull(payload.activeEdge),
    createdAt: typeof payload.createdAt === "string" ? payload.createdAt : fallback.createdAt,
    updatedAt: typeof payload.updatedAt === "string" ? payload.updatedAt : fallback.updatedAt,
  };
}
