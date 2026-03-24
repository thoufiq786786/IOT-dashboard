import { useState, useEffect } from "react";
import { apiGet } from "../lib/api";

export default function Operations() {
  const [devices, setDevices] = useState([]);
  const [inputsByDevice, setInputsByDevice] = useState({});
  const [availableInputs, setAvailableInputs] = useState([]);
  const [incomers, setIncomers] = useState([]);
  const [targetInputs, setTargetInputs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    api_base_url: "http://localhost:8080/api/feeddata/input/",
    shift_time: "day",
    unit_per_price: "8",
    option: "custom",
    start_date: new Date().toISOString().split("T")[0],
    end_date: new Date().toISOString().split("T")[0],
    api_key: "abc123",
  });

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchAll() {
      try {
        const deviceList = await apiGet("/api/devices");
        setDevices(deviceList || []);
        
        if (deviceList && deviceList.length > 0) {
          const entries = await Promise.all(
            deviceList.map(async (device) => {
              const items = await apiGet(`/api/inputs/device/${device.id}`);
              return [device.id, items || []];
            })
          );
          
          const grouped = Object.fromEntries(entries);
          setInputsByDevice(grouped);
          
          // Flatten all inputs to start inside the available section
          const allInputs = entries.flatMap(([deviceId, inputs]) => 
            inputs.map(input => ({
              ...input,
              deviceId,
              deviceName: deviceList.find(d => d.id === deviceId)?.name
            }))
          );
          setAvailableInputs(allInputs);
        }
      } catch (err) {
        console.error("Failed to load operations setup", err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchAll();
  }, []);

  const handleDragStart = (e, targetId, sourceList) => {
    e.dataTransfer.setData("targetId", targetId);
    e.dataTransfer.setData("sourceList", sourceList);
  };

  const handleDrop = (e, targetList) => {
    e.preventDefault();
    const targetId = Number(e.dataTransfer.getData("targetId"));
    const sourceList = e.dataTransfer.getData("sourceList");

    if (sourceList === targetList || !targetId) return;

    // Find the dragged input object from any array
    const sourceArray = sourceList === "available" ? availableInputs : sourceList === "incomers" ? incomers : targetInputs;
    const inputObj = sourceArray.find(i => i.id === targetId);
    if (!inputObj) return;

    if (sourceList === "available") setAvailableInputs((prev) => prev.filter((i) => i.id !== targetId));
    if (sourceList === "incomers") setIncomers((prev) => prev.filter((i) => i.id !== targetId));
    if (sourceList === "targets") setTargetInputs((prev) => prev.filter((i) => i.id !== targetId));

    if (targetList === "available") setAvailableInputs((prev) => [...prev, inputObj]);
    if (targetList === "incomers") setIncomers((prev) => [...prev, inputObj]);
    if (targetList === "targets") setTargetInputs((prev) => [...prev, inputObj]);
  };

  const handleDragOver = (e) => e.preventDefault();

  const handleFormChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const generatedUrl = (() => {
    try {
      const inputIds = targetInputs.map((d) => d.id).join(",");
      let baseUrl = form.api_base_url;
      if (inputIds && baseUrl.endsWith("/input/")) {
        baseUrl += inputIds;
      } else if (!inputIds && baseUrl.endsWith("/input/")) {
        baseUrl += "{inputId}";
      } else if (inputIds && baseUrl.endsWith("/device/")) {
        baseUrl += inputIds;
      } else if (!inputIds && baseUrl.endsWith("/device/")) {
        baseUrl += "{deviceId}";
      }
      
      const url = new URL(baseUrl);
      
      if (form.start_date) url.searchParams.set("start_date", form.start_date);
      if (form.end_date) url.searchParams.set("end_date", form.end_date);
      
      return url.toString();
    } catch {
      return "Invalid Base URL";
    }
  })();

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const InputDraggable = ({ inputItem, sourceList }) => (
    <div
      draggable
      onDragStart={(e) => handleDragStart(e, inputItem.id, sourceList)}
      className="mb-2 cursor-grab rounded border border-slate-300 bg-white p-2 text-sm shadow-sm active:cursor-grabbing hover:border-slate-400 hover:bg-slate-50 transition"
    >
      <div className="font-semibold text-slate-800">{inputItem.name}</div>
      <div className="text-xs text-slate-500">Device: {inputItem.deviceName} | Address: {inputItem.registerAddress}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="page-title">Operations URL Builder</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left column: Drag and Drop */}
        <div className="lg:col-span-8 grid gap-4 md:grid-cols-3">
          
          {/* Available Inputs */}
          <div 
            className="flex flex-col rounded-xl border border-slate-300 bg-slate-100 p-4"
            onDrop={(e) => handleDrop(e, "available")}
            onDragOver={handleDragOver}
          >
            <h3 className="mb-3 font-semibold text-slate-700">Available Inputs</h3>
            <div className="flex-1 overflow-y-auto min-h-[150px]">
              {loading && <p className="text-sm text-slate-500">Loading inputs...</p>}
              
              {!loading && devices.map(device => {
                 const deviceInputs = availableInputs.filter(i => i.deviceId === device.id);
                 if (deviceInputs.length === 0) return null;
                 
                 return (
                   <div key={device.id} className="mb-4">
                     <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200 pb-1">
                       {device.name} (IP: {device.ipAddress})
                     </div>
                     {deviceInputs.map(input => (
                       <InputDraggable key={input.id} inputItem={input} sourceList="available" />
                     ))}
                   </div>
                 );
              })}
              
              {!loading && availableInputs.length === 0 && <p className="text-sm text-slate-400">Empty</p>}
            </div>
          </div>

          {/* Incomers */}
          <div 
            className="flex flex-col rounded-xl border border-orange-300 bg-orange-50 p-4"
            onDrop={(e) => handleDrop(e, "incomers")}
            onDragOver={handleDragOver}
          >
            <h3 className="mb-3 font-semibold text-orange-800">Incomers</h3>
            <div className="flex-1 overflow-y-auto min-h-[150px]">
              {incomers.map((d) => <InputDraggable key={d.id} inputItem={d} sourceList="incomers" />)}
              {incomers.length === 0 && <p className="text-sm text-orange-400">Drag inputs here</p>}
            </div>
          </div>

          {/* Target Inputs */}
          <div 
            className="flex flex-col rounded-xl border border-blue-300 bg-blue-50 p-4"
            onDrop={(e) => handleDrop(e, "targets")}
            onDragOver={handleDragOver}
          >
            <h3 className="mb-3 font-semibold text-blue-800">Target Inputs</h3>
            <div className="flex-1 overflow-y-auto min-h-[150px]">
              {targetInputs.map((d) => <InputDraggable key={d.id} inputItem={d} sourceList="targets" />)}
              {targetInputs.length === 0 && <p className="text-sm text-blue-400">Drag inputs here</p>}
            </div>
          </div>
        </div>

        {/* Right column: Form configuration */}
        <div className="lg:col-span-4 space-y-4 rounded-xl border border-slate-300 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-slate-800">URL Parameters</h3>
          
          <div className="space-y-3">
            <div>
              <label className="field-label">API Base URL</label>
              <input name="api_base_url" value={form.api_base_url} onChange={handleFormChange} className="input text-sm" />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label">Shift Time</label>
                <select name="shift_time" value={form.shift_time} onChange={handleFormChange} className="input text-sm">
                  <option value="day">Day</option>
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                </select>
              </div>
              <div>
                <label className="field-label">Option</label>
                <select name="option" value={form.option} onChange={handleFormChange} className="input text-sm">
                  <option value="custom">Custom</option>
                  <option value="default">Default</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label">Start Date</label>
                <input type="date" name="start_date" value={form.start_date} onChange={handleFormChange} className="input text-sm" />
              </div>
              <div>
                <label className="field-label">End Date</label>
                <input type="date" name="end_date" value={form.end_date} onChange={handleFormChange} className="input text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label">Unit Per Price</label>
                <input type="number" name="unit_per_price" value={form.unit_per_price} onChange={handleFormChange} className="input text-sm" />
              </div>
              <div>
                <label className="field-label">API Key</label>
                <input type="text" name="api_key" value={form.api_key} onChange={handleFormChange} className="input text-sm" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-300 bg-slate-900 p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white">Generated URL</h3>
          <button
            onClick={copyToClipboard}
            className="rounded bg-orange-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-orange-500"
          >
            {copied ? "Copied!" : "Copy URL"}
          </button>
        </div>
        <div className="mt-4 overflow-x-auto rounded border border-slate-700 bg-slate-800 p-4">
          <code className="whitespace-nowrap font-mono text-sm text-green-400">
            {generatedUrl}
          </code>
        </div>
      </div>
    </div>
  );
}
