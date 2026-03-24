import { useEffect, useState } from "react";
import { apiGet, apiSend } from "../lib/api";

const initialDevice = {
  name: "",
  masterId: "",
  slaveId: "",
  ipAddress: "",
  port: 502,
  endian: "Little",
  type: "TCP",
  status: "Enable",
};

export default function Devices() {
  const [showModal, setShowModal] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [devices, setDevices] = useState([]);
  const [formData, setFormData] = useState(initialDevice);

  const fetchDevices = async () => {
    try {
      const data = await apiGet("/api/devices");
      setDevices(data);
    } catch (err) {
      console.error("Error fetching devices:", err);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "port" ? Number(value) : value,
    }));
  };

  const handleSave = async () => {
    if (!formData.name || !formData.masterId || !formData.slaveId) return;
    try {
      await apiSend("/api/devices", "POST", formData);
      setShowModal(false);
      setFormData(initialDevice);
      fetchDevices();
    } catch (err) {
      console.error("Error saving device:", err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await apiSend(`/api/devices/${id}`, "DELETE");
      if (expandedId === id) {
        setExpandedId(null);
      }
      fetchDevices();
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const renderDetailTable = (device) => (
    <div className="border-t border-slate-200 px-4 py-4">
      <div className="grid grid-cols-5 gap-3 text-sm font-semibold text-slate-600">
        <div>Name</div>
        <div>Configuration</div>
        <div>Type</div>
        <div>Status</div>
        <div className="text-right">Delete</div>
      </div>
      <div className="mt-3 grid grid-cols-5 gap-3 text-sm text-slate-700">
        <div>{device.name}</div>
        <div className="space-y-1">
          <div>Master ID: {device.masterId || "-"}</div>
          <div>Slave ID: {device.slaveId || "-"}</div>
          <div>Comm Mode: {device.type || "-"}</div>
          <div>IP Address: {device.ipAddress || "-"}</div>
          <div>Port: {device.port || "-"}</div>
          <div>Endian: {device.endian || "-"}</div>
        </div>
        <div>ModBus Slave</div>
        <div>{device.status || "-"}</div>
        <div className="text-right">
          <button onClick={() => handleDelete(device.id)} className="btn-danger">
            Delete
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <h2 className="page-title mb-5">Devices</h2>

      <div className="card overflow-hidden">
        {devices.length === 0 && <p className="p-4 text-slate-500">No devices configured.</p>}

        {devices.map((device) => {
          const isOpen = expandedId === device.id;
          return (
            <div key={device.id} className="border-b border-slate-200 last:border-b-0">
              <button
                onClick={() => setExpandedId(isOpen ? null : device.id)}
                className="flex w-full items-center gap-2 px-4 py-3 text-left transition hover:bg-slate-50"
              >
                <span className="text-xs text-slate-500">{isOpen ? "▼" : "▶"}</span>
                <span className="font-semibold text-blue-700">Device Name : {device.name}</span>
              </button>
              {isOpen && renderDetailTable(device)}
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex justify-end">
        <button onClick={() => setShowModal(true)} className="btn-primary px-5">
          Add Device
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/35 p-4">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-auto rounded-xl bg-white">
            <div className="border-b border-slate-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-slate-900">Configure Device</h3>
            </div>

            <div className="grid min-h-[540px] grid-cols-12">
              <div className="col-span-12 border-b border-slate-200 bg-slate-50 p-4 md:col-span-3 md:border-b-0 md:border-r">
                <h4 className="mb-3 text-xl font-semibold text-slate-800">Devices</h4>
                <div className="space-y-1 text-sm">
                  <div className="rounded-md px-3 py-2 text-slate-600">IoT Gateway</div>
                  <div className="rounded-md px-3 py-2 text-slate-600">ModBus Device</div>
                  <div className="rounded-md bg-blue-600 px-3 py-2 font-medium text-white">ModBus Slave</div>
                </div>
              </div>

              <div className="col-span-12 p-6 md:col-span-9">
                <h4 className="text-lg font-semibold text-slate-900">Configuration</h4>
                <p className="mt-2 text-sm text-slate-500">
                  Enter ModBus Master ID and Slave ID. For TCP mode, also enter IP and Port.
                </p>

                <div className="mt-6 grid max-w-xl gap-3">
                  <label className="field-label">Device Name</label>
                  <input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="input"
                  />

                  <label className="field-label">ModBus Master ID</label>
                  <input
                    name="masterId"
                    value={formData.masterId}
                    onChange={handleChange}
                    className="input"
                  />

                  <label className="field-label">ModBus Slave ID</label>
                  <input
                    name="slaveId"
                    value={formData.slaveId}
                    onChange={handleChange}
                    className="input"
                  />

                  <label className="field-label">IP Address</label>
                  <input
                    name="ipAddress"
                    value={formData.ipAddress}
                    onChange={handleChange}
                    className="input"
                  />

                  <label className="field-label">Port</label>
                  <input
                    name="port"
                    type="number"
                    value={formData.port}
                    onChange={handleChange}
                    className="input"
                  />

                  <label className="field-label">Endian</label>
                  <select
                    name="endian"
                    value={formData.endian}
                    onChange={handleChange}
                    className="input"
                  >
                    <option value="Little">Little</option>
                    <option value="Big">Big</option>
                  </select>

                  <label className="field-label">Modbus Type</label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className="input"
                  >
                    <option value="TCP">TCP</option>
                    <option value="RTU">RTU</option>
                  </select>

                  <label className="field-label">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="input"
                  >
                    <option value="Enable">Enable</option>
                    <option value="Disable">Disable</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-3">
              <button onClick={() => setShowModal(false)} className="btn-muted">
                Cancel
              </button>
              <button onClick={handleSave} className="btn-primary">
                Save & Initialize
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
