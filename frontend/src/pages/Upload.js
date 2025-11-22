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
  // Nouveaux états pour la capture audio avancée
  const [captureMode, setCaptureMode] = useState("microphone"); // "microphone", "system", "both"
  const [systemStream, setSystemStream] = useState(null);
  const [micStream, setMicStream] = useState(null);
  const [isRecordingCall, setIsRecordingCall] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunks = useRef([]);
  const audioContextRef = useRef(null);
  const mixerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!getToken()) navigate("/");
  }, [navigate]);

  // Vérifier les capacités audio du navigateur
  const checkAudioCapabilities = () => {
    const capabilities = {
      microphone: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      systemAudio: !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia),
      webAudioAPI: !!(window.AudioContext || window.webkitAudioContext),
      mediaRecorder: !!window.MediaRecorder,
    };
    
    console.log("[checkAudioCapabilities] Browser capabilities:", capabilities);
    
    if (!capabilities.microphone) {
      console.warn("Microphone access not supported");
    }
    if (!capabilities.systemAudio) {
      console.warn("System audio capture not supported");
    }
    if (!capabilities.webAudioAPI) {
      console.warn("Web Audio API not supported - audio mixing may not work");
    }
    
    return capabilities;
  };

  // Vérifier les capacités au chargement du composant
  useEffect(() => {
    checkAudioCapabilities();
  }, []);

  // Nouvelle fonction pour capturer l'audio système (desktop audio)
  const captureSystemAudio = async () => {
    try {
      // Demander l'autorisation de partage d'écran avec audio
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true, // On doit demander la vidéo pour avoir accès à l'audio système
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          suppressLocalAudioPlayback: false, // Important pour capturer l'audio des autres participants
        }
      });
      
      // Vérifier si l'audio est disponible
      const audioTracks = displayStream.getAudioTracks();
      if (audioTracks.length === 0) {
        console.warn("[captureSystemAudio] No audio track found in display stream");
        // Arrêter les pistes vidéo car on n'en a pas besoin
        displayStream.getVideoTracks().forEach(track => track.stop());
        throw new Error("Aucun audio système détecté. Assurez-vous que l'application partagée a du son.");
      }
      
      console.log("[captureSystemAudio] System audio stream captured with", audioTracks.length, "audio tracks");
      
      // Créer un nouveau stream avec seulement l'audio
      const audioOnlyStream = new MediaStream();
      audioTracks.forEach(track => audioOnlyStream.addTrack(track));
      
      // Arrêter les pistes vidéo car on n'en a pas besoin
      displayStream.getVideoTracks().forEach(track => track.stop());
      
      return audioOnlyStream;
    } catch (err) {
      console.warn("[captureSystemAudio] Could not capture system audio:", err.message);
      if (err.name === "NotAllowedError") {
        throw new Error("Autorisation refusée pour capturer l'audio système. Veuillez autoriser le partage d'écran.");
      } else if (err.name === "NotFoundError") {
        throw new Error("Aucune source audio système trouvée. Assurez-vous qu'une application avec du son est ouverte.");
      }
      throw err;
    }
  };

  // Fonction pour mixer l'audio du microphone et de l'appel
  const createMixedAudioStream = async (micStream, systemStream) => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;

      const destination = audioContext.createMediaStreamDestination();
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 1.0;
      gainNode.connect(destination);

      // Connecter le microphone
      if (micStream) {
        const micSource = audioContext.createMediaStreamSource(micStream);
        micSource.connect(gainNode);
        console.log("[createMixedAudioStream] Microphone connected");
      }

      // Connecter l'audio système (appel)
      if (systemStream) {
        const systemSource = audioContext.createMediaStreamSource(systemStream);
        systemSource.connect(gainNode);
        console.log("[createMixedAudioStream] System audio connected");
      }

      return destination.stream;
    } catch (err) {
      console.error("[createMixedAudioStream] Error creating mixed stream:", err);
      throw err;
    }
  };

  // Fonction pour nettoyer les ressources audio
  const cleanupAudioResources = () => {
    if (micStream) {
      micStream.getTracks().forEach(track => track.stop());
      setMicStream(null);
    }
    if (systemStream) {
      systemStream.getTracks().forEach(track => track.stop());
      setSystemStream(null);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

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
      // Arrêter l'enregistrement en cours s'il y en a un
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
        setRecording(false);
      }

      // Attendre un court instant pour s'assurer que l'enregistrement précédent est bien arrêté
      await new Promise((resolve) => setTimeout(resolve, 100));

      let finalStream = null;
      let micStreamLocal = null;
      let systemStreamLocal = null;

      // Capturer l'audio du microphone si nécessaire
      if (captureMode === "microphone" || captureMode === "both") {
        micStreamLocal = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          }
        });
        setMicStream(micStreamLocal);
        console.log("[handleStartRecording] Microphone captured");
      }

      // Capturer l'audio du système si nécessaire
      if (captureMode === "system" || captureMode === "both") {
        systemStreamLocal = await captureSystemAudio();
        setSystemStream(systemStreamLocal);
        setIsRecordingCall(true);
        console.log("[handleStartRecording] System audio captured");
      }

      // Déterminer le flux final selon le mode
      if (captureMode === "both" && micStreamLocal && systemStreamLocal) {
        finalStream = await createMixedAudioStream(micStreamLocal, systemStreamLocal);
        console.log("[handleStartRecording] Using mixed audio (mic + system)");
      } else if (captureMode === "system" && systemStreamLocal) {
        finalStream = systemStreamLocal;
        console.log("[handleStartRecording] Using system audio only");
      } else if (micStreamLocal) {
        finalStream = micStreamLocal;
        console.log("[handleStartRecording] Using microphone only");
      } else {
        throw new Error("Aucun flux audio disponible");
      }

      // Créer l'enregistreur avec le flux final
      const mediaRecorder = new MediaRecorder(finalStream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
          ? 'audio/webm;codecs=opus' 
          : 'audio/webm'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunks.current = [];

      mediaRecorder.ondataavailable = (e) => {
        audioChunks.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunks.current, { type: "audio/webm" });
        console.log("[onstop] Recorded blob created:", blob, "Size:", blob.size, "bytes");
        setRecordedBlob(blob);

        const recordedFile = new File([blob], 
          `recording-${captureMode}-${Date.now()}.webm`, {
          type: "audio/webm",
        });

        try {
          console.log("📤 [onstop] Uploading recorded file...");
          await uploadAudioToServer(recordedFile);
        } catch (err) {
          alert("Error uploading recording: " + err.message);
        } finally {
          // Nettoyer les ressources
          cleanupAudioResources();
          setIsRecordingCall(false);
        }
      };

      mediaRecorder.start(1000); // Enregistrer des chunks de 1 seconde
      console.log(`[handleStartRecording] Recording started in ${captureMode} mode`);
      setRecording(true);
    } catch (err) {
      console.error("[handleStartRecording] Error:", err);
      cleanupAudioResources();
      setIsRecordingCall(false);
      alert("Erreur de démarrage: " + err.message);
    }
  };

  const handleStopRecording = () => {
    console.log("[handleStopRecording] Stopping recording...");
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    setIsRecordingCall(false);
    
    // Nettoyer les ressources après un court délai
    setTimeout(() => {
      cleanupAudioResources();
    }, 1000);
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
              <h2>🎤 Record Audio</h2>
              
              {/* Sélecteur de mode de capture */}
              <div className="capture-mode-selector">
                <h3>Mode de capture audio :</h3>
                <div className="radio-group">
                  <label>
                    <input
                      type="radio"
                      name="captureMode"
                      value="microphone"
                      checked={captureMode === "microphone"}
                      onChange={(e) => setCaptureMode(e.target.value)}
                      disabled={recording}
                    />
                    🎤 Microphone uniquement
                    <span className="mode-description">Capture seulement votre voix</span>
                  </label>
                  
                  <label>
                    <input
                      type="radio"
                      name="captureMode"
                      value="system"
                      checked={captureMode === "system"}
                      onChange={(e) => setCaptureMode(e.target.value)}
                      disabled={recording}
                    />
                    🖥️ Audio système (appel)
                    <span className="mode-description">Capture l'audio de votre écran/appel</span>
                  </label>
                  
                  <label>
                    <input
                      type="radio"
                      name="captureMode"
                      value="both"
                      checked={captureMode === "both"}
                      onChange={(e) => setCaptureMode(e.target.value)}
                      disabled={recording}
                    />
                    🎤+🖥️ Les deux
                    <span className="mode-description">Capture votre voix + l'audio de l'appel</span>
                  </label>
                </div>
              </div>

              {/* Affichage de l'état */}
              <div className="recording-status">
                {recordedBlob ? (
                  <div>
                    <audio controls src={URL.createObjectURL(recordedBlob)} />
                    <p>✅ Enregistrement terminé</p>
                  </div>
                ) : recording ? (
                  <div>
                    <p className="recording-indicator">
                      🔴 Enregistrement en cours...
                      {isRecordingCall && <span className="call-indicator">📞 Appel détecté</span>}
                    </p>
                    <p className="recording-mode">Mode: {
                      captureMode === "microphone" ? "Microphone" :
                      captureMode === "system" ? "Audio système" :
                      "Microphone + Audio système"
                    }</p>
                  </div>
                ) : (
                  <p>Sélectionnez un mode et cliquez pour démarrer l'enregistrement</p>
                )}
              </div>

              <div className="record-buttons">
                {!recording ? (
                  <button 
                    onClick={handleStartRecording}
                    className="start-record-btn"
                  >
                    🔴 Démarrer l'enregistrement
                  </button>
                ) : (
                  <button 
                    onClick={handleStopRecording}
                    className="stop-record-btn"
                  >
                    ⏹️ Arrêter l'enregistrement
                  </button>
                )}
              </div>

              {/* Avertissements et conseils */}
              <div className="recording-tips">
                <h4>💡 Conseils pour un enregistrement optimal :</h4>
                <ul>
                  <li><strong>Microphone</strong> : Pour enregistrer uniquement votre voix</li>
                  <li><strong>Audio système</strong> : Pour capturer l'audio d'un appel (Zoom, Teams, etc.)</li>
                  <li><strong>Les deux</strong> : Recommandé pour les réunions - capture tous les participants</li>
                </ul>
                <p className="warning">
                  ⚠️ L'audio système nécessite l'autorisation de partage d'écran
                </p>

                {captureMode === "both" && (
                  <div className="call-recording-info">
                    <h5>📞 Enregistrement d'appel avec collègues :</h5>
                    <ol>
                      <li>Rejoignez votre réunion (Meet, Zoom, Teams...)</li>
                      <li>Cliquez "Démarrer l'enregistrement"</li>
                      <li>Autorisez le microphone ✅</li>
                      <li>Sélectionnez l'onglet de votre réunion dans le partage d'écran</li>
                      <li>Cochez "Partager l'audio" ✅</li>
                      <li>La transcription capturera TOUTES les voix 🎯</li>
                    </ol>
                    <p className="quality-tip">
                      🎧 <strong>Conseil</strong> : Utilisez un casque pour éviter l'écho et améliorer la qualité
                    </p>
                  </div>
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
