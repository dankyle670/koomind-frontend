import React, { useState } from "react";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

export default function TextToAudio() {
  const [text, setText] = useState("");
  const [audioUrl, setAudioUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleConvert = async () => {
    if (!text.trim()) return;

    setLoading(true);
    setAudioUrl(null);

    try {
      const res = await fetch(`${API_BASE_URL}/text-to-audio`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
    } catch (err) {
      alert("Error converting text to audio");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h2 className="text-2xl font-semibold mb-4">Convert Text to MP3</h2>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Enter your text..."
        className="w-full border border-gray-300 rounded p-2 mb-4 min-h-[150px]"
      />
      <button
        onClick={handleConvert}
        disabled={loading || !text.trim()}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Generating..." : "Convert to Audio"}
      </button>

      {audioUrl && (
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-2">Download MP3:</h3>
          <audio controls src={audioUrl} className="w-full mb-4" />
          <a
            href={audioUrl}
            download="converted.mp3"
            className="inline-block bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Download Audio
          </a>
        </div>
      )}
    </div>
  );
}
