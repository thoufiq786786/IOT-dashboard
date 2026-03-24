import { useEffect, useState } from "react";
import { apiGet, apiSend } from "../lib/api";

export default function Users() {
  const authUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("authUser") || "null");
    } catch {
      return null;
    }
  })();
  const isAdmin = authUser?.role === "ADMIN";

  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ username: "", password: "", role: "USER" });
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const loadUsers = async () => {
    try {
      setUsers(await apiGet("/api/users"));
    } catch (e) {
      console.error(e);
      setError("Failed to load users");
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const createUser = async (e) => {
    e.preventDefault();
    try {
      setError("");
      setInfo("");
      await apiSend("/api/users", "POST", form);
      setInfo("User created. New user can login and start with a fresh view.");
      setForm({ username: "", password: "", role: "USER" });
      await loadUsers();
    } catch (err) {
      console.error(err);
      setError("Create user failed");
    }
  };

  return (
    <div className="space-y-5">
      <h2 className="page-title">User Management</h2>

      {isAdmin ? (
        <form onSubmit={createUser} className="card grid gap-3 p-5 md:grid-cols-4">
          <input
            className="input"
            placeholder="Username"
            value={form.username}
            onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
          />
          <input
            className="input"
            placeholder="Password"
            type="password"
            value={form.password}
            onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
          />
          <select
            className="input"
            value={form.role}
            onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
          >
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
          <button className="btn-primary" type="submit">
            Add User
          </button>
        </form>
      ) : (
        <div className="card p-4 text-sm text-slate-600">Read-only user list. Only admin can create users.</div>
      )}

      {error && <p className="text-sm text-red-700">{error}</p>}
      {info && <p className="text-sm text-emerald-700">{info}</p>}

      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="table-head">
              <th className="px-3 py-2.5">Id</th>
              <th className="px-3 py-2.5">Username</th>
              <th className="px-3 py-2.5">Role</th>
              <th className="px-3 py-2.5">Active</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-slate-200 last:border-b-0">
                <td className="px-3 py-2.5">{user.id}</td>
                <td className="px-3 py-2.5">{user.username}</td>
                <td className="px-3 py-2.5">{user.role}</td>
                <td className="px-3 py-2.5">{user.active ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
