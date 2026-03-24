import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiGet, apiSend } from "../lib/api";

const EMPTY_INPUT = { name: "", registerAddress: "" };
const LIVE_CACHE_KEY = "inputs_live_counter_cache_v1";

function loadLiveCache() {
  try {
    const raw = localStorage.getItem(LIVE_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveLiveCache(data) {
  try {
    localStorage.setItem(LIVE_CACHE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage errors.
  }
}

const PROCESS_GROUPS = [
  {
    label: "Main",
    items: [
      "Log to feed",
      "Power to kWh",
      "Wh Accumulator",
      "kWh Accumulator",
      "Log to feed (Join)",
      "Calibration",
      "X",
      "+",
      "Absolute value",
    ],
  },
  {
    label: "Power & Energy",
    items: ["Power to kWh/d", "Wh increments to kWh/d", "kWh to Power", "kWh to kWh/d"],
  },
  {
    label: "Input",
    items: [
      "x input",
      "Input on-time",
      "Update feed at day",
      "+ input",
      "/ input",
      "- input",
      "max by input",
      "min by input",
    ],
  },
  {
    label: "Misc",
    items: [
      "Accumulator",
      "Rate of change",
      "Signed to unsigned",
      "Max daily value",
      "Min daily value",
      "Reset to ZERO",
      "Publish to MQTT",
      "Reset to NULL",
      "Reset to Original",
      "GOTO",
      "Pulse",
      "Total pulse count to pulse increment",
    ],
  },
];

export default function Inputs() {
  const [searchParams] = useSearchParams();
  const focusDeviceId = searchParams.get("deviceId");
  const [devices, setDevices] = useState([]);
  const [inputsByDevice, setInputsByDevice] = useState({});
  const [liveByDevice, setLiveByDevice] = useState(() => loadLiveCache());
  const [clockMs, setClockMs] = useState(Date.now());
  const [expanded, setExpanded] = useState({});

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [configureModalOpen, setConfigureModalOpen] = useState(false);
  const [deviceSettingsModalOpen, setDeviceSettingsModalOpen] = useState(false);
  const [activeDevice, setActiveDevice] = useState(null);
  const [activeInput, setActiveInput] = useState(null);
  const [deviceFeeds, setDeviceFeeds] = useState([]);
  const [activeInputFeeds, setActiveInputFeeds] = useState([]);
  const [editingFeedId, setEditingFeedId] = useState(null);
  const [editingFeedForm, setEditingFeedForm] = useState({ name: "", intervalSeconds: 1 });
  const [savingFeed, setSavingFeed] = useState(false);
  const [deviceForm, setDeviceForm] = useState(null);
  const [inputForm, setInputForm] = useState(EMPTY_INPUT);
  const [processItems, setProcessItems] = useState([]);
  const [savingProcesses, setSavingProcesses] = useState(false);
  const [newProcess, setNewProcess] = useState({
    action: "Log to feed",
    feed: "CREATE NEW",
    engine: "SIE IoT Fixed Interval",
  });

  const fetchAll = async () => {
    try {
      const deviceList = await apiGet("/api/devices");
      setDevices(deviceList);

      const entries = await Promise.all(
        deviceList.map(async (device) => {
          const items = await apiGet(`/api/inputs/device/${device.id}`);
          return [device.id, items];
        })
      );

      const grouped = Object.fromEntries(entries);
      setInputsByDevice(grouped);

      const defaultExpanded = {};
      deviceList.forEach((d) => {
        defaultExpanded[d.id] = focusDeviceId ? String(d.id) === String(focusDeviceId) : true;
      });
      setExpanded(defaultExpanded);

      if (focusDeviceId) {
        setTimeout(() => {
          const el = document.getElementById(`device-section-${focusDeviceId}`);
          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 0);
      }
    } catch (e) {
      console.error("Load inputs error:", e);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [focusDeviceId]);

  const formatCounter = (liveRow) => {
    if (!liveRow) return { label: "--", isStale: false };

    let baseMs = null;
    if (liveRow.timestamp) {
      const parsed = new Date(liveRow.timestamp).getTime();
      if (!Number.isNaN(parsed)) {
        baseMs = parsed;
      }
    }
    if (baseMs == null && liveRow.readAtMs) {
      baseMs = liveRow.readAtMs;
    }
    if (baseMs == null) return { label: "--", isStale: false };

    const elapsedSec = Math.max(0, Math.floor((clockMs - baseMs) / 1000));
    if (elapsedSec < 60) return { label: `${elapsedSec}s`, isStale: false };
    if (elapsedSec < 3600) return { label: `${Math.floor(elapsedSec / 60)}m`, isStale: true };
    if (elapsedSec < 86400) return { label: `${Math.floor(elapsedSec / 3600)}h`, isStale: true };
    return { label: `${Math.floor(elapsedSec / 86400)}d`, isStale: true };
  };

  const fetchLiveForDevice = async (deviceId) => {
    try {
      const liveRows = await apiGet(`/api/inputs/live/device/${deviceId}`);
      const pollAtMs = Date.now();
      setLiveByDevice((prev) => {
        const previousRows = prev[deviceId] || {};
        const mergedRows = { ...previousRows };

        (liveRows || []).forEach((row) => {
          const previous = previousRows[row.inputId];
          const hasFreshValue = row.value != null;
          const valueChanged = hasFreshValue && previous?.value !== row.value;
          const shouldResetFallbackReadAt =
            hasFreshValue && (!previous || valueChanged || !previous?.readAtMs);
          mergedRows[row.inputId] = {
            value: hasFreshValue ? row.value : previous?.value ?? null,
            timestamp: row.timestamp ?? previous?.timestamp ?? null,
            readAtMs: shouldResetFallbackReadAt ? pollAtMs : previous?.readAtMs ?? null,
          };
        });

        const next = { ...prev, [deviceId]: mergedRows };
        saveLiveCache(next);
        return next;
      });
    } catch (e) {
      console.error("Live data error:", e);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setClockMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const refresh = () => {
      Object.entries(expanded).forEach(([deviceId, isOpen]) => {
        if (isOpen) {
          fetchLiveForDevice(deviceId);
        }
      });
    };
    refresh();
    const timer = setInterval(refresh, 1000);
    return () => clearInterval(timer);
  }, [expanded, devices.length]);

  const openAddInput = (device) => {
    setActiveDevice(device);
    setInputForm(EMPTY_INPUT);
    setAddModalOpen(true);
  };

  const closeConfigure = () => {
    setConfigureModalOpen(false);
    setEditingFeedId(null);
    setEditingFeedForm({ name: "", intervalSeconds: 1 });
    setActiveInputFeeds([]);
  };

  const openConfigure = async (device, input = null) => {
    setActiveDevice(device);
    setActiveInput(input);
    setProcessItems([]);
    setEditingFeedId(null);
    setEditingFeedForm({ name: "", intervalSeconds: 1 });
    try {
      const [allFeeds, inputFeeds] = await Promise.all([
        apiGet("/api/feeds"),
        input?.id ? apiGet(`/api/feeds/input/${input.id}`) : Promise.resolve([]),
      ]);
      setDeviceFeeds((allFeeds || []).filter((f) => f.input?.device?.id === device.id));
      setActiveInputFeeds(inputFeeds || []);
    } catch (e) {
      console.error("Load feeds error:", e);
      setDeviceFeeds([]);
      setActiveInputFeeds([]);
    }
    setNewProcess({
      action: "Log to feed",
      feed: "CREATE NEW",
      engine: "SIE IoT Fixed Interval",
    });
    setConfigureModalOpen(true);
  };

  const openDeviceSettings = (device) => {
    setActiveDevice(device);
    setDeviceForm({
      name: device.name || "",
      masterId: device.masterId || "",
      slaveId: device.slaveId || "",
      ipAddress: device.ipAddress || "",
      port: device.port || 502,
      endian: device.endian || "Little",
      type: device.type || "TCP",
      status: device.status || "Enable",
    });
    setDeviceSettingsModalOpen(true);
  };

  const saveInput = async () => {
    if (!activeDevice || !inputForm.name || !inputForm.registerAddress) return;
    try {
      await apiSend(`/api/inputs/${activeDevice.id}`, "POST", inputForm);
      const updated = await apiGet(`/api/inputs/device/${activeDevice.id}`);
      setInputsByDevice((prev) => ({ ...prev, [activeDevice.id]: updated }));
      setInputForm(EMPTY_INPUT);
      setAddModalOpen(false);
    } catch (e) {
      console.error("Save input error:", e);
    }
  };

  const deleteInput = async (deviceId, inputId) => {
    try {
      await apiSend(`/api/inputs/${inputId}`, "DELETE");
      const updated = await apiGet(`/api/inputs/device/${deviceId}`);
      setInputsByDevice((prev) => ({ ...prev, [deviceId]: updated }));
    } catch (e) {
      console.error("Delete input error:", e);
    }
  };

  const saveDeviceSettings = async () => {
    if (!activeDevice || !deviceForm) return;
    try {
      await apiSend(`/api/devices/${activeDevice.id}`, "PUT", {
        ...deviceForm,
        port: Number(deviceForm.port),
      });
      await fetchAll();
      setDeviceSettingsModalOpen(false);
    } catch (e) {
      console.error("Device update error:", e);
    }
  };

  const addProcessItem = () => {
    let feedLabel = "CREATE NEW";
    if (newProcess.feed.startsWith("FEED:")) {
      const selectedFeedId = newProcess.feed.split(":")[1];
      const existingFeed = deviceFeeds.find((f) => String(f.id) === selectedFeedId);
      feedLabel = existingFeed?.name || existingFeed?.input?.name || `Feed ${selectedFeedId}`;
    } else if (newProcess.feed.startsWith("INPUT:")) {
      const selectedInputId = newProcess.feed.split(":")[1];
      const selectedInput = (inputsByDevice[activeDevice?.id] || []).find((i) => String(i.id) === selectedInputId);
      feedLabel = selectedInput ? `Create from ${selectedInput.name}` : "CREATE NEW";
    } else if (newProcess.feed === "CREATE NEW") {
      feedLabel = `Create from ${activeInput?.name || "selected input"}`;
    }

    const row = {
      id: Date.now(),
      action: newProcess.action,
      engine: newProcess.engine,
      feedSelection: newProcess.feed,
      feedLabel,
    };
    setProcessItems((prev) => [...prev, row]);
  };

  const removeProcessItem = (id) => {
    setProcessItems((prev) => prev.filter((p) => p.id !== id));
  };

  const startEditFeed = (feed) => {
    setEditingFeedId(feed.id);
    setEditingFeedForm({
      name: feed.name || "",
      intervalSeconds: feed.intervalSeconds ?? 1,
    });
  };

  const cancelEditFeed = () => {
    setEditingFeedId(null);
    setEditingFeedForm({ name: "", intervalSeconds: 1 });
  };

  const saveFeedDetails = async () => {
    if (!editingFeedId) return;
    setSavingFeed(true);
    try {
      const payload = {
        name: editingFeedForm.name?.trim() || `Feed ${editingFeedId}`,
        intervalSeconds: Math.max(1, Number(editingFeedForm.intervalSeconds) || 1),
      };
      const updated = await apiSend(`/api/feeds/${editingFeedId}`, "PUT", payload);

      setActiveInputFeeds((prev) => prev.map((f) => (f.id === editingFeedId ? { ...f, ...updated } : f)));
      setDeviceFeeds((prev) => prev.map((f) => (f.id === editingFeedId ? { ...f, ...updated } : f)));
      cancelEditFeed();
    } catch (e) {
      console.error("Update feed error:", e);
    } finally {
      setSavingFeed(false);
    }
  };

  const saveProcessConfig = async () => {
    if (!activeDevice || !activeInput) {
      closeConfigure();
      return;
    }

    setSavingProcesses(true);
    try {
      const allFeeds = await apiGet("/api/feeds");
      const feedsForDevice = (allFeeds || []).filter((f) => f.input?.device?.id === activeDevice.id);

      for (const step of processItems) {
        if (!step.action.toLowerCase().startsWith("log to feed")) {
          continue;
        }

        if (step.feedSelection.startsWith("FEED:")) {
          continue;
        }

        let targetInputId = activeInput.id;
        if (step.feedSelection.startsWith("INPUT:")) {
          targetInputId = Number(step.feedSelection.split(":")[1]);
        }

        const existingForInput = feedsForDevice.find((f) => f.input?.id === targetInputId);
        if (existingForInput) {
          continue;
        }

        const inputName =
          (inputsByDevice[activeDevice.id] || []).find((i) => i.id === targetInputId)?.name ||
          activeInput.name ||
          `Input ${targetInputId}`;

        const payload = {
          name: inputName,
          intervalSeconds: 1,
        };

        const created = await apiSend(`/api/feeds/${targetInputId}`, "POST", payload);
        if (created) {
          feedsForDevice.push(created);
        }
      }

      setDeviceFeeds(feedsForDevice);
      if (activeInput?.id) {
        const inputFeeds = await apiGet(`/api/feeds/input/${activeInput.id}`);
        setActiveInputFeeds(inputFeeds || []);
      }
      closeConfigure();
    } catch (e) {
      console.error("Save process error:", e);
    } finally {
      setSavingProcesses(false);
    }
  };

  const groupedDevices = useMemo(() => devices, [devices]);

  return (
    <div className="space-y-6">
      <h2 className="page-title">Inputs</h2>

      <div className="card overflow-hidden">
        {groupedDevices.length === 0 && <p className="p-6 text-slate-500">No devices available.</p>}

        {groupedDevices.map((device) => {
          const rows = inputsByDevice[device.id] || [];
          const isOpen = expanded[device.id];
          return (
            <div key={device.id} className="border-b border-slate-200 last:border-b-0">
              <div id={`device-section-${device.id}`} />
              <div className="flex items-center justify-between bg-slate-50 px-4 py-3">
                <button
                  onClick={() => {
                    setExpanded((prev) => {
                      const next = !prev[device.id];
                      if (next) {
                        fetchLiveForDevice(device.id);
                      }
                      return { ...prev, [device.id]: next };
                    });
                  }}
                  className="flex items-center gap-2 text-left"
                >
                  <span className="text-xs text-slate-500">{isOpen ? "▼" : "▶"}</span>
                  <span className="font-semibold text-slate-900">{device.name}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button onClick={() => openAddInput(device)} className="btn-primary px-3 py-1.5" title="Add Input">
                    +
                  </button>
                  <button onClick={() => openDeviceSettings(device)} className="btn-muted px-3 py-1.5" title="Settings">
                    Settings
                  </button>
                </div>
              </div>

              {isOpen && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="table-head">
                        <th className="w-[30%] px-4 py-2.5">Input Name</th>
                        <th className="w-[18%] px-4 py-2.5">Register</th>
                        <th className="w-[18%] px-4 py-2.5 text-right">Live Data</th>
                        <th className="w-[14%] px-4 py-2.5 text-right">Counter</th>
                        <th className="w-[20%] px-4 py-2.5">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-3 text-slate-500">
                            No inputs configured for this device.
                          </td>
                        </tr>
                      )}
                      {rows.map((input) => {
                        const counter = formatCounter(liveByDevice[device.id]?.[input.id]);
                        return (
                          <tr key={input.id} className="border-b border-slate-100 last:border-b-0">
                          <td className="px-4 py-2.5 text-slate-800">{input.name}</td>
                          <td className="px-4 py-2.5 text-slate-700">{input.registerAddress}</td>
                          <td className="px-4 py-2.5 text-right font-medium text-emerald-700">
                            {liveByDevice[device.id]?.[input.id]?.value != null
                              ? Number(liveByDevice[device.id][input.id].value).toFixed(3)
                              : "--"}
                          </td>
                          <td className={`px-4 py-2.5 text-right font-medium ${counter.isStale ? "text-red-600" : "text-emerald-600"}`}>
                            {counter.label}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2 whitespace-nowrap">
                              <button onClick={() => openConfigure(device, input)} className="btn-muted">
                                Configure
                              </button>
                              <button onClick={() => deleteInput(device.id, input.id)} className="btn-danger">
                                Delete
                              </button>
                            </div>
                          </td>
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

      {addModalOpen && activeDevice && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/35 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="text-2xl font-semibold text-slate-900">Add Input</h3>
              <p className="mt-1 text-sm text-slate-500">Device: {activeDevice.name}</p>
            </div>

            <div className="p-5">
              <p className="text-sm text-slate-600">
                Add input with name and Modbus register. Examples: `30000`, `30000_L`, `30000_F`.
              </p>

              <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="table-head">
                      <th className="px-3 py-2.5">Name</th>
                      <th className="px-3 py-2.5">Register</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(inputsByDevice[activeDevice.id] || []).map((row) => (
                      <tr key={row.id} className="border-b border-slate-100 last:border-b-0">
                        <td className="px-3 py-2.5 text-slate-800">{row.name}</td>
                        <td className="px-3 py-2.5 text-slate-700">{row.registerAddress}</td>
                      </tr>
                    ))}
                    {(inputsByDevice[activeDevice.id] || []).length === 0 && (
                      <tr>
                        <td colSpan={2} className="px-3 py-2.5 text-slate-500">
                          No inputs added yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div>
                  <label className="field-label">Name</label>
                  <input
                    value={inputForm.name}
                    onChange={(e) => setInputForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="input"
                    placeholder="Average_PF"
                  />
                </div>
                <div>
                  <label className="field-label">Register</label>
                  <input
                    value={inputForm.registerAddress}
                    onChange={(e) => setInputForm((prev) => ({ ...prev, registerAddress: e.target.value }))}
                    className="input"
                    placeholder="40139_F"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">
              <button onClick={() => setAddModalOpen(false)} className="btn-muted">
                Close
              </button>
              <button onClick={saveInput} className="btn-primary">
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {configureModalOpen && activeDevice && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/35 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-xl bg-white shadow-xl">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="text-2xl font-semibold text-slate-900">
                {activeDevice.name}
                {activeInput ? ` / ${activeInput.name}` : ""} process list setup
              </h3>
            </div>

            <div className="space-y-4 p-5">
              <p className="text-sm text-slate-600">
                Processes are executed sequentially. Result values are passed to next processor in the list.
              </p>

              <div className="card p-4">
                <h4 className="mb-3 font-semibold text-slate-800">Feed Details</h4>
                {!activeInput && <p className="text-sm text-slate-500">Select an input to view feed details.</p>}

                {activeInput && (
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="table-head">
                          <th className="px-3 py-2.5">Feed Name</th>
                          <th className="px-3 py-2.5">Interval (s)</th>
                          <th className="px-3 py-2.5">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeInputFeeds.length === 0 && (
                          <tr>
                            <td colSpan={3} className="px-3 py-3 text-slate-500">
                              No feeds found for this input.
                            </td>
                          </tr>
                        )}
                        {activeInputFeeds.map((feed) => {
                          const isEditing = editingFeedId === feed.id;
                          return (
                            <tr key={feed.id} className="border-b border-slate-100 last:border-b-0">
                              <td className="px-3 py-2.5">
                                {isEditing ? (
                                  <input
                                    className="input"
                                    value={editingFeedForm.name}
                                    onChange={(e) => setEditingFeedForm((p) => ({ ...p, name: e.target.value }))}
                                  />
                                ) : (
                                  feed.name || `Feed ${feed.id}`
                                )}
                              </td>
                              <td className="px-3 py-2.5">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    min="1"
                                    className="input"
                                    value={editingFeedForm.intervalSeconds}
                                    onChange={(e) =>
                                      setEditingFeedForm((p) => ({ ...p, intervalSeconds: e.target.value }))
                                    }
                                  />
                                ) : (
                                  feed.intervalSeconds ?? "-"
                                )}
                              </td>
                              <td className="px-3 py-2.5">
                                {!isEditing ? (
                                  <button className="btn-muted" onClick={() => startEditFeed(feed)}>
                                    Edit
                                  </button>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <button className="btn-success" onClick={saveFeedDetails} disabled={savingFeed}>
                                      {savingFeed ? "Saving..." : "Save"}
                                    </button>
                                    <button className="btn-muted" onClick={cancelEditFeed} disabled={savingFeed}>
                                      Cancel
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {processItems.length === 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-700">
                  You have no processes defined.
                </div>
              )}

              <div className="card p-4">
                <h4 className="mb-3 font-semibold text-slate-800">Add process</h4>
                <div className="grid gap-2 md:grid-cols-4">
                  <select
                    className="input"
                    value={newProcess.action}
                    onChange={(e) => setNewProcess((p) => ({ ...p, action: e.target.value }))}
                  >
                    {PROCESS_GROUPS.map((group) => (
                      <optgroup key={group.label} label={group.label}>
                        {group.items.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <select
                    className="input"
                    value={newProcess.feed}
                    onChange={(e) => setNewProcess((p) => ({ ...p, feed: e.target.value }))}
                  >
                    <option value="CREATE NEW">CREATE NEW</option>
                    {(inputsByDevice[activeDevice?.id] || []).map((input) => (
                      <option key={`input-${input.id}`} value={`INPUT:${input.id}`}>
                        {`Input: ${input.name}`}
                      </option>
                    ))}
                    {deviceFeeds.map((feed) => (
                      <option key={feed.id} value={`FEED:${feed.id}`}>
                        {`Feed: ${feed.name || feed.input?.name || `Feed ${feed.id}`}`}
                      </option>
                    ))}
                  </select>
                  <select
                    className="input"
                    value={newProcess.engine}
                    onChange={(e) => setNewProcess((p) => ({ ...p, engine: e.target.value }))}
                  >
                    <option>SIE IoT Fixed Interval</option>
                    <option>SIE IoT Variable Interval</option>
                  </select>
                  <button className="btn-primary" onClick={addProcessItem}>
                    Add
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="table-head">
                      <th className="px-3 py-2.5">Action</th>
                      <th className="px-3 py-2.5">Feed</th>
                      <th className="px-3 py-2.5">Engine</th>
                      <th className="px-3 py-2.5">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processItems.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-3 py-3 text-slate-500">
                          No process steps yet.
                        </td>
                      </tr>
                    )}
                    {processItems.map((p) => (
                      <tr key={p.id} className="border-b border-slate-100 last:border-b-0">
                        <td className="px-3 py-2.5">{p.action}</td>
                        <td className="px-3 py-2.5">{p.feedLabel}</td>
                        <td className="px-3 py-2.5">{p.engine}</td>
                        <td className="px-3 py-2.5">
                          <button className="btn-danger" onClick={() => removeProcessItem(p.id)}>
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">
              <button onClick={closeConfigure} className="btn-muted">
                Close
              </button>
              <button onClick={saveProcessConfig} className="btn-success" disabled={savingProcesses}>
                {savingProcesses ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deviceSettingsModalOpen && activeDevice && deviceForm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/35 p-4">
          <div className="w-full max-w-3xl rounded-xl bg-white shadow-xl">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="text-2xl font-semibold text-slate-900">Configure Device</h3>
              <p className="mt-1 text-sm text-slate-500">Device: {activeDevice.name}</p>
            </div>

            <div className="grid gap-3 p-5 md:grid-cols-2">
              <div>
                <label className="field-label">Device Name</label>
                <input
                  className="input"
                  value={deviceForm.name}
                  onChange={(e) => setDeviceForm((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="field-label">ModBus Master ID</label>
                <input
                  className="input"
                  value={deviceForm.masterId}
                  onChange={(e) => setDeviceForm((p) => ({ ...p, masterId: e.target.value }))}
                />
              </div>
              <div>
                <label className="field-label">ModBus Slave ID</label>
                <input
                  className="input"
                  value={deviceForm.slaveId}
                  onChange={(e) => setDeviceForm((p) => ({ ...p, slaveId: e.target.value }))}
                />
              </div>
              <div>
                <label className="field-label">IP Address</label>
                <input
                  className="input"
                  value={deviceForm.ipAddress}
                  onChange={(e) => setDeviceForm((p) => ({ ...p, ipAddress: e.target.value }))}
                />
              </div>
              <div>
                <label className="field-label">Port</label>
                <input
                  type="number"
                  className="input"
                  value={deviceForm.port}
                  onChange={(e) => setDeviceForm((p) => ({ ...p, port: e.target.value }))}
                />
              </div>
              <div>
                <label className="field-label">Endian</label>
                <select
                  className="input"
                  value={deviceForm.endian}
                  onChange={(e) => setDeviceForm((p) => ({ ...p, endian: e.target.value }))}
                >
                  <option value="Little">Little</option>
                  <option value="Big">Big</option>
                </select>
              </div>
              <div>
                <label className="field-label">Modbus Type</label>
                <select
                  className="input"
                  value={deviceForm.type}
                  onChange={(e) => setDeviceForm((p) => ({ ...p, type: e.target.value }))}
                >
                  <option value="TCP">TCP</option>
                  <option value="RTU">RTU</option>
                </select>
              </div>
              <div>
                <label className="field-label">Status</label>
                <select
                  className="input"
                  value={deviceForm.status}
                  onChange={(e) => setDeviceForm((p) => ({ ...p, status: e.target.value }))}
                >
                  <option value="Enable">Enable</option>
                  <option value="Disable">Disable</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">
              <button onClick={() => setDeviceSettingsModalOpen(false)} className="btn-muted">
                Cancel
              </button>
              <button onClick={saveDeviceSettings} className="btn-primary">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
