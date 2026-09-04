import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { useCurrentUser } from "../../context/CurrentUserContext";
import { useSocket } from "../../context/SocketContext";
import { API_BASE_URL } from "../../api/config";

const formatTime = (iso) =>
  new Date(iso).toLocaleString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const ChatPage = () => {
  const { id: sessionId } = useParams();
  const { getToken } = useAuth();
  const { dbUser } = useCurrentUser();
  const socket = useSocket();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const bottomRef = useRef(null);

  const loadMessages = useCallback(async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/messages/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Не вдалось завантажити повідомлення");
      setMessages(await response.json());

      await fetch(`${API_BASE_URL}/messages/${sessionId}/read`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error("❌ Помилка чату:", err);
      setError("Не вдалось завантажити чат.");
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, getToken]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (!socket) return;

    socket.emit("joinSession", sessionId);

    const handleNewMessage = (message) => {
      if (message.sessionId !== sessionId) return;
      setMessages((prev) => [...prev, message]);
    };

    const handleMessageUpdated = (message) => {
      if (message.sessionId !== sessionId) return;
      setMessages((prev) => prev.map((m) => (m.id === message.id ? message : m)));
    };

    const handleMessageDeleted = (message) => {
      if (message.sessionId !== sessionId) return;
      setMessages((prev) => prev.map((m) => (m.id === message.id ? message : m)));
    };

    socket.on("newMessage", handleNewMessage);
    socket.on("messageUpdated", handleMessageUpdated);
    socket.on("messageDeleted", handleMessageDeleted);

    return () => {
      socket.emit("leaveSession", sessionId);
      socket.off("newMessage", handleNewMessage);
      socket.off("messageUpdated", handleMessageUpdated);
      socket.off("messageDeleted", handleMessageDeleted);
    };
  }, [socket, sessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setIsSending(true);
    setError("");
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sessionId, content: text.trim() }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Не вдалось надіслати повідомлення");
      }
      setText("");
    } catch (err) {
      console.error("❌ Помилка відправки:", err);
      setError(err.message);
    } finally {
      setIsSending(false);
    }
  };

  const startEditing = (msg) => {
    setConfirmDeleteId(null);
    setEditingId(msg.id);
    setEditText(msg.content);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditText("");
  };

  const handleSaveEdit = async (id) => {
    if (!editText.trim()) return;
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/messages/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: editText.trim() }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Не вдалось зберегти зміни");
      }
      const updated = await response.json();
      setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      cancelEditing();
    } catch (err) {
      console.error("❌ Помилка редагування:", err);
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/messages/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Не вдалось видалити повідомлення");
      }
      const updated = await response.json();
      setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      setConfirmDeleteId(null);
    } catch (err) {
      console.error("❌ Помилка видалення:", err);
      setError(err.message);
    }
  };

  return (
    <div className="max-w-2xl mx-auto text-left bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] p-6 flex flex-col h-[70vh]">
      <h2 className="text-2xl font-extrabold text-ink mb-4">Чат</h2>

      {isLoading && <p className="text-muted">Завантаження...</p>}
      {error && <p className="text-red-500 mb-2">{error}</p>}

      <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1">
        {!isLoading && messages.length === 0 && (
          <p className="text-muted">Повідомлень поки немає. Напиши перше!</p>
        )}
        {messages.map((msg) => {
          const isMine = msg.senderId === dbUser?.id;
          const isEditing = editingId === msg.id;
          return (
            <div
              key={msg.id}
              className={`group max-w-[75%] rounded-xl px-4 py-2 ${
                isMine
                  ? "bg-primary text-white self-end"
                  : "bg-canvas border border-border text-ink self-start"
              }`}
            >
              {!isMine && !msg.isDeleted && (
                <p className="text-xs font-semibold opacity-70 mb-1">
                  {msg.sender?.firstName} {msg.sender?.lastName}
                </p>
              )}

              {msg.isDeleted ? (
                <p
                  className={`italic whitespace-pre-wrap break-words ${
                    isMine ? "text-white/70" : "text-muted"
                  }`}
                >
                  Повідомлення видалено
                </p>
              ) : isEditing ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg px-2 py-1 text-sm text-ink bg-surface border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                    autoFocus
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={cancelEditing}
                      className={`text-xs font-semibold px-2 py-1 rounded-lg ${
                        isMine ? "text-white/80 hover:bg-white/10" : "text-muted hover:bg-border"
                      }`}
                    >
                      Скасувати
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(msg.id)}
                      disabled={!editText.trim()}
                      className={`text-xs font-semibold px-2 py-1 rounded-lg disabled:opacity-50 ${
                        isMine
                          ? "bg-white/20 text-white hover:bg-white/30"
                          : "bg-primary text-white hover:bg-primary-dark"
                      }`}
                    >
                      Зберегти
                    </button>
                  </div>
                </div>
              ) : (
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
              )}

              <div className="flex items-center gap-2 mt-1">
                <p
                  className={`text-[10px] ${
                    isMine ? "text-white/70" : "text-muted"
                  }`}
                >
                  {formatTime(msg.createdAt)}
                  {msg.editedAt && !msg.isDeleted ? " · змінено" : ""}
                </p>

                {isMine && !msg.isDeleted && !isEditing && (
                  <div className="flex items-center gap-1 ml-auto opacity-0 group-hover:opacity-100 transition">
                    <button
                      type="button"
                      onClick={() => startEditing(msg)}
                      title="Редагувати"
                      className="text-[11px] px-1.5 py-0.5 rounded hover:bg-white/20"
                    >
                      ✏️
                    </button>
                    {confirmDeleteId === msg.id ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleDelete(msg.id)}
                          title="Так, видалити"
                          className="text-[11px] px-1.5 py-0.5 rounded bg-danger/80 hover:bg-danger"
                        >
                          Видалити
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          title="Скасувати"
                          className="text-[11px] px-1.5 py-0.5 rounded hover:bg-white/20"
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(msg.id)}
                        title="Видалити"
                        className="text-[11px] px-1.5 py-0.5 rounded hover:bg-white/20"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex gap-2 mt-4">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Написати повідомлення..."
          className="flex-1 border border-border rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="submit"
          disabled={isSending || !text.trim()}
          className="px-5 py-2 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary-dark transition disabled:opacity-50"
        >
          Надіслати
        </button>
      </form>
    </div>
  );
};

export default ChatPage;