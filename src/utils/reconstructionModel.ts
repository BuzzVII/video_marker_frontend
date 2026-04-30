import { makeEmptyModel } from "../state/modelAtoms";
import type {
  Cuboid,
  EdgeLengthConstraint,
  FaceAssociation,
  ImageLineEdgeConstraint,
  PointVertexConstraint,
  ReconstructionModel,
  WallFeature,
} from "../types/reconstruction";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function recordOrEmpty<T>(value: unknown): Record<string, T> {
  return isRecord(value) ? (value as Record<string, T>) : {};
}

function arrayOrEmpty<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function valueOrNull<T>(value: unknown): T | null {
  return value === undefined ? null : (value as T | null);
}

export function normalizeReconstructionModel(raw: unknown, projectId: string): ReconstructionModel {
  const fallback = makeEmptyModel(projectId);
  if (!isRecord(raw)) return fallback;

  const dataJson = raw.data_json;
  const payload = isRecord(dataJson)
    ? {
        ...dataJson,
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
    imageLineEdgeConstraintsById: recordOrEmpty<ImageLineEdgeConstraint>(
      payload.imageLineEdgeConstraintsById ?? payload.lineEdgeConstraintsById,
    ),
    edgeLengthConstraintsById: recordOrEmpty<EdgeLengthConstraint>(payload.edgeLengthConstraintsById),
    faceAssociationsById: recordOrEmpty<FaceAssociation>(payload.faceAssociationsById),
    wallFeaturesById: recordOrEmpty<WallFeature>(payload.wallFeaturesById),
    activeCuboidId: valueOrNull<string>(payload.activeCuboidId),
    activeVertex: valueOrNull(payload.activeVertex),
    activeEdge: valueOrNull(payload.activeEdge),
    activeFaces: arrayOrEmpty(payload.activeFaces),
    createdAt: typeof payload.createdAt === "string" ? payload.createdAt : fallback.createdAt,
    updatedAt: typeof payload.updatedAt === "string" ? payload.updatedAt : fallback.updatedAt,
  };
}
