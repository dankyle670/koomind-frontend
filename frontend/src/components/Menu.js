// src/components/Menu.js
import { useNavigate } from "react-router-dom";
import { logout } from "../auth";
import { useState } from "react";
import "../css/Menu.css";

export default function Menu() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <>
      <button className="menu-toggle" onClick={() => setOpen(!open)}>
        {open ? "✖" : "☰"}
      </button>

      <nav className={`menu-bar ${open ? "visible" : "hidden"}`}>
        <div className="menu-left" onClick={() => navigate("/dashboard")}>
          <span className="menu-logo">🧠 KOOmind</span>
        </div>

        <ul className="menu-center">
          <li onClick={() => navigate("/dashboard")}>🏠 Dashboard</li>
          <li onClick={() => navigate("/upload")}>📤 Upload</li>
          <li onClick={() => navigate("/summary")}>📑 Summaries</li>
          <li onClick={() => navigate("/profile")}>👤 Profile</li>
          <li onClick={() => navigate("/admin-panel")}>🛠️ Admin Panel</li>
          <li onClick={() => navigate("/create-admin")}>➕ Create Admin</li>
        </ul>

        <div className="menu-right">
          <button className="menu-logout" onClick={handleLogout}>
            🔓 Logout
          </button>
        </div>
      </nav>
    </>
  );
}
