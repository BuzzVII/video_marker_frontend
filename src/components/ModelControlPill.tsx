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
  selectedVertexAtom,
} from "../state/modelAtoms";
import type {
  ImageLineEdgeConstraint,
  ModelToolMode,
  PointVertexConstraint,
} from "../types/reconstruction";

const modes: { value: ModelToolMode; label: string }[] = [
  { value: "select-vertex", label: "Select point" },
  { value: "select-edge", label: "Select edge" },
  { value: "delete-point", label: "Delete point" },
  { value: "add-cuboid", label: "Add cuboid" },
  { value: "delete-cuboid", label: "Delete cuboid" },
  { value: "add-edge-length", label: "Add length to edge" },
];

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

  const canLinkPointToVertex = Boolean(model && activePointId && selectedVertex);
  const canLinkLineToEdge = Boolean(model && activeLineId && selectedEdge);

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
