import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
import Summary from "./pages/Summary";
import CreateAdmin from "./pages/CreateAdmin";
import Profile from "./pages/Profile";
import AdminPanel from "./pages/AdminPanel";
import Convert from "./pages/Convert";
import Messenger from "./pages/Messenger";
import api from "./api"; // axios avec interceptors
import { getToken, getUserInfo, setUserInfo, logout } from "./auth";

function AppRoutes() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    // Appel pour récupérer l'user actuel
    api
      .get("/me")
      .then((res) => {
        setUserInfo({
          name: res.data.name,
          role: res.data.role,
          userId: res.data._id,
        });
      })
      .catch((err) => {
        console.error("Erreur récupération user:", err);
        logout();
        navigate("/"); // redirection vers login
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  if (loading) return <div>Chargement...</div>;

  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/upload" element={<Upload />} />
      <Route path="/summary" element={<Summary />} />
      <Route path="/create-admin" element={<CreateAdmin />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/admin-panel" element={<AdminPanel />} />
      <Route path="/convert" element={<Convert />} />
      <Route path="/messenger" element={<Messenger />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}

export default App;
