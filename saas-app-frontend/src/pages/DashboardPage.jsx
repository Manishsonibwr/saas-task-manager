import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import WorkspacesPanel from "../components/WorkspacesPanel";
import ProjectsPanel from "../components/ProjectsPanel";
import TasksBoard from "../components/TasksBoard";
import BillingPanel from "../components/BillingPanel";

function DashboardPage() {
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [error, setError] = useState("");
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      navigate("/login");
      return;
    }

    api
      .get("/me")
      .then((res) => setMe(res.data))
      .catch((err) => {
        console.error(err);
        setError("Failed to fetch user. Please log in again.");
        localStorage.removeItem("access_token");
        navigate("/login");
      });
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    navigate("/login");
  };

  const handleSelectWorkspace = (ws) => {
    setSelectedWorkspace(ws);
    setSelectedProject(null); // reset project when changing workspace
  };

  const handleSelectProject = (project) => {
    setSelectedProject(project);
  };

  if (!me && !error) {
    return (
      <div className="w-full flex items-center justify-center">
        <div className="text-sm text-slate-600">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto bg-white rounded-2xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold">SaaS Task Manager</h1>
          {me && (
            <p className="text-xs text-slate-500">Logged in as {me.email}</p>
          )}
        </div>

        <button
          onClick={handleLogout}
          className="text-xs px-3 py-1.5 rounded-md border border-slate-300 hover:bg-slate-100"
        >
          Logout
        </button>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[1fr,1.2fr,2fr] gap-4 min-h-[360px]">
        <WorkspacesPanel
          selectedWorkspaceId={selectedWorkspace?.id ?? null}
          onSelectWorkspace={handleSelectWorkspace}
        />
        <ProjectsPanel
          workspace={selectedWorkspace}
          selectedProjectId={selectedProject?.id ?? null}
          onSelectProject={handleSelectProject}
        />
        <TasksBoard project={selectedProject} />
      </div>

      <BillingPanel workspace={selectedWorkspace} />
    </div>
  );
}

export default DashboardPage;
