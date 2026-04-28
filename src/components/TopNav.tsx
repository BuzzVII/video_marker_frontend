import { ChangeEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAtom } from "jotai";
import { FaQuestionCircle } from "react-icons/fa";
import { createProject, fetchProjects } from "../api/client";
import { selectedProjectIdAtom } from "../state/annotationAtoms";
import { HelpModal } from "./HelpModal";

export function TopNav() {
  const queryClient = useQueryClient();
  const [selectedProjectId, setSelectedProjectId] = useAtom(selectedProjectIdAtom);
  const [helpOpen, setHelpOpen] = useState(false);

  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: fetchProjects,
  });

  const createProjectMutation = useMutation({
    mutationFn: createProject,
    onSuccess: project => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setSelectedProjectId(project.id);
    },
  });

  function onProjectChange(event: ChangeEvent<HTMLSelectElement>) {
    setSelectedProjectId(event.target.value || null);
  }

  function onCreateProject() {
    const name = window.prompt("Project name", "House scan");
    if (!name?.trim()) return;
    createProjectMutation.mutate(name.trim());
  }

  return (
    <>
      <header className="top-nav">
        <div className="brand-block">
          <div className="brand-title">Video Marker</div>
          <div className="brand-subtitle">House correspondence annotation</div>
        </div>

        <div className="project-picker">
          <label htmlFor="project-select">Project</label>
          <select
            id="project-select"
            value={selectedProjectId ?? ""}
            onChange={onProjectChange}
            disabled={projectsQuery.isLoading}
          >
            <option value="" disabled>
              {projectsQuery.isLoading ? "Loading projects..." : "Select project"}
            </option>
            {(projectsQuery.data ?? []).map(project => (
              <option key={project.id} value={project.id}>
                {project.name} ({project.image_set_count})
              </option>
            ))}
          </select>

          <button
            className="nav-button"
            type="button"
            onClick={onCreateProject}
            disabled={createProjectMutation.isPending}
          >
            {createProjectMutation.isPending ? "Creating..." : "New project"}
          </button>
        </div>

        <button
          className="help-button"
          type="button"
          aria-label="About this app"
          onClick={() => setHelpOpen(true)}
        >
          <FaQuestionCircle />
        </button>
      </header>

      {createProjectMutation.error ? (
        <div className="nav-error">Create project failed: {createProjectMutation.error.message}</div>
      ) : null}

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  );
}
