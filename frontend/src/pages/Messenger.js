import { useState, useRef, useEffect } from "react";
import { getToken, getUserInfo, logout } from "../auth";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import "../css/Messenger.css";
import Menu from "../components/Menu";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL;

export default function Messenger() {
  const { userId } = getUserInfo();
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [input, setInput] = useState("");
  const [newConvName, setNewConvName] = useState("");
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [showPrivateModal, setShowPrivateModal] = useState(false);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  const socketRef = useRef(null);

  // --- Fonction pour jouer un bip simple (Web Audio API)
  const playNotificationSound = () => {
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = context.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(440, context.currentTime);
    oscillator.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.1);
  };

  // --- Initialisation Socket.io
  useEffect(() => {
    if (!getToken()) return;

    console.log("🔗 Initialisation Socket.io...");
    socketRef.current = io(SOCKET_URL, {
      auth: { token: getToken() },
    });

    socketRef.current.on("connect", () => {
      console.log("✅ Socket connecté:", socketRef.current.id);
    });

    socketRef.current.on("message", (newMessage) => {
      console.log("📨 Message reçu via socket:", newMessage);

      setConversations((prevConversations) =>
        prevConversations.map((conv) => {
          if (conv._id === newMessage.conversation) {
            // --- Si le message existe déjà, on ne fait rien
            if (conv.messages?.some((msg) => msg._id === newMessage._id)) return conv;

            const updatedConv = {
              ...conv,
              messages: [...(conv.messages || []), newMessage],
            };

            // --- Notification si ce n'est pas la conversation active
            if (activeConv?._id !== updatedConv._id) {
              playNotificationSound();
              if (Notification.permission === "granted") {
                new Notification(
                  `Nouveau message${updatedConv.type === "channel" ? " dans #" + updatedConv.name : ""}`,
                  {
                    body: `${newMessage.author?.name || "Utilisateur"}: ${newMessage.text}`,
                  }
                );
              }
            }

            // --- Mettre à jour activeConv si c'est la conversation active
            setActiveConv((prevActive) =>
              prevActive?._id === updatedConv._id ? updatedConv : prevActive
            );

            return updatedConv;
          }
          return conv;
        })
      );
    });

    socketRef.current.on("error", (error) => {
      console.error("❌ Socket error:", error);
    });

    // --- Demande de permission notification
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission();
    }

    return () => {
      if (socketRef.current) {
        console.log("🔌 Déconnexion socket");
        socketRef.current.disconnect();
      }
    };
  }, [activeConv]);

  // --- Fetch conversations au chargement
  useEffect(() => {
    if (!getToken()) return navigate("/login");

    const fetchConversations = async () => {
      try {
        console.log("🔄 Fetch conversations...");
        const res = await fetch(`${API_BASE_URL}/messenger/conversations`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });

        if (!res.ok) throw new Error("Unauthorized");

        const data = await res.json();
        setConversations(data);
        if (data.length > 0) setActiveConv(data[0]);
      } catch (err) {
        console.error("❌ Erreur fetch conversations:", err);
        logout();
        navigate("/login");
      }
    };

    fetchConversations();
  }, [navigate]);

  // --- Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/users`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const data = await res.json();
        setUsers(data.filter((u) => u._id !== userId));
      } catch (err) {
        console.error("❌ Erreur fetch users:", err);
      }
    };
    fetchUsers();
  }, [userId]);

  // --- Rejoindre conversation active
  useEffect(() => {
    if (activeConv && socketRef.current) {
      console.log("📍 Join room:", activeConv._id);
      socketRef.current.emit("join", activeConv._id);
    }
  }, [activeConv]);

  // --- Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConv?.messages]);

  // --- Envoyer un message
  const sendMessage = () => {
    if (!input.trim() || !activeConv || !socketRef.current) return;

    const messageData = {
      conversation: activeConv._id,
      authorId: userId,
      text: input.trim(),
    };

    socketRef.current.emit("message", messageData);
    setInput("");
  };

  const createChannel = async () => {
    if (!newConvName.trim() || selectedUsers.length === 0) {
      alert("Veuillez saisir un nom et sélectionner au moins un utilisateur !");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/messenger/conversations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          name: newConvName,
          type: "channel",
          participants: selectedUsers,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error creating channel");

      setConversations([...conversations, data]);
      setActiveConv(data);
      socketRef.current?.emit("join", data._id);

      setNewConvName("");
      setSelectedUsers([]);
      setShowChannelModal(false);
    } catch (err) {
      console.error("❌ Erreur création channel:", err);
      alert("❌ " + err.message);
    }
  };

  const createPrivateConversation = async () => {
    if (!selectedUser) return;

    try {
      const res = await fetch(`${API_BASE_URL}/messenger/conversations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          type: "private",
          participantId: selectedUser,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error creating conversation");

      if (!conversations.find((c) => c._id === data._id)) {
        setConversations([...conversations, data]);
      }

      setActiveConv(data);
      socketRef.current?.emit("join", data._id);

      setSelectedUser(null);
      setShowPrivateModal(false);
    } catch (err) {
      console.error("❌ Erreur création conversation:", err);
      alert("❌ " + err.message);
    }
  };

  const deleteChannel = async (channelId, channelName) => {
    if (!window.confirm(`Supprimer le channel "${channelName}" ?`)) return;

    try {
      const res = await fetch(
        `${API_BASE_URL}/messenger/conversations/${channelId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${getToken()}` },
        }
      );

      if (!res.ok) throw new Error("Impossible de supprimer le channel");

      setConversations(conversations.filter((c) => c._id !== channelId));
      if (activeConv?._id === channelId) setActiveConv(null);
    } catch (err) {
      console.error("❌ Erreur suppression:", err);
      alert("❌ " + err.message);
    }
  };

  const toggleUserSelection = (id) => {
    setSelectedUsers((prev) =>
      prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]
    );
  };

  const channels = conversations.filter((c) => c.type === "channel");
  const privates = conversations.filter(
    (c) => c.type === "private" && c.participants?.some((p) => p._id === userId)
  );

  return (
    <>
      <Menu />
      <div className="messenger-container">
        {/* Sidebar */}
        <div className="messenger-sidebar">
          <h3>📢 Channels</h3>
          <div className="conv-list">
            {channels.map((conv) => (
              <div
                key={conv._id}
                className={`conv-item ${conv._id === activeConv?._id ? "active" : ""}`}
                onClick={() => setActiveConv(conv)}
              >
                <span># {conv.name}</span>
                <span style={{ fontSize: "10px", color: "#666" }}>
                  ({conv.messages?.length || 0})
                </span>
                <button
                  className="delete-channel-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteChannel(conv._id, conv.name);
                  }}
                >
                  🗑
                </button>
              </div>
            ))}
          </div>

          <h3>👤 Privés</h3>
          <div className="conv-list">
            {privates.map((conv) => (
              <div
                key={conv._id}
                className={`conv-item ${conv._id === activeConv?._id ? "active" : ""}`}
                onClick={() => setActiveConv(conv)}
              >
                {conv.participants
                  ?.filter((p) => p._id !== userId)
                  .map((p) => p.name)
                  .join(", ") || "Conversation privée"}
                <span style={{ fontSize: "10px", color: "#666" }}>
                  ({conv.messages?.length || 0})
                </span>
              </div>
            ))}
          </div>

          <div className="sidebar-bottom">
            <button className="sidebar-btn" onClick={() => setShowChannelModal(true)}>
              ➕ Nouveau channel
            </button>
            <button className="sidebar-btn" onClick={() => setShowPrivateModal(true)}>
              ➕ Nouvelle conversation
            </button>
          </div>
        </div>

        {/* Chat principal */}
        <div className="messenger-main">
          <div className="messenger-header">
            {activeConv
              ? activeConv.type === "channel"
                ? `# ${activeConv.name}`
                : activeConv.participants
                    ?.filter((p) => p._id !== userId)
                    .map((p) => p.name)
                    .join(", ") || "Conversation privée"
              : "Sélectionnez une conversation"}
          </div>

          <div className="messenger-messages">
            {activeConv?.messages?.length > 0 ? (
              activeConv.messages.map((msg, index) => (
                <div
                  key={msg._id || index}
                  className={`msg-wrapper ${msg.author?._id === userId ? "me" : "other"}`}
                >
                  <div className="msg-bubble">
                    {activeConv.type === "channel" && (
                      <div className="msg-author">{msg.author?.name || "Utilisateur"}</div>
                    )}
                    <div className="msg-text">{msg.text}</div>
                    <div className="msg-time">
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-messages">
                {activeConv ? "Aucun message dans cette conversation" : "Sélectionnez une conversation"}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {activeConv && (
            <div className="messenger-input">
              <input
                type="text"
                placeholder={`Message dans ${
                  activeConv.type === "channel" ? "#" + activeConv.name : "cette conversation"
                }`}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              />
              <button onClick={sendMessage} disabled={!input.trim()}>
                ➡️
              </button>
            </div>
          )}
        </div>

        {/* Modals */}
        {showChannelModal && (
          <div className="modal-overlay" onClick={() => setShowChannelModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>Créer un channel</h3>
              <input
                type="text"
                value={newConvName}
                onChange={(e) => setNewConvName(e.target.value)}
                placeholder="Nom du channel"
              />
              <div className="participants-list">
                {users.map((u) => (
                  <label key={u._id}>
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(u._id)}
                      onChange={() => toggleUserSelection(u._id)}
                    />
                    {u.name}
                  </label>
                ))}
              </div>
              <div className="modal-actions">
                <button onClick={createChannel}>Créer</button>
                <button onClick={() => setShowChannelModal(false)}>Annuler</button>
              </div>
            </div>
          </div>
        )}

        {showPrivateModal && (
          <div className="modal-overlay" onClick={() => setShowPrivateModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>Nouvelle conversation privée</h3>
              <select
                value={selectedUser || ""}
                onChange={(e) => setSelectedUser(e.target.value)}
              >
                <option value="">Sélectionner un utilisateur</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name}
                  </option>
                ))}
              </select>
              <div className="modal-actions">
                <button onClick={createPrivateConversation}>Créer</button>
                <button onClick={() => setShowPrivateModal(false)}>Annuler</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
