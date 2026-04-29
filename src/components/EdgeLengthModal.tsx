import { FormEvent, useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import { isEdgeLengthModalOpenAtom, newestModelAtom, selectedEdgeAtom } from "../state/modelAtoms";
import type { EdgeLengthConstraint } from "../types/reconstruction";

export function EdgeLengthModal() {
  const [isOpen, setOpen] = useAtom(isEdgeLengthModalOpenAtom);
  const selectedEdge = useAtomValue(selectedEdgeAtom);
  const [model, setModel] = useAtom(newestModelAtom);
  const [length, setLength] = useState("1.0");
  const [unit, setUnit] = useState<"m" | "mm">("m");

  if (!isOpen || !selectedEdge || !model) return null;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!selectedEdge || !model) return;
    const parsedLength = Number.parseFloat(length);
    if (!Number.isFinite(parsedLength) || parsedLength <= 0) return;

    const constraint: EdgeLengthConstraint = {
      id: `edge-length-${crypto.randomUUID()}`,
      edge: selectedEdge,
      length: parsedLength,
      unit,
      source: "manual",
      createdAt: new Date().toISOString(),
    };

    setModel({
      ...model,
      edgeLengthConstraintsById: {
        ...(model.edgeLengthConstraintsById ?? {}),
        [constraint.id]: constraint,
      },
      activeEdge: selectedEdge,
      updatedAt: new Date().toISOString(),
    });
    setOpen(false);
  }

  return (
    <div className="modal-backdrop model-modal" role="presentation" onMouseDown={() => setOpen(false)}>
      <form className="modal-card edge-length-card" onSubmit={onSubmit} onMouseDown={event => event.stopPropagation()}>
        <h2>Add length to edge</h2>
        <p>
          Cuboid {selectedEdge.cuboidId}, edge {selectedEdge.edgeIndex}. This stores a metric constraint for the reconstruction solver.
        </p>
        <label>
          Length
          <input value={length} onChange={event => setLength(event.target.value)} inputMode="decimal" autoFocus />
        </label>
        <label>
          Unit
          <select value={unit} onChange={event => setUnit(event.target.value as "m" | "mm")}>
            <option value="m">m</option>
            <option value="mm">mm</option>
          </select>
        </label>
        <div className="modal-actions">
          <button type="button" onClick={() => setOpen(false)}>Cancel</button>
          <button type="submit">Save length</button>
        </div>
      </form>
    </div>
  );
}
