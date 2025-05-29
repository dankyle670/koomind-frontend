import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getToken } from "../auth";
import Menu from "../components/Menu";
import ChatBot from "../components/ChatBot";
import jsPDF from "jspdf";
import "../css/Summary.css";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

export default function Summary() {
  const [summaries, setSummaries] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!getToken()) return navigate("/");

    const fetchSummaries = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/summary/all`, {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        });

        if (!res.ok) throw new Error("Failed to fetch summaries");

        const data = await res.json();
        setSummaries(data.reverse());
      } catch (err) {
        console.error("Fetch error:", err);
        navigate("/");
      }
    };

    fetchSummaries();
  }, [navigate]);

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const downloadPDF = (summary) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(summary.title, 20, 20);
    doc.setFontSize(12);
    doc.text("Summary:", 20, 35);
    doc.setFontSize(10);
    doc.text(summary.summary, 20, 45, { maxWidth: 170 });

    doc.setFontSize(12);
    doc.text("Objectives:", 20, 70);
    summary.objectives.forEach((obj, i) => {
      doc.text(`- ${obj}`, 25, 80 + i * 7);
    });

    doc.save(`${summary.title}.pdf`);
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/summary/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!res.ok) throw new Error("Delete failed");

      const updated = summaries.filter((s) => s._id !== id);
      setSummaries(updated);
      if (expandedId === id) setExpandedId(null);
    } catch (err) {
      console.error("Delete error:", err);
      alert("❌ Failed to delete summary.");
    }
  };

  return (
    <>
      <Menu />
      <div className="summary-page">
        <h1>📑 All Team Summaries</h1>

        {summaries.length === 0 ? (
          <p>No summaries yet. Go to Upload and create one.</p>
        ) : (
          summaries.map((s) => (
            <div key={s._id} className="summary-card">
              <div className="summary-title-row">
                <h2
                  className="summary-title"
                  onClick={() => toggleExpand(s._id)}
                >
                  {s.title} {expandedId === s._id ? "▲" : "▼"}
                </h2>
                <button
                  className="delete-btn"
                  onClick={() => handleDelete(s._id)}
                >
                  🗑️
                </button>
              </div>

              {expandedId === s._id && (
                <div className="summary-content">
                  <p>
                    <strong>Summary:</strong> {s.summary}
                  </p>
                  <div>
                    <strong>Objectives:</strong>
                    <ul>
                      {s.objectives.map((o, i) => (
                        <li key={i}>{o}</li>
                      ))}
                    </ul>
                  </div>
                  <button onClick={() => downloadPDF(s)}>📥 Download PDF</button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
      <ChatBot />
    </>
  );
}
