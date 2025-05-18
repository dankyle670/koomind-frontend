import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getToken, logout } from "../auth";
import Menu from "../components/Menu";
import ChatBot from "../components/ChatBot";
import "../css/Profile.css";

export default function Profile() {
  const navigate = useNavigate();
  //const { name, role } = getUserInfo();
  const [user, setUser] = useState({
    name: "",
    email: "",
    role: "",
    bio: "",
    linkedin: "",
    phone: "",
  });
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    if (!getToken()) return navigate("/");

    const fetchProfile = async () => {
      try {
        const res = await fetch("https://koomind-backend.onrender.com/api/me", {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        });

        if (!res.ok) throw new Error("Unauthorized");

        const data = await res.json();
        setUser(data);
      } catch (err) {
        console.error("Profile fetch failed:", err.message);
        logout();
        navigate("/");
      }
    };

    fetchProfile();
  }, [navigate]);

  const handleChange = (e) => {
    setUser({ ...user, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          bio: user.bio,
          phone: user.phone,
          linkedin: user.linkedin,
        }),
      });

      if (!res.ok) throw new Error("Update failed");

      setEditMode(false);
    } catch (err) {
      console.error(err);
      alert("Failed to update profile.");
    }
  };

  return (
    <>
      <Menu />
      <div className="profile-container">
        <h1>👤 My Profile</h1>
        <div className="profile-card">
          <p><strong>Name:</strong> {user.name}</p>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Role:</strong> {user.role}</p>

          <label>Bio:</label>
          {editMode ? (
            <textarea name="bio" value={user.bio} onChange={handleChange} />
          ) : (
            <p>{user.bio || "–"}</p>
          )}

          <label>Phone:</label>
          {editMode ? (
            <input name="phone" value={user.phone} onChange={handleChange} />
          ) : (
            <p>{user.phone || "–"}</p>
          )}

          <label>LinkedIn:</label>
          {editMode ? (
            <input name="linkedin" value={user.linkedin} onChange={handleChange} />
          ) : (
            <p>{user.linkedin || "–"}</p>
          )}

          <div className="profile-buttons">
            {editMode ? (
              <>
                <button onClick={handleSave}>💾 Save</button>
                <button onClick={() => setEditMode(false)}>❌ Cancel</button>
              </>
            ) : (
              <button onClick={() => setEditMode(true)}>✏️ Edit Profile</button>
            )}
            <button onClick={() => { logout(); navigate("/"); }}>🚪 Logout</button>
          </div>
        </div>
      </div>
      <ChatBot />
    </>
  );
}
