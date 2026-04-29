import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAtom } from "jotai";
import { createProject } from "../api/client";
import { selectedProjectIdAtom } from "../state/annotationAtoms";
import type { ProjectSummary } from "../types/annotations";
import { HelpModal } from "./HelpModal";

type Props = {
  projects: ProjectSummary[];
};

export function TopNav({ projects }: Props) {
  const queryClient = useQueryClient();
  const [selectedProjectId, setSelectedProjectId] = useAtom(selectedProjectIdAtom);
  const [isHelpOpen, setHelpOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  const createProjectMutation = useMutation({
    mutationFn: createProject,
    onSuccess: project => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setSelectedProjectId(project.id);
      setNewProjectName("");
    },
  });

  return (
    <header className="top-nav">
      <div className="brand-block">
        <strong>Video Marker</strong>
        <span>Image points and cuboid reconstruction</span>
      </div>

      <select value={selectedProjectId ?? ""} onChange={event => setSelectedProjectId(event.target.value || null)}>
        <option value="">Select project</option>
        {projects.map(project => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>

      <form
        className="new-project-form"
        onSubmit={event => {
          event.preventDefault();
          const name = newProjectName.trim();
          if (name) createProjectMutation.mutate(name);
        }}
      >
        <input value={newProjectName} onChange={event => setNewProjectName(event.target.value)} placeholder="New project" />
        <button type="submit">Create</button>
      </form>

      <button type="button" onClick={() => setHelpOpen(true)}>
        Help
      </button>

      {isHelpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
    </header>
  );
}
