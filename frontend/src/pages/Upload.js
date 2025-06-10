import { useState, useCallback, useRef, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { getToken } from "../auth";
import { useNavigate } from "react-router-dom";
import Menu from "../components/Menu";
import ChatBot from "../components/ChatBot";
import "../css/Upload.css";

const API_BASE = process.env.REACT_APP_API_BASE_URL;

export default function Upload() {
  const [file, setFile] = useState(null);
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [summaryTitle, setSummaryTitle] = useState("");
  const [audioId, setAudioId] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunks = useRef([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!getToken()) navigate("/");
  }, [navigate]);

  const uploadAudioToServer = async (audioBlobOrFile) => {
    console.log("[uploadAudioToServer] called with:", audioBlobOrFile);
    const formData = new FormData();
    formData.append("audio", audioBlobOrFile);
    setUploading(true);

    try {
      const uploadRes = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
        body: formData,
      });

      if (!uploadRes.ok) {
        const errorText = await uploadRes.text();
        console.error("[uploadAudioToServer] Upload failed with response:", errorText);
        throw new Error("Upload failed.");
      }

      const uploadData = await uploadRes.json();
      console.log("[uploadAudioToServer] Upload response:", uploadData);
      setAudioId(uploadData.id);
    } catch (err) {
      console.error("[uploadAudioToServer] Error:", err);
      throw err;
    } finally {
      setUploading(false);
    }
  };

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    setFile(file);
    console.log("[onDrop] File dropped:", file);
    uploadAudioToServer(file).catch((err) =>
      alert("Error uploading file: " + err.message)
    );
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: { "audio/*": [] },
  });

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunks.current = [];

      mediaRecorder.ondataavailable = (e) => {
        audioChunks.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunks.current, { type: "audio/webm" });
        console.log("[onstop] Recorded blob created:", blob);
        setRecordedBlob(blob);

        const recordedFile = new File([blob], "recording.webm", {
          type: "audio/webm",
        });

        try {
          console.log("📤 [onstop] Uploading recorded file...");
          await uploadAudioToServer(recordedFile);
        } catch (err) {
          alert("Error uploading recording: " + err.message);
        }
      };

      mediaRecorder.start();
      console.log("[handleStartRecording] Recording started...");
      setRecording(true);
    } catch (err) {
      console.error("[handleStartRecording] Error accessing microphone:", err);
      alert("Cannot access microphone: " + err.message);
    }
  };

  const handleStopRecording = () => {
    console.log("[handleStopRecording] Stopping recording...");
    mediaRecorderRef.current.stop();
    setRecording(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!audioId) return alert("No transcript available to summarize.");

    try {
      setLoading(true);
      const summaryRes = await fetch(`${API_BASE}/summarize/${audioId}`);
      if (!summaryRes.ok) throw new Error("Summarization failed.");
      const summaryData = await summaryRes.json();
      setAiResult({
        summary: summaryData.summary,
        objectives: summaryData.objectives,
        questions: summaryData.questions || [],
      });
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!summaryTitle.trim()) return alert("Please provide a title for your summary.");

    try {
      const res = await fetch(`${API_BASE}/summary`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          title: summaryTitle,
          summary: aiResult.summary,
          objectives: aiResult.objectives,
          questions: aiResult.questions,
        }),
      });

      if (!res.ok) throw new Error("Failed to save summary");
      navigate("/summary");
    } catch (err) {
      alert("Failed to save summary:\n" + err.message);
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
              {uploading && <p style={{ color: "gray" }}>⏳ Processing audio, please wait...</p>}
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

            <button onClick={handleSubmit} disabled={!audioId || loading || uploading}>
              🚀 Send to KOOmind.ia
            </button>

            {loading && <p>⏳ Summarizing meeting notes...</p>}
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

            <label>Questions & Suggestions:</label>
            <div style={{ backgroundColor: "#f9f9f9", border: "1px solid #ddd", padding: "1rem", borderRadius: "6px" }}>
              {aiResult.questions.length === 0 ? (
                <p style={{ fontStyle: "italic" }}>No questions found in the meeting.</p>
              ) : (
                aiResult.questions.map((q, i) => (
                  <div key={i} style={{ marginBottom: "1rem" }}>
                    <strong>❓ {q.question}</strong>
                    <p style={{ marginLeft: "1rem" }}>💡 {q.suggestion}</p>
                  </div>
                ))
              )}
            </div>

            <button onClick={handleSave}>💾 Save & View</button>
          </div>
        )}
      </div>
      <ChatBot />
    </>
  );
}
