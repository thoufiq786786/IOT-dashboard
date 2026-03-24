import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet } from "../lib/api";

function formatAge(timestamp) {
  if (!timestamp) return "--";
  const then = new Date(timestamp);
  const diffSec = Math.max(0, Math.floor((Date.now() - then.getTime()) / 1000));
  if (diffSec < 60) return `${diffSec}s`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} mins`;
  return `${Math.floor(diffSec / 3600)} hrs`;
}

export default function Feeds() {
  const navigate = useNavigate();
  const [feeds, setFeeds] = useState([]);
  const [latestValues, setLatestValues] = useState([]);
  const [filter, setFilter] = useState("");
  const [expanded, setExpanded] = useState({});

  const loadFeeds = async () => {
    try {
      const list = await apiGet("/api/feeds");
      setFeeds(list);
      setExpanded((prev) => {
        const next = { ...prev };
        list.forEach((f) => {
          const id = f.input?.device?.id;
          if (id != null && next[id] == null) next[id] = true;
        });
        return next;
      });
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
    const timer = setInterval(loadLatest, 1000);
    return () => clearInterval(timer);
  }, []);

  const latestByFeedId = useMemo(() => {
    const map = new Map();
    latestValues.forEach((item) => map.set(item.feed?.id, item));
    return map;
  }, [latestValues]);

  const grouped = useMemo(() => {
    const byDevice = new Map();
    feeds.forEach((feed) => {
      const device = feed.input?.device;
      if (!device) return;
      const key = device.id;
      if (!byDevice.has(key)) byDevice.set(key, { device, feeds: [] });
      byDevice.get(key).feeds.push(feed);
    });

    const term = filter.trim().toLowerCase();
    return Array.from(byDevice.values()).filter((group) => {
      if (!term) return true;
      const deviceMatch = group.device.name?.toLowerCase().includes(term);
      const feedMatch = group.feeds.some(
        (f) =>
          f.name?.toLowerCase().includes(term) ||
          f.input?.name?.toLowerCase().includes(term) ||
          f.input?.registerAddress?.toLowerCase().includes(term)
      );
      return deviceMatch || feedMatch;
    });
  }, [feeds, filter]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="page-title">Feeds</h2>
        <input
          className="input w-72"
          placeholder="Filter feeds"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      <div className="card overflow-hidden">
        {grouped.length === 0 && <p className="p-5 text-slate-500">No feeds found.</p>}

        {grouped.map((group) => {
          const deviceId = group.device.id;
          const isOpen = expanded[deviceId];
          return (
            <div key={deviceId} className="border-b border-slate-200 last:border-b-0">
              <div className="group relative flex items-center justify-between bg-slate-50 px-4 py-3">
                <button
                  onClick={() => navigate(`/inputs?deviceId=${deviceId}`)}
                  className="flex items-center gap-2 text-left font-semibold text-slate-900 hover:text-blue-700"
                  title="Open device inputs"
                >
                  <span className="text-xs">{isOpen ? "v" : ">"}</span>
                  {group.device.name}:
                </button>

                <button
                  onClick={() => setExpanded((prev) => ({ ...prev, [deviceId]: !prev[deviceId] }))}
                  className="btn-muted px-3 py-1.5"
                >
                  {isOpen ? "Hide" : "Show"}
                </button>

                <div className="pointer-events-none absolute left-5 top-full z-30 hidden w-80 rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-700 shadow-lg group-hover:block">
                  <p className="font-semibold text-slate-900">{group.device.name}</p>
                  <p>IP: {group.device.ipAddress || "-"}</p>
                  <p>Port: {group.device.port || "-"}</p>
                  <p>Slave ID: {group.device.slaveId || "-"}</p>
                  <p>Status: {group.device.status || "-"}</p>
                  <p>Feeds: {group.feeds.length}</p>
                </div>
              </div>

              {isOpen && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="table-head">
                        <th className="w-[34%] px-4 py-2.5">Input</th>
                        <th className="w-[18%] px-4 py-2.5">Register</th>
                        <th className="w-[20%] px-4 py-2.5">Type</th>
                        <th className="w-[18%] px-4 py-2.5 text-right">Value</th>
                        <th className="w-[10%] px-4 py-2.5 text-right">Age</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.feeds.map((feed) => {
                        const latest = latestByFeedId.get(feed.id);
                        const value = latest?.value;
                        const age = formatAge(latest?.timestamp);
                        const hint = [
                          `Device: ${group.device.id}`,
                          `Feed: ${feed.name}`,
                          `Input: ${feed.input?.name || "-"}`,
                          `Register: ${feed.input?.registerAddress || "-"}`,
                          `Interval: ${feed.intervalSeconds || "-"}s`,
                          `Latest: ${value ?? "--"}`,
                          `Updated: ${latest?.timestamp || "--"}`,
                        ].join("\n");

                        return (
                          <tr key={feed.id} className="border-b border-slate-100 last:border-b-0" title={hint}>
                            <td className="px-4 py-2.5 text-slate-800">{feed.input?.name || feed.name}</td>
                            <td className="px-4 py-2.5 text-slate-700">{feed.input?.registerAddress || "-"}</td>
                            <td className="px-4 py-2.5 whitespace-nowrap text-slate-700">
                              FIXED ({feed.intervalSeconds || "-"}s)
                            </td>
                            <td className="px-4 py-2.5 text-right text-slate-800">
                              {value != null ? Number(value).toFixed(3) : "--"}
                            </td>
                            <td className="px-4 py-2.5 text-right font-medium text-emerald-600">{age}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
