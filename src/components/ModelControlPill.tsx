import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAtom, useAtomValue } from "jotai";
import { saveModel } from "../api/client";
import { selectedProjectIdAtom } from "../state/annotationAtoms";
import { makeDefaultCuboid, modelToolModeAtom, newestModelAtom, selectedCuboidIdAtom, selectedEdgeAtom, selectedVertexAtom } from "../state/modelAtoms";
import type { ModelToolMode } from "../types/reconstruction";

const modes: { value: ModelToolMode; label: string }[] = [
  { value: "select-vertex", label: "Select point" },
  { value: "delete-point", label: "Delete point" },
  { value: "add-cuboid", label: "Add cuboid" },
  { value: "delete-cuboid", label: "Delete cuboid" },
  { value: "add-edge-length", label: "Add length to edge" },
];

export function ModelControlPill() {
  const queryClient = useQueryClient();
  const selectedProjectId = useAtomValue(selectedProjectIdAtom);
  const [mode, setMode] = useAtom(modelToolModeAtom);
  const [model, setModel] = useAtom(newestModelAtom);
  const [, setSelectedCuboidId] = useAtom(selectedCuboidIdAtom);
  const [, setSelectedVertex] = useAtom(selectedVertexAtom);
  const [, setSelectedEdge] = useAtom(selectedEdgeAtom);

  const saveMutation = useMutation({
    mutationFn: () => saveModel(selectedProjectId!, model!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["latestModel", selectedProjectId] }),
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

  return (
    <div className="model-control-pill">
      {modes.map(item => (
        <button
          key={item.value}
          data-active={mode === item.value}
          type="button"
          onClick={() => {
            setMode(item.value);
            if (item.value === "add-cuboid") addCuboid();
          }}
        >
          {item.label}
        </button>
      ))}
      <button type="button" disabled={!model || !selectedProjectId || saveMutation.isPending} onClick={() => saveMutation.mutate()}>
        Save model
      </button>
    </div>
  );
}
