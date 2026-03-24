import React, { useState, useEffect } from "react";
import { apiGet, apiSend } from "../lib/api";

export default function ProfileModal({ isOpen, onClose, authUser, onLogout }) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Profile state simulating the requested fields
  const [profile, setProfile] = useState({
    userId: "8",
    username: "alspuems",
    email: "thoufiqabubacker75@gmail.com",
    rwApiKey: "d94bfe7aa23a1d11fcd69e39cb428102",
    roApiKey: "872430b87ac885d0ce29febcc8985e59",
    name: "",
    location: "",
    timezone: "Asia/Kolkata",
    language: "",
    startingPage: "dashboard/view/operation-status",
    themeColour: "",
    sidebarColour: "",
  });

  // Sync with actual actual database when opened
  useEffect(() => {
    if (isOpen && authUser) {
      setLoading(true);
      apiGet("/api/users/profile")
        .then((data) => {
          setProfile({
            userId: data.id || "",
            username: data.username || "",
            email: data.email || "",
            rwApiKey: data.rwApiKey || "",
            roApiKey: data.roApiKey || "",
            name: data.name || "",
            location: data.location || "",
            timezone: data.timezone || "Asia/Kolkata",
            language: data.language || "en",
            startingPage: data.startingPage || "dashboard/view/operation-status",
            themeColour: data.themeColour || "",
            sidebarColour: data.sidebarColour || "",
          });
        })
        .catch(err => {
          console.error("Failed to load profile", err);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setIsEditing(false); // Reset edit state when closed
    }
  }, [isOpen, authUser]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setLoading(true);
    try {
      const updatedProfile = await apiSend("/api/users/profile", "PUT", {
          username: profile.username,
          email: profile.email,
          password: profile.password,
          name: profile.name,
          location: profile.location,
          timezone: profile.timezone,
          language: profile.language,
          startingPage: profile.startingPage,
          themeColour: profile.themeColour,
          sidebarColour: profile.sidebarColour
      });
      
      setProfile(prev => ({
          ...prev, 
          ...updatedProfile,
          userId: updatedProfile.id,
          password: "" 
      }));
      setIsEditing(false);
    } catch(err) {
      console.error("Failed to update profile", err);
      alert("Failed to update profile: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
          <h2 className="text-xl font-bold text-slate-800">My Account</h2>
          <div className="flex items-center gap-3">
            {!isEditing ? (
              <button 
                onClick={() => setIsEditing(true)} 
                className="btn-primary px-4 py-1.5 text-sm"
              >
                Edit Profile
              </button>
            ) : (
              <div className="flex gap-2">
                <button 
                  onClick={() => setIsEditing(false)} 
                  className="btn-muted px-4 py-1.5 text-sm"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave} 
                  disabled={loading}
                  className="btn-success px-4 py-1.5 text-sm"
                >
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            )}
            <button 
              onClick={onClose} 
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            
            {/* Left Column (Main Account Data) */}
            <div className="md:col-span-2 space-y-6">
              <section>
                <h3 className="mb-4 border-b border-slate-200 pb-2 text-lg font-semibold text-slate-700">Account Credentials</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-600">User ID</label>
                    <input type="text" className="input bg-slate-100 cursor-not-allowed text-slate-500" value={profile.userId} disabled />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-600">Username</label>
                    <input type="text" name="username" className="input" value={profile.username} onChange={handleChange} disabled={!isEditing} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-slate-600">Email</label>
                    <input type="email" name="email" className="input" value={profile.email} onChange={handleChange} disabled={!isEditing} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-slate-600">Password</label>
                    <input type="password" name="password" className="input placeholder:text-slate-400" placeholder="**********" value={profile.password || ""} onChange={handleChange} disabled={!isEditing} />
                    {isEditing && <p className="mt-1 text-xs text-slate-400">Leave blank to keep unchanged.</p>}
                  </div>
                </div>
              </section>

              <section>
                <h3 className="mb-4 border-b border-slate-200 pb-2 text-lg font-semibold text-slate-700">API Keys</h3>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-600">Read & Write API Key</label>
                    <div className="flex rounded-md shadow-sm">
                      <input type="text" className="input flex-1 rounded-r-none font-mono text-sm bg-slate-50" value={profile.rwApiKey} readOnly />
                      <button className="flex items-center rounded-r-md border border-l-0 border-slate-300 bg-slate-100 px-3 hover:bg-slate-200 transition" onClick={() => navigator.clipboard.writeText(profile.rwApiKey)}>
                        📋
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-600">Read Only API Key</label>
                    <div className="flex rounded-md shadow-sm">
                      <input type="text" className="input flex-1 rounded-r-none font-mono text-sm bg-slate-50" value={profile.roApiKey} readOnly />
                      <button className="flex items-center rounded-r-md border border-l-0 border-slate-300 bg-slate-100 px-3 hover:bg-slate-200 transition" onClick={() => navigator.clipboard.writeText(profile.roApiKey)}>
                        📋
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="mb-4 border-b border-slate-200 pb-2 text-lg font-semibold text-slate-700">Profile Settings</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-600">Name</label>
                    <input type="text" name="name" className="input" value={profile.name} onChange={handleChange} disabled={!isEditing} />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-600">Location</label>
                    <input type="text" name="location" className="input" value={profile.location} onChange={handleChange} disabled={!isEditing} />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-600">Timezone</label>
                    <select name="timezone" className="input" value={profile.timezone} onChange={handleChange} disabled={!isEditing}>
                      <option value="Asia/Kolkata">Asia/Kolkata</option>
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">America/New_York</option>
                      <option value="Europe/London">Europe/London</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-600">Language</label>
                    <select name="language" className="input" value={profile.language} onChange={handleChange} disabled={!isEditing}>
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-slate-600">Starting page</label>
                    <input type="text" name="startingPage" className="input" value={profile.startingPage} onChange={handleChange} disabled={!isEditing} />
                  </div>
                </div>
              </section>

              <section>
                <h3 className="mb-4 border-b border-slate-200 pb-2 text-lg font-semibold text-slate-700">Appearance & Theme</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-600">Theme colour</label>
                    <input type="color" name="themeColour" className="h-10 w-full cursor-pointer rounded border border-slate-300 bg-white" value={profile.themeColour || "#e57800"} onChange={handleChange} disabled={!isEditing} />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-600">Sidebar colour</label>
                    <input type="color" name="sidebarColour" className="h-10 w-full cursor-pointer rounded border border-slate-300 bg-white" value={profile.sidebarColour || "#171717"} onChange={handleChange} disabled={!isEditing} />
                  </div>
                </div>
              </section>

            </div>

            {/* Right Column (Avatar & Mobile App QR) */}
            <div className="space-y-6">
              
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center shadow-sm">
                <div className="mx-auto mb-4 flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-slate-300 shadow-md">
                   {/* Gravatar Placeholder */}
                  <span className="text-4xl text-slate-500">{profile.username.charAt(0).toUpperCase()}</span>
                </div>
                <h4 className="text-lg font-bold text-slate-800">{profile.username}</h4>
                <p className="text-sm text-slate-500 mb-4">{profile.email}</p>
                <div className="grid gap-2">
                  <button className="btn-muted w-full" onClick={onLogout}>Sign Out</button>
                  {isEditing && <button className="btn-primary w-full text-sm">Update Avatar</button>}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
                <h4 className="mb-2 text-lg font-bold text-slate-800 text-center flex items-center justify-center gap-2">
                  📱 Mobile app
                </h4>
                <p className="text-center text-sm text-slate-600 mb-4">
                  Scan QR code from the iOS or Android app to connect.
                </p>
                
                <div className="mx-auto w-44 bg-white p-2 rounded shadow-sm">
                  {/* Simulated QR Code using a CSS grid grid mapping */}
                  <div className="w-full aspect-square bg-[url('https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=SIE-IoT-App-Connect')] bg-cover bg-center rounded"></div>
                </div>
                <p className="mt-4 text-center text-xs font-semibold uppercase tracking-widest text-[#e57800]">Scan me!</p>
              </div>

            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
