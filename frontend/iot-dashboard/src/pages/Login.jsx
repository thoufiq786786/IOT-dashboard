import { useState } from "react";
import { apiSend } from "../lib/api";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    try {
      setLoading(true);
      setError("");
      const res = await apiSend("/api/auth/login", "POST", { username, password });
      localStorage.setItem("authToken", res.token);
      localStorage.setItem("authUser", JSON.stringify(res.user));
      onLogin(res.user);
    } catch (e) {
      console.error(e);
      setError("Invalid username or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-200 p-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-xl border border-slate-300 bg-white p-6 shadow-sm">
        <h1 className="mb-6 text-3xl font-bold text-slate-900">SIE IoT Login</h1>
        <div className="space-y-3">
          <div>
            <label className="field-label">Username</label>
            <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div>
            <label className="field-label">Password</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button className="btn-primary w-full" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </button>
          {/* <p className="text-xs text-slate-500">Default admin: ALSPU / AL@SPU</p> */}
        </div>
      </form>
    </div>
  );
}
