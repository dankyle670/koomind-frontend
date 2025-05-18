import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { setToken, setUserInfo } from "../auth";
import "../css/Login.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await axios.post("https://koomind-backend.onrender.com/api/login", {
        email,
        password,
      });

      const { token, userId, name, role } = res.data;

      if (!token || !userId) {
        throw new Error("Missing token or user ID in response.");
      }

      if (role !== "admin") {
        setError("Access denied. Admins only.");
        return;
      }

      setToken(token); // Save JWT to localStorage
      setUserInfo({ name, role, userId }); // Save name, role, ID
      navigate("/dashboard");
    } catch (err) {
      console.error("Login failed:", err.response?.data || err.message);
      setError("❌ Invalid credentials or server error.");
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>🛡️ Admin Portal</h1>
        <p>Enter your credentials to access the platform.</p>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleLogin} className="login-form">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">Access Dashboard</button>
        </form>
      </div>
    </div>
  );
}
