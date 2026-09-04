import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { useCurrentUser } from "../../context/CurrentUserContext";
import { API_BASE_URL } from "../../api/config";
import { getVideoRoomCredentials } from "../../utils/videoRoom";

// ВАЖЛИВО: публічний meet.jit.si офіційно призначений лише для демонстрації —
// будь-який дзвінок, вбудований отак напряму (iframe/External API), Jitsi
// примусово розриває через 5 хвилин ("Embedding meet.jit.si is only meant
// for demo purposes"). Для реальних сесій (45-60 хв) це свідомо прийняте
// обмеження цієї версії — для production знадобиться або платний Jitsi as
// a Service (JWT-автентифікація), або інший провайдер без цього ліміту
// (наприклад Daily.co — не вимагає реєстрації від учасників, тільки один
// API-ключ власника застосунку), або власний self-hosted Jitsi-сервер.
const JITSI_SCRIPT_SRC = "https://meet.jit.si/external_api.js";

const JOIN_WINDOW_BEFORE_MS = 15 * 60 * 1000; // можна зайти за 15 хв до початку
const JOIN_WINDOW_AFTER_MS = 15 * 60 * 1000; // і ще 15 хв після запланованого завершення

function loadJitsiScript() {
  return new Promise((resolve, reject) => {
    if (window.JitsiMeetExternalAPI) {
      resolve();
      return;
    }
    const existing = document.querySelector(`script[src="${JITSI_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Не вдалось завантажити Jitsi")));
      return;
    }
    const script = document.createElement("script");
    script.src = JITSI_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Не вдалось завантажити Jitsi"));
    document.body.appendChild(script);
  });
}

const formatDateTime = (iso) =>
  new Date(iso).toLocaleString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const VideoSessionPage = () => {
  const { id: sessionId } = useParams();
  const { getToken } = useAuth();
  const { dbUser } = useCurrentUser();

  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [jitsiError, setJitsiError] = useState("");

  const containerRef = useRef(null);
  const apiRef = useRef(null);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const token = await getToken();
        const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.message || "Не вдалось завантажити сесію");
        }
        setSession(await response.json());
      } catch (err) {
        console.error("❌ Помилка відео-сесії:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    loadSession();
  }, [sessionId, getToken]);

  const now = Date.now();
  const startMs = session ? new Date(session.startTime).getTime() : null;
  const endMs = session ? new Date(session.endTime).getTime() : null;
  const canJoin =
    !!session &&
    session.status === "CONFIRMED" &&
    startMs - JOIN_WINDOW_BEFORE_MS <= now &&
    now <= endMs + JOIN_WINDOW_AFTER_MS;

  useEffect(() => {
    if (!canJoin || !containerRef.current) return;

    let cancelled = false;

    const init = async () => {
      try {
        await loadJitsiScript();
        if (cancelled || !containerRef.current) return;

        const { roomName, password } = getVideoRoomCredentials(sessionId);
        const displayName =
          [dbUser?.firstName, dbUser?.lastName].filter(Boolean).join(" ") || "Учасник";

        const api = new window.JitsiMeetExternalAPI("meet.jit.si", {
          roomName,
          parentNode: containerRef.current,
          width: "100%",
          height: "100%",
          userInfo: { displayName },
          configOverwrite: {
            prejoinPageEnabled: false,
            disableDeepLinking: true,
          },
        });
        apiRef.current = api;

        // Захист кімнати паролем (детермінований з sessionId, однаковий у
        // обох учасників, без бекенду). Best-effort: перший, хто заходить,
        // стає модератором і встановлює пароль; другий отримує запит на
        // пароль, і ми підставляємо його автоматично.
        api.addEventListener("videoConferenceJoined", () => {
          api.executeCommand("password", password);
        });
        api.addEventListener("passwordRequired", () => {
          api.executeCommand("password", password);
        });
      } catch (err) {
        console.error("❌ Не вдалось завантажити відео-віджет:", err);
        if (!cancelled) {
          setJitsiError("Не вдалось завантажити відеозв'язок. Спробуй оновити сторінку.");
        }
      }
    };

    init();

    return () => {
      cancelled = true;
      apiRef.current?.dispose();
      apiRef.current = null;
    };
  }, [canJoin, sessionId, dbUser]);

  if (isLoading) {
    return <p className="max-w-2xl mx-auto text-muted">Завантаження...</p>;
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto text-left bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] p-6">
        <p className="text-red-500 mb-4">{error}</p>
        <Link to="/dashboard" className="text-primary font-semibold hover:underline">
          До кабінету
        </Link>
      </div>
    );
  }

  if (!canJoin) {
    return (
      <div className="max-w-xl mx-auto text-left bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] p-6">
        <h2 className="text-2xl font-extrabold text-ink mb-2">
          Відео-сесія ще недоступна
        </h2>
        <p className="text-muted mb-4">
          {session?.status !== "CONFIRMED"
            ? "Ця сесія ще не підтверджена — відео стане доступним після підтвердження донату."
            : `Приєднатись можна за 15 хвилин до початку. Запланований час: ${formatDateTime(
                session.startTime
              )}.`}
        </p>
        <Link to="/dashboard" className="text-primary font-semibold hover:underline">
          До кабінету
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto text-left bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] p-4 flex flex-col h-[80vh]">
      <h2 className="text-xl font-extrabold text-ink mb-2">Відео-сесія</h2>
      {jitsiError && <p className="text-red-500 text-sm mb-2">{jitsiError}</p>}
      <div ref={containerRef} className="flex-1 rounded-xl overflow-hidden bg-black" />
    </div>
  );
};

export default VideoSessionPage;
