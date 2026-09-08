import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE_URL } from "../../api/config";
import { useCurrentUser } from "../../context/CurrentUserContext";

// Той самий список, що й у профілі спеціаліста ("з чим працюєш") — щоб
// теги на фільтрі й на картці спеціаліста читались однаково.
const CONCERN_LABELS = {
  anxiety: "Тривожність",
  stress: "Стрес",
  relationships: "Стосунки",
  sleep: "Сон",
  self_esteem: "Самооцінка",
  grief: "Втрата / горе",
  other: "Інше",
};

const GENDER_LABELS = {
  female: "Жінка",
  male: "Чоловік",
};

const SORT_OPTIONS = [
  { value: "", label: "Без сортування" },
  { value: "price_asc", label: "Донат: спочатку менший" },
  { value: "price_desc", label: "Донат: спочатку більший" },
];

const SpecialistsPage = () => {
  const { dbUser } = useCurrentUser();
  const isAdmin = dbUser?.role === "ADMIN";
  const isGuest = !dbUser;
  const [specialists, setSpecialists] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeApproaches, setActiveApproaches] = useState([]);
  const [activeConcerns, setActiveConcerns] = useState([]);
  const [genderFilter, setGenderFilter] = useState("");
  const [sortOrder, setSortOrder] = useState("");

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

  // Підходи в роботі (specializations) — вільний текст, який спеціаліст
  // вписує сам ("КПТ", "Гештальт"). З чим працює (concerns) — той самий
  // контрольований список, що й у профілі спеціаліста / раніше в анкеті.
  const allApproaches = useMemo(() => {
    const set = new Set();
    specialists.forEach((s) => (s.specializations || []).forEach((tag) => set.add(tag)));
    return Array.from(set).sort();
  }, [specialists]);

  const allConcerns = useMemo(() => {
    const set = new Set();
    specialists.forEach((s) => (s.concerns || []).forEach((tag) => set.add(tag)));
    return Array.from(set);
  }, [specialists]);

  const hasGenderData = useMemo(
    () => specialists.some((s) => s.gender),
    [specialists],
  );

  const toggleApproach = (tag) => {
    setActiveApproaches((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const toggleConcern = (tag) => {
    setActiveConcerns((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const filteredSpecialists = useMemo(() => {
    const query = search.trim().toLowerCase();
    const result = specialists.filter((s) => {
      if (activeApproaches.length > 0) {
        const tags = s.specializations || [];
        if (!activeApproaches.some((tag) => tags.includes(tag))) return false;
      }
      if (activeConcerns.length > 0) {
        const tags = s.concerns || [];
        if (!activeConcerns.some((tag) => tags.includes(tag))) return false;
      }
      if (genderFilter && s.gender !== genderFilter) return false;
      if (query) {
        const name = `${s.user?.firstName || ""} ${s.user?.lastName || ""}`.toLowerCase();
        const haystack = `${name} ${s.bio || ""} ${s.experience || ""}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });

    if (sortOrder === "price_asc" || sortOrder === "price_desc") {
      const withRate = result.filter((s) => s.hourlyRate != null);
      const withoutRate = result.filter((s) => s.hourlyRate == null);
      withRate.sort((a, b) =>
        sortOrder === "price_asc" ? a.hourlyRate - b.hourlyRate : b.hourlyRate - a.hourlyRate,
      );
      return [...withRate, ...withoutRate];
    }

    return result;
  }, [specialists, search, activeApproaches, activeConcerns, genderFilter, sortOrder]);

  return (
    <div className="max-w-4xl mx-auto text-left">
      <h2 className="text-2xl font-extrabold text-ink mb-2">Спеціалісти</h2>
      <p className="text-muted mb-6">
        {isAdmin
          ? "Перегляд підтверджених спеціалістів (без можливості бронювання)."
          : isGuest
            ? "Поглянь, хто тут працює. Щоб забронювати сесію, знадобиться зареєструватись."
            : "Обери спеціаліста, який тобі підходить, і забронюй зручний час."}
      </p>

      {isLoading && <p className="text-muted">Завантаження...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!isLoading && !error && specialists.length === 0 && (
        <p className="text-muted">Поки немає підтверджених спеціалістів.</p>
      )}

      {!isLoading && !error && specialists.length > 0 && (
        <div className="mb-6 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Пошук за іменем або описом..."
              className="w-full sm:max-w-sm bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-ink placeholder:text-muted focus:outline-none focus:border-primary"
            />
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-primary"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {hasGenderData && (
            <div>
              <p className="text-xs font-semibold text-muted mb-1.5">Стать спеціаліста</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setGenderFilter("")}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${
                    genderFilter === ""
                      ? "bg-primary text-white border-primary"
                      : "bg-surface text-muted border-border hover:border-primary hover:text-primary"
                  }`}
                >
                  Всі
                </button>
                {Object.entries(GENDER_LABELS).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setGenderFilter(value)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${
                      genderFilter === value
                        ? "bg-primary text-white border-primary"
                        : "bg-surface text-muted border-border hover:border-primary hover:text-primary"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {allConcerns.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted mb-1.5">З чим працює</p>
              <div className="flex flex-wrap gap-2">
                {allConcerns.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleConcern(tag)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${
                      activeConcerns.includes(tag)
                        ? "bg-primary text-white border-primary"
                        : "bg-surface text-muted border-border hover:border-primary hover:text-primary"
                    }`}
                  >
                    {CONCERN_LABELS[tag] || tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {allApproaches.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted mb-1.5">Підходи в роботі</p>
              <div className="flex flex-wrap gap-2">
                {allApproaches.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleApproach(tag)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${
                      activeApproaches.includes(tag)
                        ? "bg-primary text-white border-primary"
                        : "bg-surface text-muted border-border hover:border-primary hover:text-primary"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!isLoading && !error && specialists.length > 0 && filteredSpecialists.length === 0 && (
        <p className="text-muted">Нічого не знайдено за цим фільтром.</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {filteredSpecialists.map((s) => (
          <Link
            key={s.id}
            to={`/specialists/${s.id}`}
            className="block bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] p-5 hover:border-primary transition"
          >
            <div className="flex items-center gap-3">
              {s.photoUrl ? (
                <img
                  src={s.photoUrl}
                  alt=""
                  className="w-12 h-12 rounded-full object-cover border border-border shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-canvas border border-border flex items-center justify-center text-lg text-muted shrink-0">
                  👤
                </div>
              )}
              <div>
                <p className="font-bold text-ink">
                  {s.user?.firstName} {s.user?.lastName}
                </p>
                {s.gender && (
                  <p className="text-xs text-muted">{GENDER_LABELS[s.gender] || s.gender}</p>
                )}
              </div>
            </div>
            {s.bio && <p className="text-muted text-sm mt-3 line-clamp-3">{s.bio}</p>}
            {s.experience && (
              <p className="text-muted text-sm mt-1 line-clamp-2">{s.experience}</p>
            )}
            {s.concerns?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {s.concerns.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs bg-accent-soft text-accent px-2 py-1 rounded-lg"
                  >
                    {CONCERN_LABELS[tag] || tag}
                  </span>
                ))}
              </div>
            )}
            {s.specializations?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {s.specializations.map((spec) => (
                  <span
                    key={spec}
                    className="text-xs bg-primary-soft text-primary px-2 py-1 rounded-lg"
                  >
                    {spec}
                  </span>
                ))}
              </div>
            )}
            {s.hourlyRate != null && (
              <p className="text-sm text-muted mt-3">{s.hourlyRate} грн / сесія</p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default SpecialistsPage;
