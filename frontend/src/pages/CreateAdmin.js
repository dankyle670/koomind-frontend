import React, { useState } from "react";
import "../css/Createadmin.css";
import Menu from "../components/Menu";
import ChatBot from "../components/ChatBot";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

export default function CreateAdmin() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "user",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch(`${API_BASE_URL}/create-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        throw new Error(data.message || "Error creating account");
      }

      setMessage("✅ Account created successfully!");
    } catch (err) {
      setMessage("❌ " + err.message);
      setLoading(false);
    }
  };

  return (
    <>
      <Menu />
      <div className="admin-container">
        <h2>Create Admin/User Account</h2>
        <form onSubmit={handleSubmit} className="admin-form">
          <input
            type="text"
            name="name"
            placeholder="Full Name"
            value={form.name}
            onChange={handleChange}
            required
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
          />
          <select name="role" value={form.role} onChange={handleChange}>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
          <button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Account"}
          </button>
        </form>
        {message && <p className="admin-message">{message}</p>}
      </div>
      <ChatBot />
    </>
  );
}
