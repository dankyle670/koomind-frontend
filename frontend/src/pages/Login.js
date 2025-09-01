// src/pages/Login.js
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../api"; // <- utilise api.js avec interceptors
import { setToken, setRefreshToken, setUserInfo } from "../auth";
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
      const res = await axios.post("/login", { email, password });

      const { accessToken, refreshToken, userId, name, role } = res.data;

      if (!accessToken || !refreshToken || !userId) {
        throw new Error("Token ou ID utilisateur manquant dans la réponse.");
      }

      // Stockage dans le localStorage
      setToken(accessToken);
      setRefreshToken(refreshToken);
      setUserInfo({ name, role, userId });

      console.log("✅ Login successful:", { userId, name, role });

      // Redirection vers le Dashboard
      navigate("/Dashboard");
    } catch (err) {
      console.error("Login failed:", err.response?.data || err.message);
      setError("❌ Identifiants invalides ou erreur serveur.");
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>🛡️ Admin Portal</h1>
        <p>Entrez vos identifiants pour accéder à la plateforme.</p>

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
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">Se connecter</button>
        </form>
      </div>
    </div>
  );
}
