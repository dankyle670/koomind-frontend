import { useState, useCallback, useRef, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { getToken } from "../auth";
import { useNavigate } from "react-router-dom";
import Menu from "../components/Menu";
import ChatBot from "../components/ChatBot";
import "../css/Upload.css";

export default function Upload() {
  const [file, setFile] = useState(null);
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [summaryTitle, setSummaryTitle] = useState("");
  const mediaRecorderRef = useRef(null);
  const audioChunks = useRef([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!getToken()) navigate("/");
  }, [navigate]);

  const onDrop = useCallback((acceptedFiles) => {
    setFile(acceptedFiles[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: { "audio/*": [] },
  });

  const handleStartRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
    audioChunks.current = [];

    mediaRecorder.ondataavailable = (e) => {
      audioChunks.current.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(audioChunks.current, { type: "audio/webm" });
      setRecordedBlob(blob);
    };

    mediaRecorder.start();
    setRecording(true);
  };

  const handleStopRecording = () => {
    mediaRecorderRef.current.stop();
    setRecording(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();

    if (file) {
      formData.append("audio", file);
    } else if (recordedBlob) {
      const recordedFile = new File([recordedBlob], "recording.webm", {
        type: "audio/webm",
      });
      formData.append("audio", recordedFile);
    } else {
      return alert("No audio selected.");
    }

    try {
      setLoading(true);
      const res = await fetch("https://koomind-backend.onrender.com/api/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
        body: formData,
      });

      setLoading(false);

      if (res.ok) {
        const data = await res.json();
        setAiResult(data); // { summary, objectives }
      } else {
        alert("Upload failed.");
      }
    } catch (err) {
      console.error(err);
      alert("Server error.");
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!summaryTitle.trim()) {
      alert("Please provide a title for your summary.");
      return;
    }
  
    try {
      const res = await fetch("https://koomind-backend.onrender.com/api/summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          title: summaryTitle,
          summary: aiResult.summary,
          objectives: aiResult.objectives,
        }),
      });
  
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Unknown error");
      }
  
      navigate("/summary");
    } catch (err) {
      console.error("Save failed:", err);
      alert("❌ Failed to save summary:\n" + err.message);
    }
  };
  

  return (
    <>
      <Menu />
      <div className="upload-container">
        <h1>🎙️ Upload or Record Meeting Audio</h1>

        {!aiResult && (
          <>
            <div className="upload-card">
              <h2>📁 Upload File</h2>
              <div {...getRootProps()} className={`dropzone ${isDragActive ? "active" : ""}`}>
                <input {...getInputProps()} />
                {file ? <p className="filename">✔️ {file.name}</p> : <p>Drag & drop .mp3/.wav here</p>}
              </div>
            </div>

            <div className="upload-card">
              <h2>🎤 Record from Microphone</h2>
              {recordedBlob ? (
                <audio controls src={URL.createObjectURL(recordedBlob)} />
              ) : recording ? (
                <p>🎙️ Recording... speak now</p>
              ) : (
                <p>Click start to begin recording your meeting summary</p>
              )}
              <div className="record-buttons">
                {!recording ? (
                  <button onClick={handleStartRecording}>🔴 Start Recording</button>
                ) : (
                  <button onClick={handleStopRecording}>⏹️ Stop Recording</button>
                )}
              </div>
            </div>

            <button onClick={handleSubmit} disabled={(!file && !recordedBlob) || loading}>
              🚀 Send to KOOmind.ia
            </button>

            {loading && <p>⏳ Processing audio, please wait...</p>}
          </>
        )}

        {aiResult && (
          <div className="upload-card">
            <h2>🧠 AI Summary</h2>

            <label>Title:</label>
            <input
              type="text"
              value={summaryTitle}
              onChange={(e) => setSummaryTitle(e.target.value)}
              placeholder="Enter a title for your summary"
            />

            <label>Summary:</label>
            <textarea
              value={aiResult.summary}
              onChange={(e) => setAiResult({ ...aiResult, summary: e.target.value })}
              rows="6"
            />

            <label>Objectives:</label>
            <textarea
              value={aiResult.objectives.join("\n")}
              onChange={(e) =>
                setAiResult({ ...aiResult, objectives: e.target.value.split("\n") })
              }
              rows="6"
            />

            <button onClick={handleSave}>💾 Save & View</button>
          </div>
        )}
      </div>
      <ChatBot />
    </>
  );
}
