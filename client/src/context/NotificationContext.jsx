import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useAuth } from "@clerk/clerk-react";
import { useSocket } from "./SocketContext";
import { API_BASE_URL } from "../api/config";

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { isSignedIn, getToken } = useAuth();
  const socket = useSocket();
  const [notifications, setNotifications] = useState([]);

  const refresh = useCallback(async () => {
    if (!isSignedIn) return;
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;
      setNotifications(await response.json());
    } catch (err) {
      console.error("❌ Помилка сповіщень:", err);
    }
  }, [isSignedIn, getToken]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- початкове завантаження сповіщень при монтуванні
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!socket) return;
    const handler = (notification) => {
      setNotifications((prev) => [notification, ...prev]);
    };
    socket.on("newNotification", handler);
    return () => socket.off("newNotification", handler);
  }, [socket]);

  const markOneRead = useCallback(
    async (id) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      try {
        const token = await getToken();
        await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (err) {
        console.error("❌ Помилка позначення сповіщення:", err);
      }
    },
    [getToken],
  );

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      const token = await getToken();
      await fetch(`${API_BASE_URL}/notifications/read-all`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error("❌ Помилка позначення сповіщень:", err);
    }
  }, [getToken]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, markOneRead, markAllRead, refresh }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
