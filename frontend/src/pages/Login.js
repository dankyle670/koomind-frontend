// src/pages/Login.js
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { setToken, setUserInfo } from "../auth";
import "../css/Login.css";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      // Envoi des identifiants
      const res = await axios.post(`${API_BASE_URL}/login`, {
        email,
        password,
      });

      const { token, userId, name, role } = res.data;

      // Vérification du token
      if (!token || !userId) {
        throw new Error("Le token ou l'ID utilisateur est manquant dans la réponse.");
      }
      // Stockage dans le localStorage
      setToken(token);
      setUserInfo({ name, role, userId });
      console.log("✅ Login successful:", { token, userId, name, role });

      // Redirection vers Messenger ou Dashboard
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
