import { useNavigate } from "react-router-dom";
import { logout } from "../auth";
import { useState, useEffect } from "react";
import "../css/Menu.css";

export default function Menu() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // Handle screen resize to detect mobile
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <>
      {isMobile && (
        <button className="menu-toggle" onClick={() => setOpen(!open)}>
          {open ? "✖" : "☰"}
        </button>
      )}

      <nav className={`menu-bar ${open ? "visible" : "hidden"}`}>
        <div className="menu-left" onClick={() => navigate("/dashboard")}>
          <span className="menu-logo">🧠 KOOmind</span>
        </div>

        <ul className={`menu-center ${isMobile && open ? "open" : ""}`}>
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
