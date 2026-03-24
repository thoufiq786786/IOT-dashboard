import { useEffect, useMemo, useRef, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { apiGet } from "../lib/api";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const colors = ["#eab308", "#2563eb", "#16a34a", "#dc2626", "#7c3aed", "#ea580c", "#0891b2", "#db2777"];

function feedTitle(feed) {
  return feed?.input?.name || feed?.name || `Feed ${feed?.id}`;
}

function formatTsLabel(ts) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  const month = d.toLocaleString("default", { month: "short" });
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${month} ${day} ${hh}:${mm}`;
}

function buildChartSeries(selectedFeedIds, selectedAxisByFeed, feeds, dataByFeed, showMissingData) {
  const selectedFeeds = selectedFeedIds.map((id) => feeds.find((f) => f.id === id)).filter(Boolean);
  
  // Collect all unique timestamps
  const labelSet = new Set();
  selectedFeeds.forEach((f) => (dataByFeed[f.id] || []).forEach((p) => labelSet.add(p.timestamp)));
  let labels = Array.from(labelSet).sort((a, b) => new Date(a) - new Date(b));

  // If we ARE showing missing data (meaning we WANT to see the visual gaps), we need to inject null points.
  // We do this by finding gaps significantly larger than the median interval.
  if (showMissingData && labels.length > 2) {
    const times = labels.map(t => new Date(t).getTime());
    let intervals = [];
    for(let i=1; i<times.length; i++) intervals.push(times[i] - times[i-1]);
    
    // Simple median approximation to find the "expected" interval
    intervals.sort((a,b) => a-b);
    const medianInterval = intervals[Math.floor(intervals.length / 2)];
    const gapThreshold = Math.max(medianInterval * 3, 5 * 60000); // at least 3x the median or 5 mins

    const newLabels = [];
    for (let i = 0; i < labels.length - 1; i++) {
        newLabels.push(labels[i]);
        const diff = times[i+1] - times[i];
        if (diff > gapThreshold) {
            // Inject a fake "gap" node right after this point so the line breaks
            const fakeGapTime = new Date(times[i] + 1000).toISOString();
            newLabels.push(fakeGapTime); 
        }
    }
    newLabels.push(labels[labels.length - 1]);
    labels = newLabels;
  }

  const datasets = selectedFeeds.map((feed, index) => {
    const color = colors[index % colors.length];
    const map = new Map((dataByFeed[feed.id] || []).map((p) => [p.timestamp, p.value]));
    return {
      label: `${feed.input?.device?.name || ""}: ${feedTitle(feed)}`,
      data: labels.map((ts) => (map.has(ts) ? map.get(ts) : null)),
      borderColor: color,
      backgroundColor: color,
      yAxisID: selectedAxisByFeed[feed.id] === "right" ? "y1" : "y",
      borderWidth: 2,
      pointRadius: 0,
      spanGaps: !showMissingData, // If true, lines connect across nulls. If false, lines break on nulls.
      tension: 0.15,
    };
  });

  return { labels, datasets };
}

export default function Graph() {
  const chartRef = useRef(null);
  const [feeds, setFeeds] = useState([]);
  const [openDevice, setOpenDevice] = useState({});
  const [selectedFeedIds, setSelectedFeedIds] = useState([]);
  const [selectedAxisByFeed, setSelectedAxisByFeed] = useState({});
  const [dataByFeed, setDataByFeed] = useState({});
  const [showMissingData, setShowMissingData] = useState(true);
  const [showLegend, setShowLegend] = useState(true);
  const [showFeedTag, setShowFeedTag] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dragStartIndex, setDragStartIndex] = useState(null);
  const [dragEndIndex, setDragEndIndex] = useState(null);
  const [windowRange, setWindowRange] = useState(null);

  // Time Window Logic
  const [timeRangeSpan, setTimeRangeSpan] = useState(7 * 24 * 60 * 60 * 1000); // Default to 1 week
  const [endTimeTs, setEndTimeTs] = useState(Date.now()); // Default to "Now"


  useEffect(() => {
    const load = async () => {
      try {
        const list = await apiGet("/api/feeds");
        setFeeds(list);
        const firstDevice = list.find((x) => x.input?.device?.id)?.input?.device?.id;
        if (firstDevice != null) setOpenDevice({ [firstDevice]: true });
        const firstFeed = list.find((x) => x.input?.device?.id === firstDevice);
        if (firstFeed) {
          setSelectedFeedIds([firstFeed.id]);
          setSelectedAxisByFeed({ [firstFeed.id]: "left" });
        }
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, []);

  const groups = useMemo(() => {
    const map = new Map();
    feeds.forEach((feed) => {
      const device = feed.input?.device;
      if (!device) return;
      if (!map.has(device.id)) map.set(device.id, { device, feeds: [] });
      map.get(device.id).feeds.push(feed);
    });
    return Array.from(map.values());
  }, [feeds]);

  useEffect(() => {
    if (selectedFeedIds.length === 0) return;

    const loadSeries = async () => {
      try {
        const formatLocalIso = (ts) => {
          const d = new Date(ts);
          const pad = (n) => String(n).padStart(2, '0');
          return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
        };

        const startIso = formatLocalIso(endTimeTs - timeRangeSpan);
        const endIso = formatLocalIso(endTimeTs);
        const qs = `?start_date=${startIso}&end_date=${endIso}`;

        const results = await Promise.all(selectedFeedIds.map((id) => apiGet(`/api/feeddata/${id}${qs}`)));
        const next = {};
        selectedFeedIds.forEach((id, i) => {
          next[id] = [...results[i]].reverse();
        });
        setDataByFeed((prev) => ({ ...prev, ...next }));
      } catch (e) {
        console.error("Graph data error:", e);
      }
    };

    loadSeries();
  }, [selectedFeedIds, endTimeTs, timeRangeSpan]);

  const chartData = useMemo(
    () => buildChartSeries(selectedFeedIds, selectedAxisByFeed, feeds, dataByFeed, showMissingData),
    [selectedFeedIds, selectedAxisByFeed, feeds, dataByFeed, showMissingData]
  );

  const toggleFeedAxis = (feedId, axis) => {
    const currentAxis = selectedAxisByFeed[feedId];
    setSelectedAxisByFeed((prev) => {
      const next = { ...prev };
      if (currentAxis === axis) {
        delete next[feedId];
      } else {
        next[feedId] = axis;
      }
      return next;
    });
    setSelectedFeedIds((prev) => {
      const has = prev.includes(feedId);
      if (has && currentAxis === axis) {
        return prev.filter((id) => id !== feedId);
      }
      if (has) return prev;
      return [...prev, feedId];
    });
  };

  const hasLeftAxisSeries = useMemo(
    () => selectedFeedIds.some((id) => (selectedAxisByFeed[id] || "left") === "left"),
    [selectedFeedIds, selectedAxisByFeed]
  );
  const hasRightAxisSeries = useMemo(
    () => selectedFeedIds.some((id) => selectedAxisByFeed[id] === "right"),
    [selectedFeedIds, selectedAxisByFeed]
  );

  useEffect(() => {
    // Cleanup: if feed was deselected elsewhere, remove axis mapping.
    setSelectedAxisByFeed((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        if (!selectedFeedIds.includes(Number(k))) delete next[k];
      });
      return next;
    });
  }, [selectedFeedIds]);

  const getIndexFromEvent = (event) => {
    const chart = chartRef.current;
    if (!chart || !chart.scales?.x || !chart.chartArea) return null;
    const rect = chart.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    if (x < chart.chartArea.left || x > chart.chartArea.right) return null;
    const raw = chart.scales.x.getValueForPixel(x);
    if (raw == null || Number.isNaN(raw)) return null;
    const index = Math.round(raw);
    const max = (chartData.labels?.length || 1) - 1;
    return Math.max(0, Math.min(index, max));
  };

  const onChartMouseDown = (event) => {
    const idx = getIndexFromEvent(event);
    if (idx == null) return;
    setDragStartIndex(idx);
    setDragEndIndex(idx);
  };

  const onChartMouseMove = (event) => {
    if (dragStartIndex == null) return;
    const idx = getIndexFromEvent(event);
    if (idx == null) return;
    setDragEndIndex(idx);
  };

  const finishDrag = () => {
    if (dragStartIndex == null || dragEndIndex == null) {
      setDragStartIndex(null);
      setDragEndIndex(null);
      return;
    }
    const min = Math.min(dragStartIndex, dragEndIndex);
    const max = Math.max(dragStartIndex, dragEndIndex);
    if (min !== max) {
      setWindowRange({ min, max });
    }
    setDragStartIndex(null);
    setDragEndIndex(null);
  };

  const handleDownloadCSV = () => {
    if (!chartData || !chartData.labels || chartData.labels.length === 0) {
      alert("No data to download.");
      return;
    }

    // Build the CSV Header
    const headers = ["Timestamp", ...chartData.datasets.map(d => `"${d.label}"`)];
    
    // Build the CSV Rows
    const rows = chartData.labels.map((timestamp, index) => {
      const rowData = [timestamp];
      chartData.datasets.forEach(dataset => {
        rowData.push(dataset.data[index] !== null ? dataset.data[index] : "");
      });
      return rowData.join(",");
    });

    // Combine and download
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `graph_export_${new Date().toISOString().replace(/:/g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const selectedRows = selectedFeedIds
    .map((id) => feeds.find((f) => f.id === id))
    .filter(Boolean)
    .map((feed, i) => ({
      id: feed.id,
      name: `${feed.input?.device?.name || ""}:${feedTitle(feed)}`,
      color: colors[i % colors.length],
      type: "Lines",
    }));

  return (
    <div className="overflow-hidden rounded-xl border border-slate-300 bg-slate-100 shadow-sm">
      {/* <div className="flex h-11 items-center border-b border-slate-300 bg-slate-900 px-4 text-base font-semibold text-slate-100">
        Graph
      </div> */}

      <div className="grid min-h-[760px] grid-cols-12">
        {sidebarOpen && (
          <aside className="col-span-3 border-r border-slate-800 bg-slate-900 text-slate-200">
          <div className="border-b border-slate-700 px-4 py-3 text-2xl font-semibold tracking-tight">Graph</div>
          <div className="max-h-[720px] overflow-auto pb-2">
            {groups.map((group) => {
              const isOpen = !!openDevice[group.device.id];
              return (
                <div key={group.device.id} className="border-b border-slate-700/70">
                  <button
                    onClick={() => setOpenDevice((p) => ({ ...p, [group.device.id]: !p[group.device.id] }))}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xl font-semibold tracking-tight hover:bg-slate-800/70"
                  >
                    <span className="text-xs">{isOpen ? "v" : ">"}</span>
                    {group.device.name}
                  </button>

                  {isOpen &&
                    group.feeds.map((feed) => (
                      <label
                        key={feed.id}
                        className="grid cursor-pointer grid-cols-[minmax(0,1fr)_14px_16px_14px_16px] items-center gap-x-2 px-5 py-2 text-sm hover:bg-slate-800/60"
                      >
                        <span className="truncate pr-2 text-slate-100">{feedTitle(feed)}</span>
                        <span className="text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400">L</span>
                        <input
                          className="h-3.5 w-3.5 justify-self-center accent-sky-500"
                          type="checkbox"
                          title="Left Y-axis"
                          checked={selectedFeedIds.includes(feed.id) && (selectedAxisByFeed[feed.id] || "left") === "left"}
                          onChange={() => toggleFeedAxis(feed.id, "left")}
                        />
                        <span className="text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400">R</span>
                        <input
                          className="h-3.5 w-3.5 justify-self-center accent-sky-500"
                          type="checkbox"
                          title="Right Y-axis"
                          checked={selectedFeedIds.includes(feed.id) && selectedAxisByFeed[feed.id] === "right"}
                          onChange={() => toggleFeedAxis(feed.id, "right")}
                        />
                      </label>
                    ))}
                </div>
              );
            })}
          </div>
          </aside>
        )}

        <section className={`${sidebarOpen ? "col-span-9" : "col-span-12"} bg-slate-100 pt-4 pr-4 pb-4 pl-0`}>
          <h3 className="mb-3 px-4 text-4xl font-semibold tracking-tight text-slate-900">Data viewer</h3>
          <div className="mb-3 ml-0 mr-0 flex items-center justify-between rounded border border-slate-300 bg-slate-100 px-2 py-1 text-sm">
            <div className="flex items-center gap-1.5">
              {!sidebarOpen && (
                <button
                  className="rounded border border-slate-300 bg-white px-3 py-1 text-slate-700 hover:bg-slate-50"
                  onClick={() => setSidebarOpen(true)}
                  title="Show device list"
                >
                  List
                </button>
              )}
              <button className="rounded border border-slate-300 bg-white px-3 py-1 font-medium text-slate-700 hover:bg-slate-50" onClick={() => {
                setWindowRange(null);
                setEndTimeTs(Date.now());
                setTimeRangeSpan(7 * 24 * 60 * 60 * 1000);
              }}>Reset</button>

              <button className="rounded border border-slate-300 bg-emerald-50 px-3 py-1 font-medium text-emerald-700 hover:bg-emerald-100 flex items-center gap-1" onClick={handleDownloadCSV} title="Download displayed data as CSV">
                <span>⬇️</span> CSV
              </button>
              
              <select className="rounded border border-slate-300 bg-white px-3 py-1 text-slate-700"
                value={timeRangeSpan}
                onChange={(e) => {
                  setTimeRangeSpan(Number(e.target.value));
                  setEndTimeTs(Date.now()); // Snap back to present when changing scale
                  setWindowRange(null);
                }}>
                <option value={60 * 60 * 1000}>1 Hour</option>
                <option value={12 * 60 * 60 * 1000}>12 Hours</option>
                <option value={24 * 60 * 60 * 1000}>1 Day</option>
                <option value={3 * 24 * 60 * 60 * 1000}>3 Days</option>
                <option value={7 * 24 * 60 * 60 * 1000}>1 Week</option>
                <option value={30 * 24 * 60 * 60 * 1000}>1 Month</option>
              </select>
              
              <button title="Zoom In" onClick={() => setTimeRangeSpan(prev => Math.max(60000, prev / 2))} className="rounded border border-slate-300 bg-white px-3 py-1 text-slate-700 hover:bg-slate-50">+</button>
              <button title="Zoom Out" onClick={() => setTimeRangeSpan(prev => prev * 2)} className="rounded border border-slate-300 bg-white px-3 py-1 text-slate-700 hover:bg-slate-50">-</button>
              <button title="Pan Left" onClick={() => setEndTimeTs(prev => prev - (timeRangeSpan / 2))} className="rounded border border-slate-300 bg-white px-3 py-1 text-slate-700 hover:bg-slate-50">&lt;</button>
              <button title="Pan Right" onClick={() => setEndTimeTs(prev => Math.min(Date.now(), prev + (timeRangeSpan / 2)))} className="rounded border border-slate-300 bg-white px-3 py-1 text-slate-700 hover:bg-slate-50">&gt;</button>
            </div>
            <div className="rounded border border-slate-300 bg-white px-2 py-1 text-slate-700">
              <label className="mr-3 inline-flex items-center gap-1">
                <span>Show</span>
              </label>
              <label className="mr-3 inline-flex items-center gap-1">
                <span>missing data:</span>
                <input
                  type="checkbox"
                  checked={showMissingData}
                  onChange={(e) => setShowMissingData(e.target.checked)}
                />
              </label>
              <label className="mr-3 inline-flex items-center gap-1">
                <span>legend:</span>
                <input type="checkbox" checked={showLegend} onChange={(e) => setShowLegend(e.target.checked)} />
              </label>
              <label className="inline-flex items-center gap-1">
                <span>feed tag:</span>
                <input type="checkbox" checked={showFeedTag} onChange={(e) => setShowFeedTag(e.target.checked)} />
              </label>
            </div>
          </div>

          <div
            className="rounded border border-slate-400 bg-slate-100 p-0"
            onMouseDown={onChartMouseDown}
            onMouseMove={onChartMouseMove}
            onMouseUp={finishDrag}
            onMouseLeave={finishDrag}
          >
            <Line
              ref={chartRef}
              data={{
                labels: chartData.labels,
                datasets: chartData.datasets.map((d) => ({
                  ...d,
                  label: showFeedTag ? d.label : d.label.split(": ").slice(1).join(": ") || d.label,
                })),
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: showLegend,
                    position: "top",
                    align: "start",
                    labels: { boxWidth: 10, boxHeight: 10, color: "#555" },
                  },
                },
                scales: {
                  x: {
                    min: windowRange?.min,
                    max: windowRange?.max,
                    ticks: {
                      autoSkip: true,
                      maxTicksLimit: 12,
                      color: "#555",
                      maxRotation: 0,
                      callback: function (value) {
                        const raw = this.getLabelForValue(value);
                        return formatTsLabel(raw);
                      },
                    },
                    grid: { color: "rgba(0,0,0,0.12)" },
                  },
                  y: {
                    display: hasLeftAxisSeries,
                    position: "left",
                    ticks: { color: "#555" },
                    grid: { color: "rgba(0,0,0,0.12)" },
                  },
                  y1: {
                    display: hasRightAxisSeries,
                    position: "right",
                    ticks: { color: "#555" },
                    grid: { drawOnChartArea: false },
                  },
                },
              }}
              height={430}
            />
          </div>

          <div className="mt-4 rounded border border-slate-300 bg-white shadow-sm">
            <div className="border-b border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">Feeds in view</div>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-600">
                  <th className="px-3 py-2">Feed</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Color</th>
                </tr>
              </thead>
              <tbody>
                {selectedRows.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-3 py-3 text-slate-500">
                      No feed selected.
                    </td>
                  </tr>
                )}
                {selectedRows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-200">
                    <td className="px-3 py-2">{row.name}</td>
                    <td className="px-3 py-2">{row.type}</td>
                    <td className="px-3 py-2">
                      <span className="inline-block h-3 w-8 rounded" style={{ backgroundColor: row.color }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Data Table View */}
          {chartData.labels && chartData.labels.length > 0 && (
            <div className="mt-4 rounded border border-slate-300 bg-white shadow-sm overflow-hidden flex flex-col">
              <div className="border-b border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">Data Table</div>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="sticky top-0 bg-slate-50 text-slate-600 shadow-sm z-10">
                    <tr>
                      <th className="px-3 py-2 bg-slate-50 border-b border-slate-200">Timestamp</th>
                      {chartData.datasets.map((d, i) => (
                        <th key={i} className="px-3 py-2 bg-slate-50 border-b border-slate-200">{d.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {chartData.labels.slice(0, 1000).map((ts, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-3 py-1.5 text-slate-500">{formatTsLabel(ts)}</td>
                        {chartData.datasets.map((d, i) => (
                          <td key={i} className="px-3 py-1.5 font-medium">
                            {d.data[idx] !== null ? d.data[idx] : "-"}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {chartData.labels.length > 1000 && (
                      <tr className="bg-slate-50">
                        <td colSpan={chartData.datasets.length + 1} className="px-4 py-3 text-center text-slate-500 italic">
                          Showing first 1000 rows to optimize performance. Please use the CSV button to download all {chartData.labels.length} rows.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

