import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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

const SpecialistsPage = () => {
  const { dbUser } = useCurrentUser();
  const isAdmin = dbUser?.role === "ADMIN";
  const [specialists, setSpecialists] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchSpecialists = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/specialists`);
        if (!response.ok) throw new Error("Не вдалось завантажити спеціалістів");
        const data = await response.json();
        setSpecialists(data);
      } catch (err) {
        console.error("❌ Помилка завантаження спеціалістів:", err);
        setError("Не вдалось завантажити список. Спробуй пізніше.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSpecialists();
  }, []);

  return (
    <div className="max-w-4xl mx-auto text-left">
      <h2 className="text-2xl font-extrabold text-ink mb-2">Спеціалісти</h2>
      <p className="text-muted mb-6">
        {isAdmin
          ? "Перегляд підтверджених спеціалістів (без можливості бронювання)."
          : "Обери спеціаліста, який тобі підходить, і забронюй зручний час."}
      </p>

      {isLoading && <p className="text-muted">Завантаження...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!isLoading && !error && specialists.length === 0 && (
        <p className="text-muted">Поки немає підтверджених спеціалістів.</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {specialists.map((s) => (
          <Link
            key={s.id}
            to={`/specialists/${s.id}`}
            className="block bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] p-5 hover:border-primary transition"
          >
            <div className="flex items-center gap-3">
              {s.photoUrl ? (
                <img
                  src={`${SERVER_ORIGIN}${s.photoUrl}`}
                  alt=""
                  className="w-12 h-12 rounded-full object-cover border border-border shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-canvas border border-border flex items-center justify-center text-lg text-muted shrink-0">
                  👤
                </div>
              )}
              <p className="font-bold text-ink">
                {s.user?.firstName} {s.user?.lastName}
              </p>
            </div>
            {s.bio && <p className="text-muted text-sm mt-3 line-clamp-3">{s.bio}</p>}
            {s.experience && (
              <p className="text-muted text-sm mt-1 line-clamp-2">{s.experience}</p>
            )}
            {s.specializations?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {s.specializations.map((spec) => (
                  <span
                    key={spec}
                    className="text-xs bg-primary-soft text-primary px-2 py-1 rounded-lg"
                  >
                    {CONCERN_LABELS[spec] || spec}
                  </span>
                ))}
              </div>
            )}
            {s.hourlyRate && (
              <p className="text-sm text-muted mt-3">{s.hourlyRate} грн / сесія</p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default SpecialistsPage;