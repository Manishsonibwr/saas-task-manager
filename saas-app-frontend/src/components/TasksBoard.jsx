import { useEffect, useState, useMemo } from "react";
import api from "../api/client";

const STATUS_COLUMNS = [
  { key: "todo", label: "To Do" },
  { key: "in_progress", label: "In Progress" },
  { key: "done", label: "Done" },
];

function TasksBoard({ project }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "medium",
  });

  // Fetch tasks whenever project changes
  useEffect(() => {
    if (!project) {
      setTasks([]);
      return;
    }
    const fetchTasks = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get(`/tasks/by-project/${project.id}`);
        setTasks(res.data);
      } catch (err) {
        console.error(err);
        const msg =
        err.response?.data?.detail || "Failed to create task.";
      setError(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [project]);

  const groupedTasks = useMemo(() => {
    return STATUS_COLUMNS.reduce((acc, col) => {
      acc[col.key] = tasks.filter((t) => t.status === col.key);
      return acc;
    }, {});
  }, [tasks]);

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!project || !form.title.trim()) return;
    setCreating(true);
    setError("");
    try {
      const payload = {
        title: form.title,
        description: form.description || null,
        status: "todo",
        priority: form.priority,
        project_id: project.id,
      };
      const res = await api.post("/tasks", payload);
      setTasks((prev) => [...prev, res.data]);
      setForm({ title: "", description: "", priority: "medium" });
    } catch (err) {
      console.error(err);
      setError("Failed to create task.");
    } finally {
      setCreating(false);
    }
  };

  const moveTaskStatus = async (taskId, newStatus) => {
    try {
      const res = await api.patch(`/tasks/${taskId}`, {
        status: newStatus,
      });
      setTasks((prev) => prev.map((t) => (t.id === taskId ? res.data : t)));
    } catch (err) {
      console.error(err);
      setError("Failed to update task status.");
    }
  };

  const deleteTask = async (taskId) => {
    try {
      await api.delete(`/tasks/${taskId}`);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      console.error(err);
      setError("Failed to delete task.");
    }
  };

  if (!project) {
    return (
      <div className="bg-slate-50 rounded-xl p-4 h-full">
        <h2 className="text-sm font-semibold text-slate-800 mb-2">
          Tasks
        </h2>
        <p className="text-xs text-slate-500">
          Select a project to see its tasks.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 rounded-xl p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">
            Tasks for: {project.name}
          </h2>
          <p className="text-xs text-slate-500">
            Organize work in columns by status.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleCreateTask}
        className="mb-3 grid grid-cols-1 md:grid-cols-[2fr,2fr,1fr,auto] gap-2"
      >
        <input
          type="text"
          name="title"
          placeholder="Task title"
          value={form.title}
          onChange={handleChange}
          className="border rounded-md px-2 py-1 text-xs bg-white focus:ring-2 focus:ring-slate-300"
        />
        <input
          type="text"
          name="description"
          placeholder="Description (optional)"
          value={form.description}
          onChange={handleChange}
          className="border rounded-md px-2 py-1 text-xs bg-white focus:ring-2 focus:ring-slate-300"
        />
        <select
          name="priority"
          value={form.priority}
          onChange={handleChange}
          className="border rounded-md px-2 py-1 text-xs bg-white focus:ring-2 focus:ring-slate-300"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <button
          type="submit"
          disabled={creating}
          className="text-xs px-3 py-1 rounded-md bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {creating ? "Adding..." : "Add task"}
        </button>
      </form>

      {error && (
        <div className="mb-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-2 py-1">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-xs text-slate-500">Loading tasks...</p>
      ) : (
        <div className="flex-1 overflow-x-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 min-h-[220px]">
            {STATUS_COLUMNS.map((col) => (
              <div
                key={col.key}
                className="bg-white border border-slate-200 rounded-lg p-2 flex flex-col"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-slate-800">
                    {col.label}
                  </h3>
                  <span className="text-[10px] text-slate-500">
                    {groupedTasks[col.key]?.length || 0} tasks
                  </span>
                </div>
                <div className="space-y-2 flex-1">
                  {groupedTasks[col.key]?.map((task) => (
                    <div
                      key={task.id}
                      className="border border-slate-200 rounded-md px-2 py-1 bg-slate-50 text-xs"
                    >
                      <div className="flex justify-between items-start gap-1">
                        <div>
                          <div className="font-semibold line-clamp-2">
                            {task.title}
                          </div>
                          {task.description && (
                            <div className="text-[11px] text-slate-500 line-clamp-2">
                              {task.description}
                            </div>
                          )}
                        </div>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                            task.priority === "high"
                              ? "bg-red-100 text-red-700"
                              : task.priority === "low"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {task.priority}
                        </span>
                      </div>
                      <div className="mt-2 flex gap-1">
                        {STATUS_COLUMNS.filter(
                          (s) => s.key !== task.status
                        ).map((s) => (
                          <button
                            key={s.key}
                            type="button"
                            onClick={() => moveTaskStatus(task.id, s.key)}
                            className="text-[10px] px-1.5 py-0.5 rounded-md border border-slate-200 hover:bg-slate-100"
                          >
                            Move to {s.label}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => deleteTask(task.id)}
                          className="ml-auto text-[10px] px-1.5 py-0.5 rounded-md border border-red-200 text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}

                  {groupedTasks[col.key]?.length === 0 && (
                    <p className="text-[11px] text-slate-400">
                      No tasks in this column.
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default TasksBoard;
