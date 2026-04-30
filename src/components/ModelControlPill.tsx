import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAtom, useAtomValue } from "jotai";
import { saveAnnotations, saveModel } from "../api/client";
import {
  activeLineIdAtom,
  activePointIdAtom,
  annotationsAtom,
  pruneEmptyAnnotations,
  selectedProjectIdAtom,
} from "../state/annotationAtoms";
import {
  makeDefaultCuboid,
  modelToolModeAtom,
  newestModelAtom,
  selectedCuboidIdAtom,
  selectedEdgeAtom,
  selectedFacesAtom,
  selectedVertexAtom,
} from "../state/modelAtoms";
import type {
  FaceAssociation,
  ImageLineEdgeConstraint,
  ModelToolMode,
  PointVertexConstraint,
} from "../types/reconstruction";
import { sameFaceRef } from "../types/reconstruction";

const modes: { value: ModelToolMode; label: string }[] = [
  { value: "select-vertex", label: "Select point" },
  { value: "select-edge", label: "Select edge" },
  { value: "delete-point", label: "Delete point" },
  { value: "add-cuboid", label: "Add cuboid" },
  { value: "delete-cuboid", label: "Delete cuboid" },
  { value: "add-edge-length", label: "Add length to edge" },
];

function faceLabel(face: { cuboidId: string; faceId: string }): string {
  return `${face.cuboidId.slice(0, 12)} ${face.faceId}`;
}

export function ModelControlPill() {
  const queryClient = useQueryClient();
  const selectedProjectId = useAtomValue(selectedProjectIdAtom);
  const activePointId = useAtomValue(activePointIdAtom);
  const activeLineId = useAtomValue(activeLineIdAtom);
  const [annotations, setAnnotations] = useAtom(annotationsAtom);
  const [mode, setMode] = useAtom(modelToolModeAtom);
  const [model, setModel] = useAtom(newestModelAtom);
  const [, setSelectedCuboidId] = useAtom(selectedCuboidIdAtom);
  const [selectedVertex, setSelectedVertex] = useAtom(selectedVertexAtom);
  const [selectedEdge, setSelectedEdge] = useAtom(selectedEdgeAtom);
  const [selectedFaces, setSelectedFaces] = useAtom(selectedFacesAtom);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProjectId) throw new Error("No project selected");
      const cleanedAnnotations = pruneEmptyAnnotations(annotations);
      const savedAnnotations = await saveAnnotations(selectedProjectId, cleanedAnnotations);
      const savedModel = model ? await saveModel(selectedProjectId, model) : null;
      return { savedAnnotations, savedModel };
    },
    onSuccess: ({ savedAnnotations, savedModel }) => {
      setAnnotations(savedAnnotations);
      if (savedModel) setModel(savedModel);
      queryClient.setQueryData(["annotations", selectedProjectId], savedAnnotations);
      queryClient.invalidateQueries({ queryKey: ["annotations", selectedProjectId] });
      queryClient.invalidateQueries({ queryKey: ["latestModel", selectedProjectId] });
    },
  });

  function addCuboid() {
    if (!model) return;
    const cuboid = makeDefaultCuboid(Object.keys(model.cuboidsById ?? {}).length);
    const nextModel = {
      ...model,
      cuboidsById: {
        ...(model.cuboidsById ?? {}),
        [cuboid.id]: cuboid,
      },
      activeCuboidId: cuboid.id,
      updatedAt: new Date().toISOString(),
    };
    setModel(nextModel);
    setSelectedCuboidId(cuboid.id);
    setSelectedVertex(null);
    setSelectedEdge(null);
    setSelectedFaces([]);
  }

  function linkActivePointToSelectedVertex() {
    if (!model || !activePointId || !selectedVertex) return;
    const existingConstraint = Object.values(model.pointVertexConstraintsById ?? {}).find(
      constraint =>
        constraint.pointId === activePointId &&
        constraint.vertex.cuboidId === selectedVertex.cuboidId &&
        constraint.vertex.vertexIndex === selectedVertex.vertexIndex,
    );
    if (existingConstraint) return;
    const constraint: PointVertexConstraint = {
      id: `point-vertex-${crypto.randomUUID()}`,
      pointId: activePointId,
      vertex: selectedVertex,
      confidence: 1.0,
      source: "manual",
    };
    setModel({
      ...model,
      pointVertexConstraintsById: {
        ...(model.pointVertexConstraintsById ?? {}),
        [constraint.id]: constraint,
      },
      activeVertex: selectedVertex,
      updatedAt: new Date().toISOString(),
    });
  }

  function linkActiveLineToSelectedEdge() {
    if (!model || !activeLineId || !selectedEdge) return;
    const existingConstraint = Object.values(model.imageLineEdgeConstraintsById ?? {}).find(
      constraint =>
        constraint.lineId === activeLineId &&
        constraint.edge.cuboidId === selectedEdge.cuboidId &&
        constraint.edge.edgeIndex === selectedEdge.edgeIndex,
    );
    if (existingConstraint) return;
    const constraint: ImageLineEdgeConstraint = {
      id: `line-edge-${crypto.randomUUID()}`,
      lineId: activeLineId,
      edge: selectedEdge,
      confidence: 1.0,
      source: "manual",
    };
    setModel({
      ...model,
      imageLineEdgeConstraintsById: {
        ...(model.imageLineEdgeConstraintsById ?? {}),
        [constraint.id]: constraint,
      },
      activeEdge: selectedEdge,
      updatedAt: new Date().toISOString(),
    });
  }

  function selectedFacesAreAlreadySameWall(): boolean {
    if (!model || selectedFaces.length !== 2) return false;
    const [a, b] = selectedFaces;
    return Object.values(model.faceAssociationsById ?? {}).some(
      association =>
        association.kind === "same_wall" &&
        association.faces.some(face => sameFaceRef(face, a)) &&
        association.faces.some(face => sameFaceRef(face, b)),
    );
  }

  function markSelectedFacesAsSameWall() {
    if (!model || selectedFaces.length !== 2 || selectedFacesAreAlreadySameWall()) return;
    const now = new Date().toISOString();
    const association: FaceAssociation = {
      id: `face-association-${crypto.randomUUID()}`,
      kind: "same_wall",
      faces: [selectedFaces[0], selectedFaces[1]],
      confidence: 1.0,
      source: "manual",
      createdAt: now,
    };
    setModel({
      ...model,
      faceAssociationsById: {
        ...(model.faceAssociationsById ?? {}),
        [association.id]: association,
      },
      activeFaces: selectedFaces,
      updatedAt: now,
    });
  }

  function clearSelectedFaces() {
    setSelectedFaces([]);
    if (!model) return;
    setModel({
      ...model,
      activeFaces: [],
      updatedAt: new Date().toISOString(),
    });
  }

  const canLinkPointToVertex = Boolean(model && activePointId && selectedVertex);
  const canLinkLineToEdge = Boolean(model && activeLineId && selectedEdge);
  const sameWallExists = selectedFacesAreAlreadySameWall();
  const canMarkSameWall = Boolean(model && selectedFaces.length === 2 && !sameWallExists);

  return (
    <div className="model-control-pill">
      {modes.map(item => (
        <button
          key={item.value}
          type="button"
          className={mode === item.value ? "tool active" : "tool"}
          onClick={() => {
            setMode(item.value);
            if (item.value === "add-cuboid") addCuboid();
          }}
        >
          {item.label}
        </button>
      ))}

      <button
        className="tool"
        type="button"
        disabled={!canLinkPointToVertex}
        onClick={linkActivePointToSelectedVertex}
      >
        Link image point to cuboid corner
      </button>

      <button
        className="tool"
        type="button"
        disabled={!canLinkLineToEdge}
        onClick={linkActiveLineToSelectedEdge}
      >
        Link image line to cuboid edge
      </button>

      <span className="tool" title={selectedFaces.map(faceLabel).join("\n") || "No selected faces"}>
        Selected faces: {selectedFaces.length}
      </span>

      <button className="tool" type="button" disabled={!canMarkSameWall} onClick={markSelectedFacesAsSameWall}>
        {sameWallExists ? "Already same wall" : "Same wall"}
      </button>

      <button className="tool" type="button" disabled={selectedFaces.length === 0} onClick={clearSelectedFaces}>
        Clear faces
      </button>

      <button
        className="tool save"
        type="button"
        disabled={!selectedProjectId || saveMutation.isPending}
        onClick={() => saveMutation.mutate()}
      >
        {saveMutation.isPending ? "Saving..." : "Save"}
      </button>
    </div>
  );
}
