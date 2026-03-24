import { useEffect, useMemo, useState } from "react";
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Devices from "./pages/Devices";
import Inputs from "./pages/Inputs";
import Feeds from "./pages/Feeds";
import DeviceDetails from "./pages/DeviceDetails";
import Graph from "./pages/Graph";
import Dashboards from "./pages/Dashboards";
import DashboardEdit from "./pages/DashboardEdit";
import Login from "./pages/Login";
import Users from "./pages/Users";
import Operations from "./pages/Operations";
import ProfileModal from "./components/ProfileModal";
import { apiGet, apiSend } from "./lib/api";

const setupItems = [
  { to: "/inputs", label: "Inputs" },
  { to: "/feeds", label: "Feeds" },
  { to: "/graph", label: "Graphs" },
  { to: "/devices", label: "Devices" },
];

const sidebarItemClass = ({ isActive }) =>
  `flex items-center border-l-2 px-4 py-3 text-[30px] transition ${
    isActive
      ? "border-orange-500 bg-neutral-800 text-white"
      : "border-transparent text-slate-200 hover:bg-neutral-800 hover:text-white"
  }`;

function isSetupPath(pathname) {
  return pathname === "/inputs" || pathname === "/feeds" || pathname === "/graph" || pathname === "/devices" || pathname.startsWith("/devices/");
}

function readStoredUser() {
  try {
    const raw = localStorage.getItem("authUser");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [authUser, setAuthUser] = useState(readStoredUser());
  const [publishedDashboards, setPublishedDashboards] = useState([]);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const loadPublishedDashboards = async () => {
    if (!authUser) {
      setPublishedDashboards([]);
      return;
    }
    try {
      const list = await apiGet("/api/dashboards/menu");
      setPublishedDashboards(list);
    } catch (error) {
      console.error(error);
      try {
        const all = await apiGet("/api/dashboards");
        setPublishedDashboards((all || []).filter((dashboard) => dashboard.isPublished));
      } catch (fallbackError) {
        console.error(fallbackError);
        setPublishedDashboards([]);
      }
    }
  };

  useEffect(() => {
    if (!authUser) return;
    apiGet("/api/auth/me")
      .then((user) => {
        localStorage.setItem("authUser", JSON.stringify(user));
        setAuthUser(user);
      })
      .catch((e) => {
        console.error(e);
        localStorage.removeItem("authToken");
        localStorage.removeItem("authUser");
        setAuthUser(null);
      });
  }, []);

  useEffect(() => {
    const onAuthExpired = () => {
      localStorage.removeItem("authToken");
      localStorage.removeItem("authUser");
      setAuthUser(null);
      navigate("/");
    };
    window.addEventListener("auth-expired", onAuthExpired);
    return () => window.removeEventListener("auth-expired", onAuthExpired);
  }, [navigate]);

  useEffect(() => {
    if (!authUser) return;
    loadPublishedDashboards();
    const onChanged = () => loadPublishedDashboards();
    window.addEventListener("dashboards-updated", onChanged);
    return () => window.removeEventListener("dashboards-updated", onChanged);
  }, [authUser]);

  const logout = async () => {
    try {
      await apiSend("/api/auth/logout", "POST");
    } catch (e) {
      console.error(e);
    } finally {
      localStorage.removeItem("authToken");
      localStorage.removeItem("authUser");
      setAuthUser(null);
      navigate("/");
    }
  };

  if (!authUser) {
    return <Login onLogin={setAuthUser} />;
  }

  const activeSection = isSetupPath(location.pathname) ? "setup" : "dashboards";
  const dashboardItems = useMemo(
    () => [
      { to: "/", label: "Live Monitoring", end: true },
      ...publishedDashboards.map((dashboard) => ({
        to: `/dashboard/${dashboard.id}`,
        label: dashboard.name || "no name",
      })),
      { to: "/operations", label: "API URL" },
      { to: "/dashboard/list", label: "Configuration" },
    ],
    [publishedDashboards]
  );
  const sidebarItems = activeSection === "setup" ? setupItems : dashboardItems;

  return (
    <div className="flex min-h-screen flex-col bg-slate-200">
      <header className="flex h-11 items-center justify-between bg-[#e57800] px-3 text-white shadow-sm">
        <div className="flex h-full items-center">
          <button
            type="button"
            onClick={() => navigate("/inputs")}
            className={`h-full px-3 text-base transition ${activeSection === "setup" ? "bg-[#ce6900]" : "hover:bg-[#ce6900]"}`}
          >
            Setup
          </button>
          <button
            type="button"
            onClick={() => navigate("/dashboard/list")}
            className={`h-full px-3 text-base transition ${activeSection === "dashboards" ? "bg-[#ce6900]" : "hover:bg-[#ce6900]"}`}
          >
            Dashboards
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm">{authUser.username}</span>
          <button type="button" onClick={logout} className="rounded border border-white/60 px-2 py-1 text-xs">
            Logout
          </button>
          <button 
            type="button"
            onClick={() => setIsProfileModalOpen(true)}
            className="h-8 w-8 overflow-hidden rounded-full border border-white/60 bg-slate-300 hover:scale-105 hover:shadow-md transition"
            aria-label="My Account"
          >
            <span className="flex h-full w-full items-center justify-center font-bold text-slate-600 bg-white">
              {authUser.username?.charAt(0).toUpperCase()}
            </span>
          </button>
        </div>
      </header>
      
      <ProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
        authUser={authUser} 
        onLogout={logout} 
      />

      <div className="flex flex-1">
        <aside className="hidden w-64 bg-neutral-900 md:block">
          <div className="border-b border-neutral-700 px-6 py-4 text-4xl font-semibold text-slate-200">SIE IoT</div>
          <nav className="py-2">
            {sidebarItems.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={sidebarItemClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="flex-1 p-4 md:p-5">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard/:id" element={<Dashboard />} />
            <Route path="/devices" element={<Devices />} />
            <Route path="/inputs" element={<Inputs />} />
            <Route path="/feeds" element={<Feeds />} />
            <Route path="/graph" element={<Graph />} />
            <Route path="/devices/:id" element={<DeviceDetails />} />
            <Route path="/dashboard/list" element={<Dashboards />} />
            <Route path="/dashboard/edit" element={<DashboardEdit />} />
            <Route path="/users" element={<Users />} />
            <Route path="/operations" element={<Operations />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
