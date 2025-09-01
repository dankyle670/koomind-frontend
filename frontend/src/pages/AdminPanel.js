import { useEffect, useState } from "react";
import { getToken, getUserInfo, logout } from "../auth";
import { useNavigate } from "react-router-dom";
import Menu from "../components/Menu";
import ChatBot from "../components/ChatBot";
import "../css/AdminPanel.css";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

export default function AdminPanel() {
  const [admins, setAdmins] = useState([]);
  const [users, setUsers] = useState([]); // 👈 nouvelle state pour les utilisateurs
  const { userId } = getUserInfo();
  const navigate = useNavigate();

  useEffect(() => {
    if (!getToken()) return navigate("/");

    const fetchAdmins = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/admins`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (!res.ok) throw new Error("Unauthorized");
        setAdmins(await res.json());
      } catch (err) {
        console.error("Fetch admins error:", err.message);
        logout();
        navigate("/");
      }
    };

    const fetchUsers = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/users`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (!res.ok) throw new Error("Unauthorized");
        setUsers(await res.json());
      } catch (err) {
        console.error("Fetch users error:", err.message);
      }
    };

    fetchAdmins();
    fetchUsers();
  }, [navigate]);

  const handleDeleteAdmin = async (id) => {
    if (!window.confirm("Are you sure you want to delete this admin?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/user/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (!res.ok) return alert("❌ " + (data.message || "Error deleting admin"));
      setAdmins(admins.filter((a) => a._id !== id));
      alert("✅ Admin deleted.");
    } catch (err) {
      console.error("Delete admin failed:", err.message);
      alert("❌ Server error.");
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/user/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (!res.ok) return alert("❌ " + (data.message || "Error deleting user"));
      setUsers(users.filter((u) => u._id !== id));
      alert("✅ User deleted.");
    } catch (err) {
      console.error("Delete user failed:", err.message);
      alert("❌ Server error.");
    }
  };

  const handleEditName = async (id, currentName, isAdmin = true) => {
    const newName = prompt("Enter a new name:", currentName);
    if (!newName || newName === currentName) return;

    try {
      const res = await fetch(`${API_BASE_URL}/user/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ name: newName }),
      });
      const data = await res.json();
      if (!res.ok) return alert("❌ " + data.message);

      if (isAdmin) {
        setAdmins((prev) =>
          prev.map((a) => (a._id === id ? { ...a, name: newName } : a))
        );
      } else {
        setUsers((prev) =>
          prev.map((u) => (u._id === id ? { ...u, name: newName } : u))
        );
      }

      alert("✅ Name updated.");
    } catch (err) {
      console.error("Edit failed:", err.message);
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
                    <button
                      onClick={() => handleEditName(admin._id, admin.name, true)}
                    >
                      Edit
                    </button>
                    {admin._id === userId ? (
                      <button disabled style={{ opacity: 0.5 }}>
                        You
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDeleteAdmin(admin._id)}
                        style={{ backgroundColor: "#dc2626", color: "white" }}
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

        {/* 👇 Nouvelle section Users */}
        <h1>👥 Users Management</h1>
        {users.length === 0 ? (
          <p>No regular users found.</p>
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
              {users.map((user) => (
                <tr key={user._id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                  <td>
                    <button
                      onClick={() => handleEditName(user._id, user.name, false)}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user._id)}
                      style={{ backgroundColor: "#dc2626", color: "white" }}
                    >
                      Delete
                    </button>
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
