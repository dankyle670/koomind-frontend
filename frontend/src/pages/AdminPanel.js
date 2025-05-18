import { useEffect, useState } from "react";
import { getToken, getUserInfo, logout } from "../auth";
import { useNavigate } from "react-router-dom";
import Menu from "../components/Menu";
import ChatBot from "../components/ChatBot";
import "../css/AdminPanel.css";

export default function AdminPanel() {
  const [admins, setAdmins] = useState([]);
  const { userId } = getUserInfo();
  const navigate = useNavigate();

  useEffect(() => {
    if (!getToken()) return navigate("/");

    const fetchAdmins = async () => {
      try {
        const res = await fetch("https://koomind-backend.onrender.com/api/admins", {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        });

        if (!res.ok) throw new Error("Unauthorized");
        const data = await res.json();
        setAdmins(data);
      } catch (err) {
        console.error("Fetch admins error:", err.message);
        logout();
        navigate("/");
      }
    };

    fetchAdmins();
  }, [navigate]);

  const handleDeleteAdmin = async (id) => {
    if (!window.confirm("Are you sure you want to delete this admin?")) return;

    try {
      const res = await fetch(`https://koomind-backend.onrender.com/api/user/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        alert("❌ " + (data.message || "Error deleting admin"));
        return;
      }

      setAdmins(admins.filter((a) => a._id !== id));
      alert("✅ Admin deleted.");
    } catch (err) {
      console.error("Delete admin failed:", err.message);
      alert("❌ Server error.");
    }
  };

  const handleEditName = async (id, currentName) => {
    const newName = prompt("Enter a new name:", currentName);
    if (!newName || newName === currentName) return;

    try {
      const res = await fetch(`https://koomind-backend.onrender.com/api/user/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ name: newName }),
      });

      const data = await res.json();
      if (!res.ok) return alert("❌ " + data.message);

      setAdmins((prev) =>
        prev.map((a) => (a._id === id ? { ...a, name: newName } : a))
      );
      alert("✅ Admin updated.");
    } catch (err) {
      console.error("Edit admin failed:", err.message);
      alert("❌ Server error.");
    }
  };

  const handleResetPassword = async (email) => {
    const newPassword = prompt(`Enter a new password for ${email}:`);
    if (!newPassword || newPassword.length < 6) {
      return alert("Password must be at least 6 characters.");
    }

    try {
      const res = await fetch(`https://koomind-backend.onrender.com/api/user/reset-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ email, password: newPassword }),
      });

      const data = await res.json();
      if (!res.ok) return alert("❌ " + data.message);
      alert("✅ Password reset.");
    } catch (err) {
      console.error("Reset failed:", err.message);
      alert("❌ Server error.");
    }
  };

  return (
    <>
      <Menu />
      <div className="admin-panel-container">
        <h1>🛠️ Admin Management</h1>

        {admins.length === 0 ? (
          <p>No admin users found.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr key={admin._id}>
                  <td>{admin.name}</td>
                  <td>{admin.email}</td>
                  <td>{admin.role}</td>
                  <td>
                    <button onClick={() => handleEditName(admin._id, admin.name)}>
                      Edit
                    </button>
                    <button onClick={() => handleResetPassword(admin.email)}>
                      Reset Password
                    </button>
                    {admin._id === userId ? (
                      <button disabled style={{ opacity: 0.5 }}>You</button>
                    ) : (
                      <button
                        onClick={() => handleDeleteAdmin(admin._id)}
                        style={{
                          backgroundColor: "#dc2626",
                          color: "white",
                          cursor: "pointer",
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <ChatBot />
    </>
  );
}
