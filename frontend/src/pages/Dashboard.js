import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getToken, getUserInfo, logout } from "../auth";
import Menu from "../components/Menu";
import ChatBot from "../components/ChatBot";
import "../css/Dashboard.css";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

export default function Dashboard() {
  const navigate = useNavigate();
  const { name, role } = getUserInfo();
  const [chartData, setChartData] = useState(null);
  const [teamStats, setTeamStats] = useState([]);
  const [activity, setActivity] = useState([]);
  const [summaries, setSummaries] = useState([]);
  const [newTasks, setNewTasks] = useState({});

  useEffect(() => {
    if (!getToken()) return navigate("/");

    const fetchSummaries = async () => {
      try {
        const endpoint = role === "admin" ? "/summary/all" : "/summary";

        const res = await fetch(`${API_BASE_URL}${endpoint}`, {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        });

        if (!res.ok) throw new Error("Unauthorized");

        const data = await res.json();
        setSummaries(data);
        updateChart(data);
        updateStats(data);
      } catch (err) {
        console.error("Fetch summaries error:", err.message);
        logout();
        navigate("/");
      }
    };

    fetchSummaries();
  }, [navigate, role]);

  const updateChart = (data) => {
    let total = 0;
    let done = 0;
    data.forEach((s) => {
      total += s.objectives.length;
      s.objectives.forEach((o) => {
        if (o.trim().startsWith("✅")) done++;
      });
    });
    const pending = total - done;
    setChartData({
      labels: ["✅ Completed", "⏳ Pending"],
      datasets: [
        {
          label: "Objectives",
          data: [done, pending],
          backgroundColor: ["#4ade80", "#facc15"],
          borderWidth: 1,
          cutout: "70%",
        },
      ],
    });
  };

  const updateStats = (data) => {
    const members = {};
    data.forEach((s) => {
      const firstWord = s.title.split(" ")[0];
      if (!members[firstWord]) {
        members[firstWord] = {
          name: firstWord,
          lastSummary: s.title,
          total: 0,
          completed: 0,
        };
      }
      members[firstWord].lastSummary = s.title;
      members[firstWord].total += s.objectives.length;
      s.objectives.forEach((o) => {
        if (o.trim().startsWith("✅")) members[firstWord].completed++;
      });
    });
    setTeamStats(Object.values(members));

    const recent = data.map((s) => ({
      title: s.title,
      date: new Date(s.createdAt).toLocaleString(),
    }));
    setActivity(recent.slice(0, 5));
  };

  const saveSummaryToBackend = async (summary) => {
    try {
      await fetch(`${API_BASE_URL}/summary/${summary._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(summary),
      });
    } catch (err) {
      console.error("Failed to update backend:", err.message);
    }
  };

  const handleToggleTask = (summaryId, index) => {
    const updated = summaries.map((s) => {
      if (s._id === summaryId) {
        const newObjectives = [...s.objectives];
        const current = newObjectives[index];
        newObjectives[index] = current.startsWith("✅")
          ? current.replace("✅ ", "")
          : "✅ " + current;
        const updatedSummary = { ...s, objectives: newObjectives };
        saveSummaryToBackend(updatedSummary);
        return updatedSummary;
      }
      return s;
    });

    setSummaries(updated);
    updateChart(updated);
    updateStats(updated);
  };

  const handleAddTask = (id) => {
    const task = (newTasks[id] || "").trim();
    if (!task) return;

    const updated = summaries.map((s) => {
      if (s._id === id) {
        const updatedSummary = {
          ...s,
          objectives: [...s.objectives, task],
        };
        saveSummaryToBackend(updatedSummary);
        return updatedSummary;
      }
      return s;
    });

    setSummaries(updated);
    setNewTasks({ ...newTasks, [id]: "" });
    updateChart(updated);
    updateStats(updated);
  };

  const handleDeleteTask = (summaryId, index) => {
    const updated = summaries.map((s) => {
      if (s._id === summaryId) {
        const newObjectives = [...s.objectives];
        newObjectives.splice(index, 1);
        const updatedSummary = { ...s, objectives: newObjectives };
        saveSummaryToBackend(updatedSummary);
        return updatedSummary;
      }
      return s;
    });

    setSummaries(updated);
    updateChart(updated);
    updateStats(updated);
  };

  return (
    <>
      <Menu />
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1>👋 Welcome back, {name || "Admin"}!</h1>
          <p>Team overview, insights & objectives</p>
        </div>

        <div className="dashboard-actions">
          <button onClick={() => navigate("/upload")}>📤 Upload Audio</button>
          <button onClick={() => navigate("/summary")}>📑 View Summaries</button>
        </div>

        <div className="dashboard-section">
          <h2>📊 Objective Completion</h2>
          {chartData ? (
            <div className="chart-wrapper">
              <Doughnut data={chartData} options={{ maintainAspectRatio: false }} />
            </div>
          ) : (
            <p>No data yet.</p>
          )}
        </div>

        <div className="dashboard-section">
          <h2>👥 Team Member Overview</h2>
          <table className="member-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Last Summary</th>
                <th>Objectives</th>
                <th>Done</th>
              </tr>
            </thead>
            <tbody>
              {teamStats.map((m, i) => (
                <tr key={i}>
                  <td>{m.name}</td>
                  <td>{m.lastSummary}</td>
                  <td>{m.total}</td>
                  <td>{m.completed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="dashboard-section">
          <h2>🕓 Recent Activity</h2>
          <ul className="activity-feed">
            {activity.map((a, i) => (
              <li key={i}>
                <strong>{a.title}</strong> <br />
                <span>{a.date}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="dashboard-section">
          <h2>🧾 Task List by Summary</h2>
          {summaries.length === 0 ? (
            <p>No summaries yet.</p>
          ) : (
            summaries.map((s) => (
              <div key={s._id} className="task-summary">
                <h3>{s.title}</h3>
                <ul className="task-list">
                  {s.objectives.map((obj, idx) => (
                    <li key={idx} className="task-item">
                      <label className="task-checkbox">
                        <input
                          type="checkbox"
                          checked={obj.startsWith("✅")}
                          onChange={() => handleToggleTask(s._id, idx)}
                        />
                        <span>{obj.replace("✅ ", "")}</span>
                      </label>
                      <button
                        className="delete-task"
                        onClick={() => handleDeleteTask(s._id, idx)}
                      >
                        ❌
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="task-form">
                  <input
                    type="text"
                    placeholder="Add new task"
                    value={newTasks[s._id] || ""}
                    onChange={(e) =>
                      setNewTasks({ ...newTasks, [s._id]: e.target.value })
                    }
                  />
                  <button onClick={() => handleAddTask(s._id)}>➕ Add</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <ChatBot />
    </>
  );
}
