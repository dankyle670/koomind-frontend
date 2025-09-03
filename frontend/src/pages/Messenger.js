import { useState, useRef, useEffect } from "react";
import { getToken, getUserInfo, logout } from "../auth";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import "../css/Messenger.css";
import Menu from "../components/Menu";
import notificationSoundFile from "../sounds/notification.wav";

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
  const [unreadCounts, setUnreadCounts] = useState({});
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const currentRoomRef = useRef(null);
  const audioRef = useRef(new Audio(notificationSoundFile));
  const navigate = useNavigate();

  // --- Jouer le son
  const playNotificationSound = () => {
    const audio = audioRef.current;
    audio.currentTime = 0;
    audio.play().catch((err) => console.warn("Erreur lecture son:", err));
  };

  // --- Initialisation socket (une seule fois)
  useEffect(() => {
    if (!getToken()) return;

    socketRef.current = io(SOCKET_URL, { auth: { token: getToken() } });

    socketRef.current.on("connect", () => {
      console.log("✅ Socket connecté:", socketRef.current.id);
    });

    socketRef.current.on("message", (newMessage) => {
      setConversations((prevConversations) =>
        prevConversations.map((conv) => {
          if (conv._id === newMessage.conversation) {
            if (conv.messages?.some((msg) => msg._id === newMessage._id)) return conv;

            const updatedConv = {
              ...conv,
              messages: [...(conv.messages || []), newMessage],
            };

            // Mettre à jour activeConv si nécessaire
            setActiveConv((prevActive) => {
              if (prevActive?._id === updatedConv._id) {
                return updatedConv;
              }
              return prevActive;
            });

            // Si ce n’est pas la conversation active, incrémenter compteur + notifications
            setUnreadCounts((prev) => {
              if (activeConv?._id !== updatedConv._id) {
                // Notifications
                if ("Notification" in window && Notification.permission === "granted") {
                  new Notification(
                    `Nouveau message${
                      updatedConv.type === "channel" ? " dans #" + updatedConv.name : ""
                    }`,
                    { body: `${newMessage.author?.name || "Utilisateur"}: ${newMessage.text}` }
                  );
                }
                playNotificationSound();

                return {
                  ...prev,
                  [updatedConv._id]: (prev[updatedConv._id] || 0) + 1,
                };
              }
              return prev;
            });

            return updatedConv;
          }
          return conv;
        })
      );
    });

    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission();
    }

    return () => {
      socketRef.current.disconnect();
    };
  }, []); // ⚠️ Vide pour ne créer qu’une seule fois

  // --- Fetch conversations
  useEffect(() => {
    if (!getToken()) return navigate("/login");

    const fetchConversations = async () => {
      try {
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

  // --- Join/leave rooms
  useEffect(() => {
    if (!activeConv || !socketRef.current) return;

    if (currentRoomRef.current) {
      socketRef.current.emit("leave", currentRoomRef.current);
    }

    socketRef.current.emit("join", activeConv._id);
    currentRoomRef.current = activeConv._id;

    // Reset unread pour la conversation active
    setUnreadCounts((prev) => ({ ...prev, [activeConv._id]: 0 }));
  }, [activeConv]);

  // --- Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConv?.messages]);

  // --- ENVOI MESSAGE
  const sendMessage = () => {
  if (!input.trim() || !activeConv || !socketRef.current) return;

  const messageData = {
    conversation: activeConv._id,
    author: { _id: userId, name: getUserInfo().name },
    authorId: userId,
    text: input.trim(),
    createdAt: new Date().toISOString(),
  };

  // Envoyer via socket seulement
  socketRef.current.emit("message", messageData);

  setInput("");
};

  // --- CREATE CHANNEL / PRIVATE conversation
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
      const res = await fetch(`${API_BASE_URL}/messenger/conversations/${channelId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
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

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  return (
    <>
      <Menu unread={totalUnread} />
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
                {unreadCounts[conv._id] > 0 && (
                  <span className="badge">{unreadCounts[conv._id]}</span>
                )}
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
                {unreadCounts[conv._id] > 0 && (
                  <span className="badge">{unreadCounts[conv._id]}</span>
                )}
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
