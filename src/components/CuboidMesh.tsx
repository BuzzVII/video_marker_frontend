import { ThreeEvent } from "@react-three/fiber";
import { useAtom } from "jotai";
import { Vector3 } from "three";
import { isEdgeLengthModalOpenAtom, modelToolModeAtom, newestModelAtom, selectedCuboidIdAtom, selectedEdgeAtom, selectedVertexAtom } from "../state/modelAtoms";
import type { Cuboid, CuboidEdgeRef, CuboidVertexRef } from "../types/reconstruction";
import { cuboidEdges, localCuboidVertices } from "../types/reconstruction";

type Props = {
  cuboid: Cuboid;
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

export function CuboidMesh({ cuboid }: Props) {
  const [model, setModel] = useAtom(newestModelAtom);
  const [mode] = useAtom(modelToolModeAtom);
  const [selectedCuboidId, setSelectedCuboidId] = useAtom(selectedCuboidIdAtom);
  const [selectedVertex, setSelectedVertex] = useAtom(selectedVertexAtom);
  const [selectedEdge, setSelectedEdge] = useAtom(selectedEdgeAtom);
  const [, setEdgeLengthModalOpen] = useAtom(isEdgeLengthModalOpenAtom);

  const isSelected = selectedCuboidId === cuboid.id;

  function stop(event: ThreeEvent<Event>) {
    event.stopPropagation();
  }

  function onCuboidClick(event: ThreeEvent<MouseEvent>) {
    stop(event);
    if (!model) return;
    if (mode === "delete-cuboid") {
      const nextCuboids = { ...model.cuboidsById };
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
      return;
    }
    setSelectedCuboidId(cuboid.id);
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
    if (mode === "add-edge-length") setEdgeLengthModalOpen(true);
  }

  return (
    <group>
      <mesh position={cuboid.center} onClick={onCuboidClick} castShadow receiveShadow>
        <boxGeometry args={cuboid.size} />
        <meshStandardMaterial color={cuboid.color ?? "#6aa9ff"} transparent opacity={isSelected ? 0.62 : 0.42} />
      </mesh>

      {localCuboidVertices.map((_, index) => {
        const pos = vertexPosition(cuboid, index);
        const active = selectedVertex?.cuboidId === cuboid.id && selectedVertex.vertexIndex === index;
        return (
          <mesh key={index} position={pos} onClick={event => onVertexClick(index, event)}>
            <sphereGeometry args={[active ? 0.075 : 0.055, 16, 16]} />
            <meshStandardMaterial color={active ? "#ffcf5a" : "#ffffff"} />
          </mesh>
        );
      })}

      {cuboidEdges.map((_, index) => {
        const pos = edgeCenter(cuboid, index);
        const active = selectedEdge?.cuboidId === cuboid.id && selectedEdge.edgeIndex === index;
        return (
          <mesh key={index} position={pos} rotation={edgeRotation(cuboid, index)} scale={edgeScale(cuboid, index)} onClick={event => onEdgeClick(index, event)}>
            <cylinderGeometry args={[1, 1, 1, 8]} />
            <meshStandardMaterial color={active ? "#ffcf5a" : "#253144"} transparent opacity={active ? 1 : 0.72} />
          </mesh>
        );
      })}
    </group>
  );
}
