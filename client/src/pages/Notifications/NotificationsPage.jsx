import { useNavigate } from "react-router-dom";
import { useNotifications } from "../../context/NotificationContext";

const formatDate = (iso) =>
  new Date(iso).toLocaleString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount, markOneRead, markAllRead } =
    useNotifications();

  const handleNotificationClick = (notification) => {
    if (!notification.isRead) {
      markOneRead(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  return (
    <div className="max-w-2xl mx-auto text-left bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-extrabold text-ink">Сповіщення</h2>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-sm font-semibold text-primary hover:underline"
          >
            Позначити всі прочитаними
          </button>
        )}
      </div>

      {notifications.length === 0 && (
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