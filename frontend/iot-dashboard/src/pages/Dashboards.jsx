import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet, apiSend } from "../lib/api";

export default function Dashboards() {
  const navigate = useNavigate();
  const [dashboards, setDashboards] = useState([]);
  const [search, setSearch] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({ name: "", alias: "" });

  const loadDashboards = async () => {
    try {
      setError("");
      setDashboards(await apiGet("/api/dashboards"));
    } catch (error) {
      console.error(error);
      setError("Failed to load dashboards. Check backend is running.");
    }
  };

  useEffect(() => {
    loadDashboards();
  }, []);

  const createDashboard = async () => {
    try {
      setIsCreating(true);
      setError("");
      setInfo("");
      const created = await apiSend("/api/dashboards", "POST", { name: "no name" });
      if (created?.id != null) {
        setDashboards((prev) => [...prev, created]);
      } else {
        await loadDashboards();
      }
      window.dispatchEvent(new Event("dashboards-updated"));
      setInfo("Dashboard created.");
    } catch (error) {
      console.error(error);
      setError("Create failed. Verify /api/dashboards POST is available on backend.");
    } finally {
      setIsCreating(false);
    }
  };

  const replaceDashboard = (updated) => {
    setDashboards((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    window.dispatchEvent(new Event("dashboards-updated"));
  };

  const toggleDefault = async (dashboard) => {
    try {
      const updated = await apiSend(`/api/dashboards/${dashboard.id}/default`, "PUT", { enabled: !dashboard.isDefault });
      replaceDashboard(updated);
      if (updated.isDefault) {
        setDashboards((prev) =>
          prev.map((item) => (item.id === updated.id ? updated : { ...item, isDefault: false }))
        );
      }
    } catch (e) {
      console.error(e);
      setError("Failed to set default dashboard.");
    }
  };

  const togglePublic = async (dashboard) => {
    try {
      const updated = await apiSend(`/api/dashboards/${dashboard.id}/public`, "PUT", { enabled: !dashboard.isPublic });
      replaceDashboard(updated);
      setInfo(updated.isPublic ? "Allow this Dashboard to be viewed by anyone." : "Public access removed.");
    } catch (e) {
      console.error(e);
      setError("Failed to update public status.");
    }
  };

  const togglePublished = async (dashboard) => {
    try {
      const updated = await apiSend(`/api/dashboards/${dashboard.id}/published`, "PUT", { enabled: !dashboard.isPublished });
      replaceDashboard(updated);
      setInfo(
        updated.isPublished ? "PUBLISHED: Allow this Dashboard on the menu." : "Dashboard removed from menu."
      );
    } catch (e) {
      console.error(e);
      setError("Failed to update published status.");
    }
  };

  const copyDashboard = async (dashboard) => {
    try {
      const copied = await apiSend(`/api/dashboards/${dashboard.id}/copy`, "POST");
      setDashboards((prev) => [...prev, copied]);
      window.dispatchEvent(new Event("dashboards-updated"));
      setInfo("Dashboard copied.");
    } catch (e) {
      console.error(e);
      setError("Failed to copy dashboard.");
    }
  };

  const deleteDashboard = async (dashboard) => {
    const ok = window.confirm(`Delete dashboard "${dashboard.name || "no name"}"?`);
    if (!ok) return;

    try {
      await apiSend(`/api/dashboards/${dashboard.id}`, "DELETE");
      setDashboards((prev) => prev.filter((item) => item.id !== dashboard.id));
      window.dispatchEvent(new Event("dashboards-updated"));
      setInfo("Dashboard deleted.");
    } catch (e) {
      console.error(e);
      setError("Failed to delete dashboard.");
    }
  };

  const startEdit = (dashboard) => {
    setEditingId(dashboard.id);
    setEditDraft({
      name: dashboard.name || "no name",
      alias: dashboard.alias || "",
    });
    setError("");
    setInfo("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft({ name: "", alias: "" });
  };

  const saveEdit = async (dashboard) => {
    try {
      const updated = await apiSend(`/api/dashboards/${dashboard.id}`, "PUT", {
        name: editDraft.name,
        alias: editDraft.alias,
        layoutJson: dashboard.layoutJson || "{}",
      });
      replaceDashboard(updated);
      setInfo("Dashboard name and alias updated.");
      cancelEdit();
    } catch (e) {
      console.error(e);
      setError("Failed to update name/alias.");
    }
  };

  const filteredDashboards = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return dashboards;
    return dashboards.filter((dashboard) => {
      const name = (dashboard.name || "").toLowerCase();
      const alias = (dashboard.alias || "").toLowerCase();
      return (
        name.includes(term) ||
        alias.includes(term) ||
        String(dashboard.id).includes(term)
      );
    });
  }, [dashboards, search]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="page-title">Dashboards</h2>
          <button type="button" onClick={createDashboard} className="btn-muted px-4 py-2" disabled={isCreating}>
            {isCreating ? "Creating..." : "New+"}
          </button>
        </div>
        <input
          className="input w-72"
          placeholder="Search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div className="card overflow-hidden">
        {error && <p className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">{error}</p>}
        {info && <p className="border-b border-emerald-200 bg-emerald-50 px-5 py-3 text-sm text-emerald-700">{info}</p>}
        {filteredDashboards.length === 0 ? (
          <p className="p-5 text-slate-500">No dashboards found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="table-head">
                  <th className="px-3 py-2.5">Id</th>
                  <th className="px-3 py-2.5">Name</th>
                  <th className="px-3 py-2.5">Alias</th>
                  <th className="px-3 py-2.5 text-center">Edit</th>
                  <th className="px-3 py-2.5 text-center">Default</th>
                  <th className="px-3 py-2.5 text-center">Public</th>
                  <th className="px-3 py-2.5 text-center">Published</th>
                  <th className="px-3 py-2.5 text-center">Copy</th>
                  <th className="px-3 py-2.5 text-center">Settings</th>
                  <th className="px-3 py-2.5 text-center">Delete</th>
                  <th className="px-3 py-2.5 text-center">Go</th>
                </tr>
              </thead>
              <tbody>
                {filteredDashboards.map((dashboard) => (
                  <tr key={dashboard.id} className="border-b border-slate-200 last:border-b-0">
                    <td className="px-3 py-2.5 text-slate-700">{dashboard.id}</td>
                    <td className="px-3 py-2.5 font-medium text-slate-900">
                      {editingId === dashboard.id ? (
                        <input
                          className="input min-w-40 py-1.5"
                          value={editDraft.name}
                          onChange={(event) => setEditDraft((prev) => ({ ...prev, name: event.target.value }))}
                        />
                      ) : (
                        dashboard.name || "no name"
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-slate-700">
                      {editingId === dashboard.id ? (
                        <input
                          className="input min-w-40 py-1.5"
                          value={editDraft.alias}
                          onChange={(event) => setEditDraft((prev) => ({ ...prev, alias: event.target.value }))}
                        />
                      ) : (
                        dashboard.alias || "-"
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {editingId === dashboard.id ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => saveEdit(dashboard)}
                            className="rounded border bg-emerald-600 px-2 py-1 text-xs font-semibold text-white"
                            title="Save name and alias"
                          >
                            SAVE
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="rounded border bg-white px-2 py-1 text-xs text-slate-700"
                            title="Cancel edit"
                          >
                            CANCEL
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEdit(dashboard)}
                          className="rounded border bg-white px-3 py-1.5 text-slate-700"
                          title="Edit name and alias"
                        >
                          EDIT
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => toggleDefault(dashboard)}
                        className={`rounded border px-3 py-1.5 ${dashboard.isDefault ? "bg-blue-600 text-white" : "bg-white text-slate-700"}`}
                        title="Set as default dashboard"
                      >
                        DEF
                      </button>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => togglePublic(dashboard)}
                        className={`rounded border px-3 py-1.5 ${dashboard.isPublic ? "bg-blue-600 text-white" : "bg-white text-slate-700"}`}
                        title="Allow this Dashboard to be viewed by anyone"
                      >
                        PUB
                      </button>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => togglePublished(dashboard)}
                        className={`rounded border px-3 py-1.5 ${dashboard.isPublished ? "bg-blue-600 text-white" : "bg-white text-slate-700"}`}
                        title="PUBLISHED: Allow this Dashboard on the menu"
                      >
                        MENU
                      </button>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => copyDashboard(dashboard)}
                        className="rounded border bg-white px-3 py-1.5 text-slate-700"
                        title="Copy dashboard"
                      >
                        COPY
                      </button>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => navigate(`/dashboard/edit?id=${dashboard.id}`)}
                        className="rounded border bg-white px-3 py-1.5 text-slate-700"
                        title="Settings"
                      >
                        SET
                      </button>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => deleteDashboard(dashboard)}
                        className="rounded border bg-white px-3 py-1.5 text-slate-700"
                        title="Delete dashboard"
                      >
                        DEL
                      </button>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => navigate(`/dashboard/${dashboard.id}`)}
                        className="rounded border bg-white px-3 py-1.5 text-slate-700"
                        title="Open dashboard page"
                      >
                        GO
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
