import { useEffect, useState } from "react";
import api from "../api/client";

function WorkspacesPanel({ selectedWorkspaceId, onSelectWorkspace }) {
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");

  const fetchWorkspaces = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/workspaces");
      setWorkspaces(res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to load workspaces.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError("");
    try {
      const res = await api.post("/workspaces", { name });
      setWorkspaces((prev) => [res.data, ...prev]);
      setName("");
    } catch (err) {
      console.error(err);
      setError("Failed to create workspace.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="bg-slate-50 rounded-xl p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-800">
          Workspaces
        </h2>
        <button
          onClick={fetchWorkspaces}
          className="text-xs px-2 py-1 rounded-md border border-slate-200 hover:bg-slate-100"
        >
          Refresh
        </button>
      </div>

      <form onSubmit={handleCreate} className="mb-3 flex gap-2">
        <input
          type="text"
          placeholder="New workspace name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 border rounded-md px-2 py-1 text-xs bg-white focus:ring-2 focus:ring-slate-300"
        />
        <button
          type="submit"
          disabled={creating}
          className="text-xs px-3 py-1 rounded-md bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {creating ? "Adding..." : "Add"}
        </button>
      </form>

      {error && (
        <div className="mb-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-2 py-1">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-xs text-slate-500">Loading workspaces...</p>
      ) : workspaces.length === 0 ? (
        <p className="text-xs text-slate-500">
          No workspaces yet. Create one above.
        </p>
      ) : (
        <ul className="space-y-1 overflow-y-auto text-sm">
          {workspaces.map((ws) => (
            <li key={ws.id}>
              <button
                type="button"
                onClick={() => onSelectWorkspace(ws)}
                className={`w-full text-left px-2 py-1 rounded-md border text-xs ${
                  selectedWorkspaceId === ws.id
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white hover:bg-slate-100 border-slate-200"
                }`}
              >
                {ws.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default WorkspacesPanel;
