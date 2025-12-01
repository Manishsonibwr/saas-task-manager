import { useEffect, useState } from "react";
import api from "../api/client";

function ProjectsPanel({ workspace, selectedProjectId, onSelectProject }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    description: "",
  });

  useEffect(() => {
    if (!workspace) {
      setProjects([]);
      return;
    }
    const fetchProjects = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get(`/projects/by-workspace/${workspace.id}`);
        setProjects(res.data);
      } catch (err) {
        console.error(err);
        const msg =
        err.response?.data?.detail || "Failed to create project.";
        setError(msg)
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [workspace]);

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!workspace || !form.name.trim()) return;
    setCreating(true);
    setError("");
    try {
      const payload = {
        name: form.name,
        description: form.description || null,
        workspace_id: workspace.id,
      };
      const res = await api.post("/projects", payload);
      setProjects((prev) => [res.data, ...prev]);
      setForm({ name: "", description: "" });
    } catch (err) {
      console.error(err);
      setError("Failed to create project.");
    } finally {
      setCreating(false);
    }
  };

  if (!workspace) {
    return (
      <div className="bg-slate-50 rounded-xl p-4 h-full">
        <h2 className="text-sm font-semibold text-slate-800 mb-2">
          Projects
        </h2>
        <p className="text-xs text-slate-500">
          Select a workspace on the left to see its projects.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 rounded-xl p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">
            Projects in {workspace.name}
          </h2>
          <p className="text-xs text-slate-500">
            Manage projects under this workspace.
          </p>
        </div>
      </div>

      <form onSubmit={handleCreate} className="mb-3 space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            name="name"
            placeholder="New project name"
            value={form.name}
            onChange={handleChange}
            className="flex-1 border rounded-md px-2 py-1 text-xs bg-white focus:ring-2 focus:ring-slate-300"
          />
          <button
            type="submit"
            disabled={creating}
            className="text-xs px-3 py-1 rounded-md bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {creating ? "Adding..." : "Add"}
          </button>
        </div>
        <textarea
          name="description"
          placeholder="Project description (optional)"
          value={form.description}
          onChange={handleChange}
          className="w-full border rounded-md px-2 py-1 text-xs bg-white focus:ring-2 focus:ring-slate-300 min-h-[60px]"
        />
      </form>

      {error && (
        <div className="mb-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-2 py-1">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-xs text-slate-500">Loading projects...</p>
      ) : projects.length === 0 ? (
        <p className="text-xs text-slate-500">
          No projects yet for this workspace. Create one above.
        </p>
      ) : (
        <ul className="space-y-2 overflow-y-auto text-sm">
          {projects.map((project) => (
            <li key={project.id}>
              <button
                type="button"
                onClick={() => onSelectProject(project)}
                className={`w-full text-left border rounded-md px-3 py-2 ${
                  selectedProjectId === project.id
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white hover:bg-slate-100 border-slate-200"
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xs font-semibold">
                      {project.name}
                    </h3>
                    {project.description && (
                      <p className="text-[11px] text-slate-500">
                        {project.description}
                      </p>
                    )}
                  </div>
                  {project.archived && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                      Archived
                    </span>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ProjectsPanel;
