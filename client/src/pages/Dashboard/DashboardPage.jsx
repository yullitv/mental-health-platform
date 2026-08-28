import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { useCurrentUser } from "../../context/CurrentUserContext";
import { API_BASE_URL } from "../../api/config";

const STATUS_LABELS = {
  CREATED: "Заброньовано",
  PENDING_DONATION: "Донат на розгляді",
  CONFIRMED: "Підтверджено",
  COMPLETED: "Завершено",
  CANCELLED: "Скасовано",
};

const formatDate = (iso) =>
  new Date(iso).toLocaleString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const DashboardPage = () => {
  const { getToken } = useAuth();
  const { dbUser } = useCurrentUser();
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!dbUser) return;

    const fetchSessions = async () => {
      try {
        const token = await getToken();
        const response = await fetch(`${API_BASE_URL}/sessions/mine`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error("Не вдалось завантажити сесії");
        setSessions(await response.json());
      } catch (err) {
        console.error("❌ Помилка завантаження сесій:", err);
        setError("Не вдалось завантажити твої сесії.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessions();
  }, [dbUser, getToken]);

  return (
    <div className="max-w-4xl mx-auto text-left bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] p-6">
      <h2 className="text-2xl font-extrabold text-ink mb-4">Кабінет</h2>

      {isLoading && <p className="text-muted">Завантаження...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!isLoading && !error && sessions.length === 0 && (
        <p className="text-muted">У тебе поки немає сесій.</p>
      )}

      <div className="flex flex-col gap-3">
        {sessions.map((session) => (
          <div
            key={session.id}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-canvas border border-border rounded-xl p-4"
          >
            <div>
              <p className="font-semibold text-ink">
                {dbUser?.role === "SPECIALIST"
                  ? `${session.client?.firstName || ""} ${session.client?.lastName || ""}`
                  : `${session.specialist?.user?.firstName || ""} ${session.specialist?.user?.lastName || ""}`}
              </p>
              <p className="text-sm text-muted">{formatDate(session.startTime)}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold bg-primary-soft text-primary px-3 py-1 rounded-lg">
                {STATUS_LABELS[session.status] || session.status}
              </span>
              {dbUser?.role === "CLIENT" && session.status === "CREATED" && (
                <Link
                  to={`/sessions/${session.id}/donate`}
                  className="text-sm font-semibold text-primary hover:underline"
                >
                  Внести донат
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardPage;