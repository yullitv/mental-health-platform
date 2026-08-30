import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { API_BASE_URL } from "../../api/config";

const formatDate = (iso) =>
  new Date(iso).toLocaleString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const NotificationsPage = () => {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadNotifications = useCallback(async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Не вдалось завантажити сповіщення");
      setNotifications(await response.json());
    } catch (err) {
      console.error("❌ Помилка сповіщень:", err);
      setError("Не вдалось завантажити сповіщення.");
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkAllRead = async () => {
    try {
      const token = await getToken();
      await fetch(`${API_BASE_URL}/notifications/read-all`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      await loadNotifications();
    } catch (err) {
      console.error("❌ Помилка позначення сповіщень:", err);
    }
  };

  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.isRead) {
        const token = await getToken();
        await fetch(`${API_BASE_URL}/notifications/${notification.id}/read`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
        });
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, isRead: true } : n,
          ),
        );
      }
    } finally {
      if (notification.link) {
        navigate(notification.link);
      }
    }
  };

  const hasUnread = notifications.some((n) => !n.isRead);

  return (
    <div className="max-w-2xl mx-auto text-left bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-extrabold text-ink">Сповіщення</h2>
        {hasUnread && (
          <button
            onClick={handleMarkAllRead}
            className="text-sm font-semibold text-primary hover:underline"
          >
            Позначити всі прочитаними
          </button>
        )}
      </div>

      {isLoading && <p className="text-muted">Завантаження...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!isLoading && !error && notifications.length === 0 && (
        <p className="text-muted">У тебе поки немає сповіщень.</p>
      )}

      <div className="flex flex-col gap-2">
        {notifications.map((notification) => (
          <button
            key={notification.id}
            onClick={() => handleNotificationClick(notification)}
            className={`text-left rounded-xl p-4 border transition ${
              notification.isRead
                ? "bg-canvas border-border"
                : "bg-primary-soft border-primary"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="font-semibold text-ink">{notification.title}</p>
              {!notification.isRead && (
                <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
              )}
            </div>
            {notification.message && (
              <p className="text-sm text-muted mt-1">{notification.message}</p>
            )}
            <p className="text-xs text-muted mt-2">
              {formatDate(notification.createdAt)}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default NotificationsPage;