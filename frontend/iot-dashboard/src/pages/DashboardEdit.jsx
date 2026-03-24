import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiGet, apiSend } from "../lib/api";

export default function DashboardEdit() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [form, setForm] = useState({ name: "", alias: "", layoutJson: "{}" });
  const [mode, setMode] = useState("blank");

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!id) {
        setError("Dashboard id is missing.");
        setLoading(false);
        return;
      }

      try {
        setError("");
        const dashboard = await apiGet(`/api/dashboards/${id}`);
        if (!active) return;
        setForm({
          name: dashboard?.name || "no name",
          alias: dashboard?.alias || "",
          layoutJson: dashboard?.layoutJson || "{}",
        });
        try {
          const parsed = JSON.parse(dashboard?.layoutJson || "{}");
          if (parsed?.mode === "react") {
            setMode("react");
          } else if (parsed?.mode === "live") {
            setMode("live");
          } else {
            setMode("blank");
          }
        } catch (_) {
          setMode("blank");
        }
      } catch (e) {
        console.error(e);
        if (active) setError("Failed to load dashboard.");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [id]);

  const hasId = useMemo(() => Boolean(id), [id]);

  const save = async () => {
    if (!hasId) return;
    try {
      setInfo("");
      setError("");
      await apiSend(`/api/dashboards/${id}`, "PUT", {
        ...form,
        layoutJson: JSON.stringify({ mode }),
      });
      window.dispatchEvent(new Event("dashboards-updated"));
      setInfo("Dashboard saved.");
    } catch (e) {
      console.error(e);
      setError("Failed to save dashboard.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="field-label">Name</label>
            <input
              className="input"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            />
          </div>
          <div>
            <label className="field-label">Alias</label>
            <input
              className="input"
              value={form.alias}
              onChange={(event) => setForm((prev) => ({ ...prev, alias: event.target.value }))}
            />
          </div>
          <div className="flex items-end gap-2">
            <button type="button" className="btn-primary" onClick={save} disabled={loading || !hasId}>
              Save
            </button>
            <button type="button" className="btn-muted" onClick={() => navigate("/dashboard/list")}>
              Back
            </button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-slate-700">Page Mode:</span>
          <button
            type="button"
            onClick={() => setMode("blank")}
            className={`rounded border px-3 py-1.5 text-sm ${mode === "blank" ? "bg-blue-600 text-white" : "bg-white text-slate-700"}`}
          >
            Blank Page
          </button>
          <button
            type="button"
            onClick={() => setMode("live")}
            className={`rounded border px-3 py-1.5 text-sm ${mode === "live" ? "bg-blue-600 text-white" : "bg-white text-slate-700"}`}
          >
            Live Dashboard
          </button>
          <button
            type="button"
            onClick={() => setMode("react")}
            className={`rounded border px-3 py-1.5 text-sm ${mode === "react" ? "bg-blue-600 text-white" : "bg-white text-slate-700"}`}
          >
            React Frontend
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
        {info && <p className="mt-3 text-sm text-emerald-700">{info}</p>}
      </div>

      <div className="relative min-h-[560px] overflow-hidden rounded-lg border border-slate-300 bg-[#dbe3ea]">
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(100,116,139,0.28) 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="absolute right-4 top-4 z-10 w-40 rounded border border-slate-400 bg-slate-100 shadow-sm">
          <div className="border-b border-slate-300 px-3 py-1 text-center text-sm font-semibold text-slate-700">Toolbox</div>
          <div className="grid grid-cols-4 gap-1 p-2 text-xs">
            <button className="rounded border border-slate-300 bg-white px-2 py-1">SET</button>
            <button className="rounded border border-slate-300 bg-white px-2 py-1">UNDO</button>
            <button className="rounded border border-slate-300 bg-white px-2 py-1">CLR</button>
            <button className="rounded border border-slate-300 bg-white px-2 py-1">EYE</button>
            <button className="col-span-2 rounded border border-slate-300 bg-white px-2 py-1">TXT</button>
            <button className="col-span-2 rounded border border-slate-300 bg-white px-2 py-1">BOX</button>
            <button className="col-span-2 rounded border border-slate-300 bg-white px-2 py-1">GAUGE</button>
            <button className="col-span-2 rounded border border-slate-300 bg-white px-2 py-1">CHART</button>
            <button
              className={`col-span-4 rounded border px-2 py-1 ${mode === "react" ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white"}`}
              type="button"
              onClick={() => setMode("react")}
            >
              React Frontend
            </button>
          </div>
          <div className="p-2">
            <div className="rounded bg-emerald-600 py-1 text-center text-xs font-semibold text-white">Not modified</div>
          </div>
        </div>
      </div>
    </div>
  );
}
