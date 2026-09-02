import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { API_BASE_URL } from "../../api/config";

const formatSlot = (iso) =>
  new Date(iso).toLocaleString("uk-UA", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const AvailabilityManager = () => {
  const { getToken } = useAuth();
  const [slots, setSlots] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const loadSlots = useCallback(async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/availability/mine`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Не вдалось завантажити слоти");
      const data = await response.json();
      setSlots(data);
    } catch (err) {
      console.error("❌ Помилка завантаження вільних дат:", err);
      setError("Не вдалось завантажити вільні дати.");
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");

    if (!date || !startTime || !endTime) {
      setError("Заповни дату, час початку і час завершення.");
      return;
    }

    const startIso = new Date(`${date}T${startTime}`).toISOString();
    const endIso = new Date(`${date}T${endTime}`).toISOString();

    if (new Date(endIso) <= new Date(startIso)) {
      setError("Час завершення має бути пізніше за час початку.");
      return;
    }
    if (new Date(startIso) <= new Date()) {
      setError("Обери час у майбутньому.");
      return;
    }

    setIsCreating(true);
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/availability`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ startTime: startIso, endTime: endIso }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Не вдалось додати слот");
      }
      setStartTime("");
      setEndTime("");
      setNotice("Вільний час додано.");
      await loadSlots();
    } catch (err) {
      console.error("❌ Помилка створення слоту:", err);
      setError(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (slotId) => {
    setBusyId(slotId);
    setError("");
    setNotice("");
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/availability/${slotId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Не вдалось видалити слот");
      }
      await loadSlots();
    } catch (err) {
      console.error("❌ Помилка видалення слоту:", err);
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const upcomingSlots = slots
    .filter((s) => new Date(s.endTime) > new Date())
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

  return (
    <div className="bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] p-6 space-y-4">
      <div>
        <h2 className="text-xl font-extrabold text-ink mb-1">Вільні дати</h2>
        <p className="text-sm text-muted">
          Додай час, коли ти доступна для сесій — клієнти побачать ці слоти на
          твоїй публічній картці й зможуть забронювати.
        </p>
      </div>

      {notice && (
        <p className="text-sm text-primary bg-primary-soft rounded-xl p-3">
          {notice}
        </p>
      )}
      {error && (
        <p className="text-sm text-danger bg-danger/10 rounded-xl p-3">{error}</p>
      )}

      <form onSubmit={handleCreate} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
          />
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
          />
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
          />
        </div>
        <button
          type="submit"
          disabled={isCreating}
          className="px-5 py-2 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary-dark transition disabled:opacity-50"
        >
          {isCreating ? "Додавання..." : "Додати"}
        </button>
      </form>

      {isLoading && <p className="text-muted">Завантаження...</p>}
      {!isLoading && upcomingSlots.length === 0 && (
        <p className="text-muted">Поки немає доданих вільних дат.</p>
      )}

      <div className="flex flex-col gap-3">
        {upcomingSlots.map((slot) => (
          <div
            key={slot.id}
            className="flex items-center justify-between gap-3 bg-canvas border border-border rounded-xl p-4"
          >
            <div>
              <p className="font-semibold text-ink">
                {formatSlot(slot.startTime)} – {formatSlot(slot.endTime).split(", ").pop()}
              </p>
              <span
                className={`text-xs font-semibold px-2 py-1 rounded-lg ${
                  slot.isBooked
                    ? "bg-primary-soft text-primary"
                    : "bg-accent-soft text-accent"
                }`}
              >
                {slot.isBooked ? "Заброньовано" : "Вільно"}
              </span>
            </div>
            {!slot.isBooked && (
              <button
                onClick={() => handleDelete(slot.id)}
                disabled={busyId === slot.id}
                className="text-sm font-semibold text-danger hover:underline disabled:opacity-50"
              >
                Видалити
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AvailabilityManager;
