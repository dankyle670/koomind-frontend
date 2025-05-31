import { useState, useEffect, useRef } from "react";
import "../css/ChatBot.css";
import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

export default function ChatBot({ user }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: "bot", text: "Hi 👋 How can I help you today?" }
  ]);
  const [input, setInput] = useState("");
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [pendingEmail, setPendingEmail] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const messagesEndRef = useRef(null);

  // Extract email/name from user prop
  useEffect(() => {
    if (user?.email) {
      setUserEmail(user.email);
      const name = user.email.split("@")[0];
      setUserName(name.charAt(0).toUpperCase() + name.slice(1));
    } else if (typeof user === "string") {
      setUserEmail(user);
      const name = user.split("@")[0];
      setUserName(name.charAt(0).toUpperCase() + name.slice(1));
    }
  }, [user]);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pendingEmail]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { sender: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    // Confirm email sending
    if (pendingEmail && ["oui", "yes", "vas-y", "ok"].includes(input.toLowerCase().trim())) {
      try {
        const res = await axios.post(`${API_BASE_URL}/chatbot`, {
          forceSendEmail: true,
          userEmail,
          userName,
          ...pendingEmail
        });

        setMessages((prev) => [...prev, { sender: "bot", text: res.data.reply }]);
        setSuccessMessage(res.data.reply);
        setTimeout(() => setSuccessMessage(""), 3000);
        setPendingEmail(null);
      } catch {
        setMessages((prev) => [
          ...prev,
          { sender: "bot", text: "❌ Impossible d’envoyer l’email." }
        ]);
      }
      return;
    }

    try {
      const res = await axios.post(`${API_BASE_URL}/chatbot`, {
        message: input,
        userEmail,
        userName
      });

      const reply = res.data.reply;
      if (res.data.pendingEmail) {
        setPendingEmail(res.data.pendingEmail);
      } else {
        setPendingEmail(null);
      }

      setMessages((prev) => [...prev, { sender: "bot", text: reply }]);
      if (reply.includes("✅ Email bien envoyé") || reply.includes("✅ Email successfully sent")) {
        setSuccessMessage(reply);
        setTimeout(() => setSuccessMessage(""), 3000);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "❌ Error processing your request." }
      ]);
    }
  };

  return (
    <>
      <div className="chatbot-button" onClick={() => setOpen(!open)}>
        💬
      </div>

      {open && (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <span>KOOmind.ai 🤖</span>
            <button onClick={() => setOpen(false)}>✖</button>
          </div>

          <div className="chatbot-messages">
            {messages.map((msg, idx) => (
              <div key={idx} className={`chat-message ${msg.sender}`}>
                {msg.text}
              </div>
            ))}

            {/* Editable Email preview */}
            {pendingEmail && (
              <div className="email-preview">
                <p>📧 <strong>Email à envoyer :</strong></p>
                <p><strong>À :</strong> {pendingEmail.target}</p>

                <label><strong>Sujet :</strong></label>
                <input
                  type="text"
                  value={pendingEmail.subject}
                  onChange={(e) =>
                    setPendingEmail((prev) => ({ ...prev, subject: e.target.value }))
                  }
                />

                <label><strong>Contenu :</strong></label>
                <textarea
                  rows="6"
                  value={pendingEmail.body}
                  onChange={(e) =>
                    setPendingEmail((prev) => ({ ...prev, body: e.target.value }))
                  }
                />

                <p>🟡 Réponds "oui" ou "ok" pour envoyer l’email avec les modifications ci-dessus.</p>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="chatbot-input">
            <input
              type="text"
              placeholder="Ask something..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />
            <button onClick={handleSend}>➤</button>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="chat-toast">
          {successMessage}
        </div>
      )}
    </>
  );
}