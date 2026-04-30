import { ThreeEvent } from "@react-three/fiber";
import { useAtom } from "jotai";
import { Vector3 } from "three";
import { annotationsAtom } from "../state/annotationAtoms";
import {
  isEdgeLengthModalOpenAtom,
  modelToolModeAtom,
  newestModelAtom,
  selectedCuboidIdAtom,
  selectedEdgeAtom,
  selectedFacesAtom,
  selectedVertexAtom,
} from "../state/modelAtoms";
import type { Cuboid, CuboidEdgeRef, CuboidFaceRef, CuboidVertexRef, FaceId } from "../types/reconstruction";
import { cuboidEdges, localCuboidVertices, sameFaceRef } from "../types/reconstruction";

type Props = {
  cuboid: Cuboid;
};

type FaceRenderDefinition = {
  faceId: FaceId;
  position: [number, number, number];
  rotation: [number, number, number];
  args: [number, number];
};

function vertexPosition(cuboid: Cuboid, vertexIndex: number): Vector3 {
  const local = localCuboidVertices[vertexIndex];
  return new Vector3(
    cuboid.center[0] + local[0] * cuboid.size[0],
    cuboid.center[1] + local[1] * cuboid.size[1],
    cuboid.center[2] + local[2] * cuboid.size[2],
  );
}

function edgeCenter(cuboid: Cuboid, edgeIndex: number): Vector3 {
  const [a, b] = cuboidEdges[edgeIndex];
  return vertexPosition(cuboid, a).add(vertexPosition(cuboid, b)).multiplyScalar(0.5);
}

function edgeScale(cuboid: Cuboid, edgeIndex: number): [number, number, number] {
  const [a, b] = cuboidEdges[edgeIndex];
  const start = vertexPosition(cuboid, a);
  const end = vertexPosition(cuboid, b);
  const length = start.distanceTo(end);
  return [0.035, 0.035, length];
}

function edgeRotation(cuboid: Cuboid, edgeIndex: number): [number, number, number] {
  const [a, b] = cuboidEdges[edgeIndex];
  const start = vertexPosition(cuboid, a);
  const end = vertexPosition(cuboid, b);
  const delta = end.sub(start).normalize();
  if (Math.abs(delta.x) > 0.9) return [0, Math.PI / 2, 0];
  if (Math.abs(delta.y) > 0.9) return [Math.PI / 2, 0, 0];
  return [0, 0, 0];
}

function faceDefinitions(cuboid: Cuboid): FaceRenderDefinition[] {
  const [cx, cy, cz] = cuboid.center;
  const [sx, sy, sz] = cuboid.size;
  return [
    {
      faceId: "left",
      position: [cx - sx / 2, cy, cz],
      rotation: [0, -Math.PI / 2, 0],
      args: [sy, sz],
    },
    {
      faceId: "right",
      position: [cx + sx / 2, cy, cz],
      rotation: [0, Math.PI / 2, 0],
      args: [sy, sz],
    },
    {
      faceId: "front",
      position: [cx, cy - sy / 2, cz],
      rotation: [Math.PI / 2, 0, 0],
      args: [sx, sz],
    },
    {
      faceId: "back",
      position: [cx, cy + sy / 2, cz],
      rotation: [-Math.PI / 2, 0, 0],
      args: [sx, sz],
    },
    {
      faceId: "top",
      position: [cx, cy, cz + sz / 2],
      rotation: [0, 0, 0],
      args: [sx, sy],
    },
    {
      faceId: "bottom",
      position: [cx, cy, cz - sz / 2],
      rotation: [Math.PI, 0, 0],
      args: [sx, sy],
    },
  ];
}

function sameVertex(a: CuboidVertexRef, cuboidId: string, vertexIndex: number): boolean {
  return a.cuboidId === cuboidId && a.vertexIndex === vertexIndex;
}

function sameEdge(a: CuboidEdgeRef, cuboidId: string, edgeIndex: number): boolean {
  return a.cuboidId === cuboidId && a.edgeIndex === edgeIndex;
}

function fallbackColorFromId(id: string, hueOffset = 0): string {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }
  const hue = (hash + hueOffset) % 360;
  return `hsl(${hue}, 85%, 55%)`;
}

export function CuboidMesh({ cuboid }: Props) {
  const [model, setModel] = useAtom(newestModelAtom);
  const [annotations] = useAtom(annotationsAtom);
  const [mode] = useAtom(modelToolModeAtom);
  const [selectedCuboidId, setSelectedCuboidId] = useAtom(selectedCuboidIdAtom);
  const [selectedVertex, setSelectedVertex] = useAtom(selectedVertexAtom);
  const [selectedEdge, setSelectedEdge] = useAtom(selectedEdgeAtom);
  const [selectedFaces, setSelectedFaces] = useAtom(selectedFacesAtom);
  const [, setEdgeLengthModalOpen] = useAtom(isEdgeLengthModalOpenAtom);
  const isSelected = selectedCuboidId === cuboid.id;

  function stop(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation();
  }

  function pointColorForVertex(vertexIndex: number): string | null {
    if (!model) return null;
    const constraint = Object.values(model.pointVertexConstraintsById ?? {}).find(item =>
      item?.vertex && sameVertex(item.vertex, cuboid.id, vertexIndex),
    );
    if (!constraint) return null;
    return annotations.pointsById[constraint.pointId]?.color ?? fallbackColorFromId(constraint.pointId, 0);
  }

  function lineColorForEdge(edgeIndex: number): string | null {
    if (!model) return null;
    const lineConstraints =
      model.imageLineEdgeConstraintsById ??
      (model as { lineEdgeConstraintsById?: typeof model.imageLineEdgeConstraintsById }).lineEdgeConstraintsById ??
      {};
    const constraint = Object.values(lineConstraints).find(item => item?.edge && sameEdge(item.edge, cuboid.id, edgeIndex));
    if (!constraint) return null;
    const firstOccurrence = Object.values(annotations.lineOccurrencesByLineId[constraint.lineId] ?? {})[0];
    return annotations.linesById[constraint.lineId]?.color ?? firstOccurrence?.color ?? fallbackColorFromId(constraint.lineId, 68);
  }

  function faceHasSameWallAssociation(face: CuboidFaceRef): boolean {
    if (!model) return false;
    return Object.values(model.faceAssociationsById ?? {}).some(
      association => association.kind === "same_wall" && association.faces.some(item => sameFaceRef(item, face)),
    );
  }

  function onCuboidClick(event: ThreeEvent<MouseEvent>) {
    stop(event);
    if (!model) return;
    if (mode === "delete-cuboid") {
      const nextCuboids = { ...(model.cuboidsById ?? {}) };
      delete nextCuboids[cuboid.id];
      setModel({
        ...model,
        cuboidsById: nextCuboids,
        activeCuboidId: model.activeCuboidId === cuboid.id ? null : model.activeCuboidId,
        updatedAt: new Date().toISOString(),
      });
      setSelectedCuboidId(null);
      setSelectedVertex(null);
      setSelectedEdge(null);
      setSelectedFaces([]);
      return;
    }
    setSelectedCuboidId(cuboid.id);
  }

  function onFaceClick(faceId: FaceId, event: ThreeEvent<MouseEvent>) {
    stop(event);
    if (!model) return;
    const ref: CuboidFaceRef = { cuboidId: cuboid.id, faceId };
    setSelectedCuboidId(cuboid.id);
    setSelectedVertex(null);
    setSelectedEdge(null);
    setSelectedFaces(current => {
      if (current.some(item => sameFaceRef(item, ref))) {
        return current.filter(item => !sameFaceRef(item, ref));
      }
      const next = [...current, ref];
      return next.length > 2 ? next.slice(next.length - 2) : next;
    });
    setModel({
      ...model,
      activeCuboidId: cuboid.id,
      activeVertex: null,
      activeEdge: null,
      activeFaces: selectedFaces.some(item => sameFaceRef(item, ref))
        ? selectedFaces.filter(item => !sameFaceRef(item, ref))
        : [...selectedFaces, ref].slice(-2),
      updatedAt: new Date().toISOString(),
    });
  }

  function onVertexClick(vertexIndex: number, event: ThreeEvent<MouseEvent>) {
    stop(event);
    const ref: CuboidVertexRef = { cuboidId: cuboid.id, vertexIndex };
    if (mode === "delete-point") {
      if (selectedVertex?.cuboidId === cuboid.id && selectedVertex.vertexIndex === vertexIndex) setSelectedVertex(null);
      return;
    }
    if (mode === "select-vertex") {
      setSelectedCuboidId(cuboid.id);
      setSelectedVertex(ref);
      setSelectedEdge(null);
      setSelectedFaces([]);
    }
  }

  function onEdgeClick(edgeIndex: number, event: ThreeEvent<MouseEvent>) {
    stop(event);
    const [startVertexIndex, endVertexIndex] = cuboidEdges[edgeIndex];
    const ref: CuboidEdgeRef = {
      cuboidId: cuboid.id,
      edgeIndex,
      startVertexIndex,
      endVertexIndex,
    };
    setSelectedCuboidId(cuboid.id);
    setSelectedEdge(ref);
    setSelectedVertex(null);
    setSelectedFaces([]);
    if (mode === "add-edge-length") setEdgeLengthModalOpen(true);
  }

  return (
    <group onClick={onCuboidClick}>
      <mesh position={cuboid.center}>
        <boxGeometry args={cuboid.size} />
        <meshStandardMaterial color={cuboid.color ?? "#6aa9ff"} opacity={isSelected ? 0.32 : 0.18} transparent />
      </mesh>

      {faceDefinitions(cuboid).map(face => {
        const ref: CuboidFaceRef = { cuboidId: cuboid.id, faceId: face.faceId };
        const active = selectedFaces.some(item => sameFaceRef(item, ref));
        const associated = faceHasSameWallAssociation(ref);
        const color = active ? "#ffcf5a" : associated ? "#8fe388" : "#ffffff";
        const opacity = active ? 0.34 : associated ? 0.18 : 0.035;
        return (
          <mesh
            key={face.faceId}
            position={face.position}
            rotation={face.rotation}
            onClick={event => onFaceClick(face.faceId, event)}
          >
            <planeGeometry args={face.args} />
            <meshBasicMaterial color={color} opacity={opacity} transparent depthWrite={false} side={2} />
          </mesh>
        );
      })}

      {localCuboidVertices.map((_, index) => {
        const pos = vertexPosition(cuboid, index);
        const active = selectedVertex?.cuboidId === cuboid.id && selectedVertex.vertexIndex === index;
        const linkedPointColor = pointColorForVertex(index);
        const color = active ? "#ffcf5a" : linkedPointColor ?? "#ffffff";
        const radius = active ? 0.075 : linkedPointColor ? 0.065 : 0.055;
        return (
          <mesh key={index} position={pos} onClick={event => onVertexClick(index, event)}>
            <sphereGeometry args={[radius, 16, 16]} />
            <meshBasicMaterial color={color} />
          </mesh>
        );
      })}

      {cuboidEdges.map((_, index) => {
        const pos = edgeCenter(cuboid, index);
        const active = selectedEdge?.cuboidId === cuboid.id && selectedEdge.edgeIndex === index;
        const linkedLineColor = lineColorForEdge(index);
        const color = active ? "#ffcf5a" : linkedLineColor ?? "#253144";
        const opacity = active || linkedLineColor ? 1 : 0.72;
        const scale = edgeScale(cuboid, index);
        const highlightedScale: [number, number, number] = linkedLineColor || active ? [scale[0] * 1.35, scale[1] * 1.35, scale[2]] : scale;
        return (
          <mesh
            key={index}
            position={pos}
            rotation={edgeRotation(cuboid, index)}
            scale={highlightedScale}
            onClick={event => onEdgeClick(index, event)}
          >
            <cylinderGeometry args={[1, 1, 1, 8]} />
            <meshBasicMaterial color={color} opacity={opacity} transparent />
          </mesh>
        );
      })}
    </group>
  );
}
