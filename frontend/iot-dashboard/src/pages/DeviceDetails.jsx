import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiGet, apiSend } from "../lib/api";

export default function DeviceDetails() {
  const { id } = useParams();
  const [device, setDevice] = useState(null);
  const [inputs, setInputs] = useState([]);
  const [feeds, setFeeds] = useState([]);
  const [selectedInputId, setSelectedInputId] = useState(null);
  const [showInputModal, setShowInputModal] = useState(false);
  const [showFeedModal, setShowFeedModal] = useState(false);
  const [inputForm, setInputForm] = useState({ name: "", registerAddress: "" });
  const [feedForm, setFeedForm] = useState({ name: "", intervalSeconds: 10 });

  const fetchDevice = async () => {
    try {
      setDevice(await apiGet(`/api/devices/${id}`));
    } catch (err) {
      console.error("Device fetch error:", err);
    }
  };

  const fetchInputs = async () => {
    try {
      setInputs(await apiGet(`/api/inputs/device/${id}`));
    } catch (err) {
      console.error("Input fetch error:", err);
    }
  };

  const fetchFeeds = async (inputId) => {
    try {
      setFeeds(await apiGet(`/api/feeds/input/${inputId}`));
      setSelectedInputId(inputId);
    } catch (err) {
      console.error("Feed fetch error:", err);
    }
  };

  useEffect(() => {
    fetchDevice();
    fetchInputs();
  }, [id]);

  const handleAddInput = async () => {
    if (!inputForm.name || !inputForm.registerAddress) return;
    try {
      await apiSend(`/api/inputs/${id}`, "POST", inputForm);
      setShowInputModal(false);
      setInputForm({ name: "", registerAddress: "" });
      fetchInputs();
    } catch (err) {
      console.error("Add input error:", err);
    }
  };

  const handleDeleteInput = async (inputId) => {
    try {
      await apiSend(`/api/inputs/${inputId}`, "DELETE");
      fetchInputs();
      if (selectedInputId === inputId) {
        setSelectedInputId(null);
        setFeeds([]);
      }
    } catch (err) {
      console.error("Delete input error:", err);
    }
  };

  const handleAddFeed = async () => {
    if (!feedForm.name || !selectedInputId) return;
    try {
      await apiSend(`/api/feeds/${selectedInputId}`, "POST", {
        ...feedForm,
        intervalSeconds: Number(feedForm.intervalSeconds),
      });
      setShowFeedModal(false);
      setFeedForm({ name: "", intervalSeconds: 10 });
      fetchFeeds(selectedInputId);
    } catch (err) {
      console.error("Add feed error:", err);
    }
  };

  const handleDeleteFeed = async (feedId) => {
    try {
      await apiSend(`/api/feeds/${feedId}`, "DELETE");
      fetchFeeds(selectedInputId);
    } catch (err) {
      console.error("Delete feed error:", err);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="page-title">{device ? `Device: ${device.name}` : "Loading..."}</h2>
        <button onClick={() => setShowInputModal(true)} className="btn-primary">
          + Add Input
        </button>
      </div>

      <div className="card space-y-4 p-6">
        {inputs.length === 0 && <p className="text-slate-500">No inputs added yet.</p>}

        {inputs.map((input) => (
          <div key={input.id} className="rounded-lg border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900">{input.name}</h3>
                <p className="text-sm text-slate-600">Register: {input.registerAddress}</p>
              </div>

              <div className="flex gap-2">
                <button onClick={() => fetchFeeds(input.id)} className="btn-primary px-3 py-1.5">
                  Feeds
                </button>
                <button onClick={() => handleDeleteInput(input.id)} className="btn-danger">
                  Delete
                </button>
              </div>
            </div>

            {selectedInputId === input.id && (
              <div className="mt-4 space-y-3 rounded-lg bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-slate-800">Feeds</h4>
                  <button onClick={() => setShowFeedModal(true)} className="btn-success px-3 py-1.5">
                    + Add Feed
                  </button>
                </div>

                {feeds.length === 0 && <p className="text-sm text-slate-500">No feeds created.</p>}

                {feeds.map((feed) => (
                  <div key={feed.id} className="flex justify-between rounded-lg border border-slate-200 bg-white p-3">
                    <div>
                      <p className="font-bold text-slate-900">{feed.name}</p>
                      <p className="text-sm text-slate-600">Interval: {feed.intervalSeconds}s</p>
                    </div>
                    <button onClick={() => handleDeleteFeed(feed.id)} className="btn-danger">
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {showInputModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-slate-900/35">
          <div className="w-96 rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-xl font-semibold text-slate-900">Add Input</h3>
            <input
              placeholder="Input Name"
              value={inputForm.name}
              onChange={(e) => setInputForm({ ...inputForm, name: e.target.value })}
              className="input mb-3"
            />
            <input
              placeholder="Register (40139_F)"
              value={inputForm.registerAddress}
              onChange={(e) => setInputForm({ ...inputForm, registerAddress: e.target.value })}
              className="input"
            />
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowInputModal(false)} className="btn-muted">
                Cancel
              </button>
              <button onClick={handleAddInput} className="btn-primary">
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {showFeedModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-slate-900/35">
          <div className="w-96 rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-xl font-semibold text-slate-900">Create Feed</h3>
            <input
              placeholder="Feed Name"
              value={feedForm.name}
              onChange={(e) => setFeedForm({ ...feedForm, name: e.target.value })}
              className="input mb-3"
            />
            <select
              value={feedForm.intervalSeconds}
              onChange={(e) => setFeedForm({ ...feedForm, intervalSeconds: Number(e.target.value) })}
              className="input"
            >
              <option value={5}>5 sec</option>
              <option value={10}>10 sec</option>
              <option value={30}>30 sec</option>
              <option value={60}>60 sec</option>
            </select>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowFeedModal(false)} className="btn-muted">
                Cancel
              </button>
              <button onClick={handleAddFeed} className="btn-primary">
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
