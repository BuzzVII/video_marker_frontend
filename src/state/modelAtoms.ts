import { atom } from "jotai";

import type { Cuboid, CuboidEdgeRef, CuboidVertexRef, ModelToolMode, ReconstructionModel } from "../types/reconstruction";

export function makeEmptyModel(projectId: string): ReconstructionModel {
  const now = new Date().toISOString();

  return {
    id: `model-${crypto.randomUUID()}`,
    projectId,
    version: 1,
    cuboidsById: {},
    pointVertexConstraintsById: {},
    imageLineEdgeConstraintsById: {},
    edgeLengthConstraintsById: {},
    activeCuboidId: null,
    activeVertex: null,
    activeEdge: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function makeDefaultCuboid(index: number): Cuboid {
  return {
    id: `cuboid-${crypto.randomUUID()}`,
    label: `Cuboid ${index + 1}`,
    center: [index * 1.5, 0, 0.75],
    size: [1.2, 0.8, 1.5],
    rotation: [0, 0, 0, 1],
    color: "#6aa9ff",
    createdFrom: { manual: true },
  };
}

export const newestModelAtom = atom<ReconstructionModel | null>(null);
export const modelToolModeAtom = atom<ModelToolMode>("select-vertex");
export const selectedCuboidIdAtom = atom<string | null>(null);
export const selectedVertexAtom = atom<CuboidVertexRef | null>(null);
export const selectedEdgeAtom = atom<CuboidEdgeRef | null>(null);
export const isEdgeLengthModalOpenAtom = atom(false);
