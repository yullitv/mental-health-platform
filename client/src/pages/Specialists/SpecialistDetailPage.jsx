import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { API_BASE_URL, SERVER_ORIGIN } from "../../api/config";
import { useCurrentUser } from "../../context/CurrentUserContext";

const CONCERN_LABELS = {
  anxiety: "Тривожність",
  stress: "Стрес",
  relationships: "Стосунки",
  sleep: "Сон",
  self_esteem: "Самооцінка",
  grief: "Втрата / горе",
  other: "Інше",
};

const formatSlot = (iso) =>
  new Date(iso).toLocaleString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const SpecialistDetailPage = () => {
  const { id } = useParams();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const { dbUser } = useCurrentUser();
  const isAdmin = dbUser?.role === "ADMIN";

  const [specialist, setSpecialist] = useState(null);
  const [slots, setSlots] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [bookingSlotId, setBookingSlotId] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [specialistRes, slotsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/specialists/${id}`),
          fetch(`${API_BASE_URL}/availability/${id}`),
        ]);

        if (!specialistRes.ok) throw new Error("Спеціаліста не знайдено");

        setSpecialist(await specialistRes.json());
        setSlots(slotsRes.ok ? await slotsRes.json() : []);
      } catch (err) {
        console.error("❌ Помилка завантаження:", err);
        setError("Не вдалось завантажити дані спеціаліста.");
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [id]);

  const handleBook = async (slotId) => {
    setBookingSlotId(slotId);
    setError("");
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/sessions/book`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ slotId }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Не вдалось забронювати слот");
      }

      navigate("/dashboard");
    } catch (err) {
      console.error("❌ Помилка бронювання:", err);
      setError(err.message);
    } finally {
      setBookingSlotId(null);
    }
  };

  if (isLoading) {
    return <p className="text-muted text-center">Завантаження...</p>;
  }

  if (!specialist) {
    return <p className="text-red-500 text-center">{error || "Спеціаліста не знайдено"}</p>;
  }

  return (
    <div className="max-w-2xl mx-auto text-left bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] p-6">
      <div className="flex items-center gap-4 mb-4">
        {specialist.photoUrl ? (
          <img
            src={`${SERVER_ORIGIN}${specialist.photoUrl}`}
            alt=""
            className="w-16 h-16 rounded-full object-cover border border-border shrink-0"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-canvas border border-border flex items-center justify-center text-2xl text-muted shrink-0">
            👤
          </div>
        )}
        <div>
          <h2 className="text-2xl font-extrabold text-ink">
            {specialist.user?.firstName} {specialist.user?.lastName}
          </h2>
          {specialist.hourlyRate && (
            <p className="text-muted">{specialist.hourlyRate} грн / сесія</p>
          )}
        </div>
      </div>
      {specialist.bio && <p className="text-ink mb-4">{specialist.bio}</p>}
      {specialist.experience && (
        <p className="text-ink mb-4">
          <span className="font-semibold">Досвід роботи:</span> {specialist.experience}
        </p>
      )}

      {specialist.specializations?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-6">
          {specialist.specializations.map((spec) => (
            <span
              key={spec}
              className="text-xs bg-primary-soft text-primary px-2 py-1 rounded-lg"
            >
              {CONCERN_LABELS[spec] || spec}
            </span>
          ))}
        </div>
      )}

      <h3 className="font-bold text-ink mb-2">Вільні слоти</h3>
      {isAdmin && (
        <p className="text-muted text-sm mb-2">
          Перегляд адміністратора: бронювання недоступне для цієї ролі.
        </p>
      )}
      {slots.length === 0 && (
        <p className="text-muted">Наразі немає вільних слотів.</p>
      )}
      <div className="flex flex-col gap-2">
        {slots.map((slot) =>
          isAdmin ? (
            <div
              key={slot.id}
              className="flex justify-between items-center bg-canvas border border-border rounded-xl px-4 py-3 opacity-70"
            >
              <span className="text-ink font-semibold">{formatSlot(slot.startTime)}</span>
              <span className="text-muted text-sm">Вільно</span>
            </div>
          ) : (
            <button
              key={slot.id}
              onClick={() => handleBook(slot.id)}
              disabled={bookingSlotId === slot.id}
              className="flex justify-between items-center bg-canvas border border-border rounded-xl px-4 py-3 hover:border-primary transition disabled:opacity-50"
            >
              <span className="text-ink font-semibold">{formatSlot(slot.startTime)}</span>
              <span className="text-primary text-sm font-semibold">
                {bookingSlotId === slot.id ? "Бронюємо..." : "Забронювати"}
              </span>
            </button>
          )
        )}
      </div>

      {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
    </div>
  );
};

export default SpecialistDetailPage;