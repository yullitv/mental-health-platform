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

    socket.on("newMessage", handleNewMessage);

    return () => {
      socket.emit("leaveSession", sessionId);
      socket.off("newMessage", handleNewMessage);
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
          return (
            <div
              key={msg.id}
              className={`max-w-[75%] rounded-xl px-4 py-2 ${
                isMine
                  ? "bg-primary text-white self-end"
                  : "bg-canvas border border-border text-ink self-start"
              }`}
            >
              {!isMine && (
                <p className="text-xs font-semibold opacity-70 mb-1">
                  {msg.sender?.firstName} {msg.sender?.lastName}
                </p>
              )}
              <p className="whitespace-pre-wrap break-words">{msg.content}</p>
              <p
                className={`text-[10px] mt-1 ${
                  isMine ? "text-white/70" : "text-muted"
                }`}
              >
                {formatTime(msg.createdAt)}
              </p>
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