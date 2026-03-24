import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiGet, apiSend } from "../lib/api";

function buildBootstrapDocument(content) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link
      href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"
      rel="stylesheet"
    />
    <style>
      html,body{margin:0;padding:0;background:#fff;overflow-x:hidden;}
      body{padding:16px;}
      .container,.container-fluid{max-width:100% !important;}
      img,table,canvas,svg,iframe,video{max-width:100% !important;height:auto;}
      *{box-sizing:border-box;}
    </style>
  </head>
  <body>${content || ""}</body>
</html>`;
}

function preprocessSandboxCode(raw) {
  let code = raw || "";
  code = code.replace(/^\s*import\s+.*$/gm, "");
  code = code.replace(/<style\s+jsx>/g, "<style>");
  code = code.replace(/export\s+default\s+([A-Za-z0-9_]+)\s*;?/g, "window.__SandboxComponent = $1;");
  if (!code.includes("window.__SandboxComponent") && code.includes("const EnergyDashboard")) {
    code += "\nwindow.__SandboxComponent = EnergyDashboard;";
  }
  return code.replace(/<\/script/gi, "<\\/script");
}

function buildReactSandboxDocument(sourceCode) {
  const safeCode = preprocessSandboxCode(sourceCode);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.canvasjs.com/canvasjs.min.js"></script>
    <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <style>
      html,body{margin:0;padding:0;background:#0f172a;color:#fff;overflow-x:hidden;}
      body{padding:12px;font-family:Segoe UI,Tahoma,sans-serif;}
      *{box-sizing:border-box;}
      #root{min-height:100vh;}
      .sandbox-error{white-space:pre-wrap;padding:12px;border-radius:8px;background:#450a0a;color:#fecaca;border:1px solid #7f1d1d;}
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="text/babel">
      const { useState, useEffect, useRef } = React;
      const iconBase = (children, { className = "", size = 16 } = {}) =>
        React.createElement(
          "svg",
          {
            xmlns: "http://www.w3.org/2000/svg",
            width: size,
            height: size,
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "2",
            strokeLinecap: "round",
            strokeLinejoin: "round",
            className,
            style: { display: "inline-block", verticalAlign: "middle" },
          },
          children
        );

      const LineChart = (props) =>
        iconBase(
          [
            React.createElement("path", { key: 1, d: "M3 3v18h18" }),
            React.createElement("path", { key: 2, d: "m19 9-5 5-4-4-3 3" }),
          ],
          props
        );

      const Calendar = (props) =>
        iconBase(
          [
            React.createElement("rect", { key: 1, x: "3", y: "4", width: "18", height: "18", rx: "2" }),
            React.createElement("path", { key: 2, d: "M16 2v4M8 2v4M3 10h18" }),
          ],
          props
        );

      const Zap = (props) =>
        iconBase([React.createElement("path", { key: 1, d: "M13 2 3 14h7l-1 8 10-12h-7z" })], props);

      const Download = (props) =>
        iconBase(
          [
            React.createElement("path", { key: 1, d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }),
            React.createElement("path", { key: 2, d: "M7 10l5 5 5-5" }),
            React.createElement("path", { key: 3, d: "M12 15V3" }),
          ],
          props
        );

      const Filter = (props) =>
        iconBase([React.createElement("path", { key: 1, d: "M3 5h18l-7 8v6l-4-2v-4z" })], props);

      const TrendingUp = (props) =>
        iconBase(
          [
            React.createElement("path", { key: 1, d: "M3 17l6-6 4 4 8-8" }),
            React.createElement("path", { key: 2, d: "M14 7h7v7" }),
          ],
          props
        );

      const Activity = (props) =>
        iconBase([React.createElement("path", { key: 1, d: "M22 12h-4l-3 8-4-16-3 8H2" })], props);

      const X = (props) =>
        iconBase(
          [
            React.createElement("path", { key: 1, d: "M18 6 6 18" }),
            React.createElement("path", { key: 2, d: "m6 6 12 12" }),
          ],
          props
        );

      const Check = (props) =>
        iconBase([React.createElement("path", { key: 1, d: "M20 6 9 17l-5-5" })], props);

      try {
        ${safeCode}
        const Comp = window.__SandboxComponent || (typeof EnergyDashboard !== "undefined" ? EnergyDashboard : null);
        if (!Comp) throw new Error("No component found. Keep component + export default.");
        const root = ReactDOM.createRoot(document.getElementById("root"));
        root.render(React.createElement(Comp));
      } catch (e) {
        const root = document.getElementById("root");
        root.innerHTML = '<div class="sandbox-error">Sandbox runtime error:\\n' + (e && e.stack ? e.stack : e) + "</div>";
      }
    </script>
  </body>
</html>`;
}

function InsertedReactFrontend() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-2xl font-semibold text-slate-900">React Frontend</h3>
        <p className="mt-2 text-sm text-slate-600">Inserted React frontend is enabled for this dashboard.</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [dashboardName, setDashboardName] = useState("Live Dashboard");
  const [dashboardAlias, setDashboardAlias] = useState("");
  const [dashboardMode, setDashboardMode] = useState("live");
  const [htmlContent, setHtmlContent] = useState("");
  const [sandboxCode, setSandboxCode] = useState("");
  const [htmlFrameHeight, setHtmlFrameHeight] = useState(680);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [htmlDraft, setHtmlDraft] = useState("");
  const [contentType, setContentType] = useState("html");
  const [saveError, setSaveError] = useState("");
  const [isSavingHtml, setIsSavingHtml] = useState(false);
  const htmlFrameRef = useRef(null);

  const [feeds, setFeeds] = useState([]);
  const [latestValues, setLatestValues] = useState([]);

  const loadFeeds = async () => {
    try {
      setFeeds(await apiGet("/api/feeds"));
    } catch (e) {
      console.error(e);
    }
  };

  const loadLatest = async () => {
    try {
      setLatestValues(await apiGet("/api/feeddata/latest"));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadFeeds();
    loadLatest();
    const timer = setInterval(loadLatest, 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    if (!id) {
      setDashboardName("Live Dashboard");
      setDashboardAlias("");
      setDashboardMode("live");
      setHtmlContent("");
      setSandboxCode("");
      return () => {
        active = false;
      };
    }

    apiGet(`/api/dashboards/${id}`)
      .then((dashboard) => {
        if (!active) return;
        setDashboardName(dashboard?.name || "no name");
        setDashboardAlias(dashboard?.alias || "");

        let mode = "blank";
        let savedHtml = "";
        let savedSandbox = "";
        try {
          const parsed = JSON.parse(dashboard?.layoutJson || "{}");
          if (parsed?.mode === "react") mode = "react";
          else if (parsed?.mode === "live") mode = "live";
          else if (parsed?.mode === "html") mode = "html";
          else if (parsed?.mode === "sandbox") mode = "sandbox";
          savedHtml = typeof parsed?.html === "string" ? parsed.html : "";
          savedSandbox = typeof parsed?.sandboxCode === "string" ? parsed.sandboxCode : "";
        } catch (_) {
          mode = "blank";
        }

        setDashboardMode(mode);
        setHtmlContent(savedHtml);
        setSandboxCode(savedSandbox);
        if (mode === "sandbox") {
          setContentType("sandbox");
          setHtmlDraft(savedSandbox);
        } else {
          setContentType("html");
          setHtmlDraft(savedHtml);
        }
      })
      .catch(() => {
        if (active) {
          setDashboardName("Dashboard");
          setDashboardAlias("");
          setDashboardMode("blank");
          setHtmlContent("");
          setSandboxCode("");
        }
      });

    return () => {
      active = false;
    };
  }, [id]);

  const latestByFeedId = useMemo(() => {
    const map = new Map();
    latestValues.forEach((item) => map.set(item.feed?.id, item));
    return map;
  }, [latestValues]);

  const offlineFeeds = useMemo(() => {
    const offlineItemNames = [];
    const now = Date.now();
    latestValues.forEach((item) => {
      if (!item.timestamp) return;
      const ts = new Date(item.timestamp).getTime();
      const minutesDiff = (now - ts) / 60000;
      if (minutesDiff >= 10 && item.feed?.name) {
        offlineItemNames.push(item.feed.name);
      }
    });
    return offlineItemNames;
  }, [latestValues]);

  const resizeHtmlFrame = () => {
    const frame = htmlFrameRef.current;
    if (!frame || !frame.contentDocument) return;
    const doc = frame.contentDocument;
    const bodyHeight = doc.body ? doc.body.scrollHeight : 0;
    const docHeight = doc.documentElement ? doc.documentElement.scrollHeight : 0;
    const nextHeight = Math.max(680, bodyHeight, docHeight);
    setHtmlFrameHeight(nextHeight + 8);
  };

  useEffect(() => {
    if (dashboardMode !== "html" && dashboardMode !== "sandbox") return;
    const timer = setTimeout(() => resizeHtmlFrame(), 200);
    return () => clearTimeout(timer);
  }, [dashboardMode, htmlContent, sandboxCode]);

  const onConfigurationClick = () => {
    if (!id) {
      navigate("/dashboard/list");
      return;
    }
    setSaveError("");
    if (dashboardMode === "sandbox") {
      setContentType("sandbox");
      setHtmlDraft(sandboxCode);
    } else {
      setContentType("html");
      setHtmlDraft(htmlContent);
    }
    setShowConfigModal(true);
  };

  const saveHtmlConfiguration = async () => {
    if (!id) return;
    try {
      setIsSavingHtml(true);
      setSaveError("");
      await apiSend(`/api/dashboards/${id}`, "PUT", {
        name: dashboardName || "no name",
        alias: dashboardAlias || "",
        layoutJson:
          contentType === "sandbox"
            ? JSON.stringify({ mode: "sandbox", sandboxCode: htmlDraft })
            : JSON.stringify({ mode: "html", html: htmlDraft }),
      });
      if (contentType === "sandbox") {
        setDashboardMode("sandbox");
        setSandboxCode(htmlDraft);
      } else {
        setDashboardMode("html");
        setHtmlContent(htmlDraft);
      }
      setShowConfigModal(false);
      window.dispatchEvent(new Event("dashboards-updated"));
    } catch (e) {
      console.error(e);
      setSaveError("Failed to save page content.");
    } finally {
      setIsSavingHtml(false);
    }
  };

  const pageHeader = (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="page-title">{dashboardName}</h2>
        <button type="button" className="btn-muted px-4 py-2" onClick={onConfigurationClick}>
          Configuration
        </button>
      </div>
      
      {offlineFeeds.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 shadow-sm flex items-start gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <h4 className="font-bold text-red-800">Connection Lost</h4>
            <p className="text-sm text-red-700 mt-1">
              The following feeds have not reported data in over 10 minutes: 
              <span className="font-semibold block mt-1">{offlineFeeds.join(", ")}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );

  const configModal = showConfigModal && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-4xl rounded-xl border border-slate-300 bg-white p-4 shadow-lg">
        <h3 className="text-lg font-semibold text-slate-900">Page Content</h3>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            className={`rounded border px-3 py-1 text-sm ${contentType === "html" ? "bg-blue-600 text-white" : "bg-white text-slate-700"}`}
            onClick={() => {
              setContentType("html");
              setHtmlDraft(htmlContent);
            }}
          >
            Bootstrap HTML
          </button>
          <button
            type="button"
            className={`rounded border px-3 py-1 text-sm ${contentType === "sandbox" ? "bg-blue-600 text-white" : "bg-white text-slate-700"}`}
            onClick={() => {
              setContentType("sandbox");
              setHtmlDraft(sandboxCode);
            }}
          >
            React Sandbox
          </button>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          {contentType === "sandbox"
            ? "Paste React component code. Import/export lines are handled in sandbox."
            : "Paste single-page Bootstrap supported HTML snippet."}
        </p>
        <textarea
          className="input mt-3 min-h-[360px] font-mono text-sm"
          value={htmlDraft}
          onChange={(e) => setHtmlDraft(e.target.value)}
        />
        {saveError && <p className="mt-2 text-sm text-red-700">{saveError}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="btn-muted" onClick={() => setShowConfigModal(false)}>
            Cancel
          </button>
          <button type="button" className="btn-primary" disabled={isSavingHtml} onClick={saveHtmlConfiguration}>
            {isSavingHtml ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );

  if (id && dashboardMode === "blank") {
    return (
      <div className="space-y-6">
        {pageHeader}
        <div className="min-h-[640px] rounded-xl border border-slate-300 bg-white" />
        {configModal}
      </div>
    );
  }

  if (id && dashboardMode === "react") {
    return (
      <div className="space-y-6">
        {pageHeader}
        <InsertedReactFrontend />
        {configModal}
      </div>
    );
  }

  if (id && dashboardMode === "html") {
    return (
      <div className="space-y-6">
        {pageHeader}
        <div className="overflow-hidden rounded-xl border border-slate-300 bg-white">
          <iframe
            ref={htmlFrameRef}
            title="dashboard-html-content"
            className="block w-full border-0"
            style={{ height: `${htmlFrameHeight}px` }}
            srcDoc={buildBootstrapDocument(htmlContent)}
            sandbox="allow-same-origin allow-scripts allow-modals"
            onLoad={resizeHtmlFrame}
          />
        </div>
        {configModal}
      </div>
    );
  }

  if (id && dashboardMode === "sandbox") {
    return (
      <div className="space-y-6">
        {pageHeader}
        <div className="overflow-hidden rounded-xl border border-slate-300 bg-white">
          <iframe
            ref={htmlFrameRef}
            title="dashboard-react-sandbox"
            className="block w-full border-0"
            style={{ height: `${htmlFrameHeight}px` }}
            srcDoc={buildReactSandboxDocument(sandboxCode)}
            sandbox="allow-same-origin allow-scripts allow-modals"
            onLoad={resizeHtmlFrame}
          />
        </div>
        {configModal}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {pageHeader}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {feeds.slice(0, 4).map((feed) => {
          const latest = latestByFeedId.get(feed.id);
          return (
            <div key={feed.id} className="card p-5">
              <p className="text-xs uppercase tracking-wide text-slate-500">{feed.name}</p>
              <p className="mt-3 text-3xl font-bold text-slate-900">
                {latest ? Number(latest.value).toFixed(2) : "--"}
              </p>
              <p className="mt-2 text-xs text-slate-500">Updated: {latest?.timestamp || "No data yet"}</p>
            </div>
          );
        })}
      </div>
      <div className="card p-6">
        <h3 className="card-head">Feed Status</h3>
        {feeds.length === 0 ? (
          <p className="text-slate-500">No feeds configured yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="table-head">
                  <th className="px-3 py-2.5">Feed</th>
                  <th className="px-3 py-2.5">Input Register</th>
                  <th className="px-3 py-2.5">Interval</th>
                  <th className="px-3 py-2.5">Latest Value</th>
                  <th className="px-3 py-2.5">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {feeds.map((feed) => {
                  const latest = latestByFeedId.get(feed.id);
                  return (
                    <tr key={feed.id} className="border-b border-slate-200 last:border-b-0">
                      <td className="px-3 py-2.5 font-medium text-slate-900">{feed.name}</td>
                      <td className="px-3 py-2.5 text-slate-700">{feed.input?.registerAddress || "-"}</td>
                      <td className="px-3 py-2.5 text-slate-700">{feed.intervalSeconds}s</td>
                      <td className="px-3 py-2.5 text-slate-700">
                        {latest ? Number(latest.value).toFixed(2) : "--"}
                      </td>
                      <td className="px-3 py-2.5 text-slate-700">{latest?.timestamp || "--"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
