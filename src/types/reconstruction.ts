export type Vec3 = [number, number, number];
export type Quat = [number, number, number, number];

export type ModelToolMode =
  | "select-vertex"
  | "delete-point"
  | "add-cuboid"
  | "delete-cuboid"
  | "select-edge"
  | "add-edge-length";

export type Cuboid = {
  id: string;
  label?: string;
  center: Vec3;
  size: Vec3;
  rotation: Quat;
  color?: string;
  locked?: boolean;
  createdFrom?: {
    solverRunId?: string;
    manual?: boolean;
  };
};

export type CuboidVertexRef = {
  cuboidId: string;
  vertexIndex: number;
};

export type CuboidEdgeRef = {
  cuboidId: string;
  edgeIndex: number;
  startVertexIndex: number;
  endVertexIndex: number;
};

export type FaceId = "left" | "right" | "front" | "back" | "top" | "bottom";

export type CuboidFaceRef = {
  cuboidId: string;
  faceId: FaceId;
};

export type FaceAssociationKind = "same_wall";

export type FaceAssociation = {
  id: string;
  kind: FaceAssociationKind;
  faces: [CuboidFaceRef, CuboidFaceRef];
  source: "manual" | "solver";
  confidence?: number;
  createdAt: string;
};

export type WallFeatureKind = "door" | "window" | "open_passage";

export type WallFeatureObservation = {
  frameId: string;
  imageSetId?: string;
  pointIds?: string[];
  lineIds?: string[];
  polygon?: [number, number][];
};

export type WallFeature = {
  id: string;
  kind: WallFeatureKind;
  hostFace: CuboidFaceRef;
  connectsTo?: CuboidFaceRef;
  dimensions?: {
    width?: number;
    height?: number;
    depth?: number;
    unit?: "m" | "mm";
  };
  localRect?: {
    u0?: number;
    v0?: number;
    u1?: number;
    v1?: number;
  };
  observationsByFrameId?: Record<string, WallFeatureObservation>;
  source: "manual" | "solver";
  createdAt: string;
};

export type PointVertexConstraint = {
  id: string;
  pointId: string;
  vertex: CuboidVertexRef;
  confidence?: number;
  source: "manual" | "solver";
};

export type ImageLineEdgeConstraint = {
  id: string;
  lineId: string;
  edge: CuboidEdgeRef;
  confidence?: number;
  source: "manual" | "solver";
};

export type EdgeLengthConstraint = {
  id: string;
  edge: CuboidEdgeRef;
  length: number;
  unit: "m" | "mm";
  source: "manual";
  createdAt: string;
};

export type ReconstructionModel = {
  id: string;
  projectId: string;
  version: number;
  cuboidsById: Record<string, Cuboid>;
  pointVertexConstraintsById: Record<string, PointVertexConstraint>;
  imageLineEdgeConstraintsById: Record<string, ImageLineEdgeConstraint>;
  edgeLengthConstraintsById: Record<string, EdgeLengthConstraint>;
  faceAssociationsById: Record<string, FaceAssociation>;
  wallFeaturesById: Record<string, WallFeature>;
  activeCuboidId: string | null;
  activeVertex: CuboidVertexRef | null;
  activeEdge: CuboidEdgeRef | null;
  activeFaces: CuboidFaceRef[];
  createdAt: string;
  updatedAt: string;
};

export const cuboidEdges = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 0],
  [4, 5],
  [5, 6],
  [6, 7],
  [7, 4],
  [0, 4],
  [1, 5],
  [2, 6],
  [3, 7],
] as const;

export const localCuboidVertices: Vec3[] = [
  [-0.5, -0.5, -0.5],
  [0.5, -0.5, -0.5],
  [0.5, 0.5, -0.5],
  [-0.5, 0.5, -0.5],
  [-0.5, -0.5, 0.5],
  [0.5, -0.5, 0.5],
  [0.5, 0.5, 0.5],
  [-0.5, 0.5, 0.5],
];

export const cuboidFaceIds: FaceId[] = ["left", "right", "front", "back", "top", "bottom"];

export function sameFaceRef(a: CuboidFaceRef, b: CuboidFaceRef): boolean {
  return a.cuboidId === b.cuboidId && a.faceId === b.faceId;
}
