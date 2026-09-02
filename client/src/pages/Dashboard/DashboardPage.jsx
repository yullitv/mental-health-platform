import { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { useCurrentUser } from "../../context/CurrentUserContext";
import { API_BASE_URL, SERVER_ORIGIN } from "../../api/config";
import StreakCard from "../../components/dashboard/StreakCard";
import AvailabilityManager from "../../components/dashboard/AvailabilityManager";

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
  const [pendingDonations, setPendingDonations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const loadData = useCallback(async () => {
    // Адмін не має власних сесій/донатів як клієнт чи спеціаліст — і не
    // має доступу до /sessions/mine на бекенді, тож навіть не питаємо.
    if (!dbUser || dbUser.role === "ADMIN") return;
    try {
      const token = await getToken();
      const sessionsRes = await fetch(`${API_BASE_URL}/sessions/mine`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!sessionsRes.ok) throw new Error("Не вдалось завантажити сесії");
      setSessions(await sessionsRes.json());

      if (dbUser.role === "SPECIALIST") {
        const donationsRes = await fetch(`${API_BASE_URL}/donations/pending`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPendingDonations(donationsRes.ok ? await donationsRes.json() : []);
      }
    } catch (err) {
      console.error("❌ Помилка завантаження кабінету:", err);
      setError("Не вдалось завантажити дані.");
    } finally {
      setIsLoading(false);
    }
  }, [dbUser, getToken]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDonationAction = async (donationId, action) => {
    setBusyId(donationId);
    setActionError("");
    try {
      const token = await getToken();
      const response = await fetch(
        `${API_BASE_URL}/donations/${donationId}/${action}`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Не вдалось обробити донат");
      }
      await loadData();
    } catch (err) {
      console.error("❌ Помилка обробки донату:", err);
      setActionError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleCompleteSession = async (sessionId) => {
    setBusyId(sessionId);
    setActionError("");
    try {
      const token = await getToken();
      const response = await fetch(
        `${API_BASE_URL}/sessions/${sessionId}/complete`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Не вдалось завершити сесію");
      }
      await loadData();
    } catch (err) {
      console.error("❌ Помилка завершення сесії:", err);
      setActionError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  if (dbUser?.role === "ADMIN") {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="max-w-4xl mx-auto text-left space-y-6">
      {dbUser?.role === "CLIENT" && <StreakCard />}

      {dbUser?.role === "SPECIALIST" && pendingDonations.length > 0 && (
        <div className="bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] p-6">
          <h2 className="text-xl font-extrabold text-ink mb-4">
            Донати на розгляді
          </h2>
          <div className="flex flex-col gap-3">
            {pendingDonations.map((donation) => (
              <div
                key={donation.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-canvas border border-border rounded-xl p-4"
              >
                <div>
                  <p className="font-semibold text-ink">
                    {donation.session?.client?.firstName}{" "}
                    {donation.session?.client?.lastName}
                  </p>
                  <p className="text-sm text-muted">
                    {donation.amount ? `${donation.amount} грн · ` : ""}
                    {donation.fundraiser?.name}
                  </p>
                  <a
                    href={
                      donation.proofUrl?.startsWith("http")
                        ? donation.proofUrl
                        : `${SERVER_ORIGIN}${donation.proofUrl}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-semibold text-primary hover:underline"
                  >
                    Переглянути підтвердження
                  </a>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDonationAction(donation.id, "confirm")}
                    disabled={busyId === donation.id}
                    className="px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary-dark transition disabled:opacity-50"
                  >
                    Підтвердити
                  </button>
                  <button
                    onClick={() => handleDonationAction(donation.id, "reject")}
                    disabled={busyId === donation.id}
                    className="px-4 py-2 rounded-xl text-sm font-semibold bg-canvas border border-border text-ink hover:border-red-400 transition disabled:opacity-50"
                  >
                    Відхилити
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {dbUser?.role === "SPECIALIST" && <AvailabilityManager />}

      <div className="bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] p-6">
        <h2 className="text-2xl font-extrabold text-ink mb-4">Кабінет</h2>

        {isLoading && <p className="text-muted">Завантаження...</p>}
        {error && <p className="text-red-500">{error}</p>}
        {actionError && <p className="text-red-500">{actionError}</p>}
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
                <p className="text-sm text-muted">
                  {formatDate(session.startTime)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold bg-primary-soft text-primary px-3 py-1 rounded-lg">
                  {STATUS_LABELS[session.status] || session.status}
                </span>
                <Link
                  to={`/sessions/${session.id}/chat`}
                  className="text-sm font-semibold text-primary hover:underline"
                >
                  Чат
                </Link>
                {dbUser?.role === "CLIENT" && session.status === "CREATED" && (
                  <Link
                    to={`/sessions/${session.id}/donate`}
                    className="text-sm font-semibold text-primary hover:underline"
                  >
                    Внести донат
                  </Link>
                )}
                {dbUser?.role === "CLIENT" &&
                  session.status === "COMPLETED" &&
                  (session.review ? (
                    <span className="text-sm text-muted">
                      Відгук залишено ({session.review.rating}★)
                    </span>
                  ) : (
                    <Link
                      to={`/sessions/${session.id}/review`}
                      className="text-sm font-semibold text-primary hover:underline"
                    >
                      Залишити відгук
                    </Link>
                  ))}
                {dbUser?.role === "SPECIALIST" &&
                  session.status === "CONFIRMED" && (
                    <button
                      onClick={() => handleCompleteSession(session.id)}
                      disabled={busyId === session.id}
                      className="text-sm font-semibold text-primary hover:underline disabled:opacity-50"
                    >
                      Завершити сесію
                    </button>
                  )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
