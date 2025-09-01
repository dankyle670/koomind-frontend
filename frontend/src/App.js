import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
import Summary from "./pages/Summary";
import CreateAdmin from "./pages/CreateAdmin";
import Profile from "./pages/Profile";
import AdminPanel from "./pages/AdminPanel";
import Convert from "./pages/Convert"
import Messenger from "./pages/Messenger";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/summary" element={<Summary />} />
        <Route path="/create-admin" element={<CreateAdmin />} />
        <Route path="/profile" element={<Profile/>} />
        <Route path="/admin-panel" element={<AdminPanel />} />
        <Route path="/convert" element={<Convert />} />
        <Route path="/messenger" element={<Messenger />} />
      </Routes>
    </Router>
  );
}

export default App;
