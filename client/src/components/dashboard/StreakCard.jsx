import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { API_BASE_URL } from "../../api/config";
import { computeStreakStats, streakMessage } from "../../utils/streak";

// Гейміфікація без тиску: жодних "розбитих" стріків червоним, жодного
// порівняння з іншими. Пропущений день просто нейтрального кольору в
// стрічці нижче — не хрестик, не попередження. Найдовша серія лишається
// видимою як досягнення, навіть коли поточна перервалась.
const StreakCard = () => {
  const { getToken } = useAuth();
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const [diaryRes, screeningRes] = await Promise.all([
          fetch(`${API_BASE_URL}/diary/mine`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE_URL}/screening/mine`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        const diary = diaryRes.ok ? await diaryRes.json() : [];
        const screening = screeningRes.ok ? await screeningRes.json() : [];
        const dates = [...diary, ...screening].map((e) => e.date);
        if (!cancelled) setStats(computeStreakStats(dates));
      } catch {
        // Віджет — доповнення до кабінету, не критичний шлях; тихо
        // ігноруємо збій замість показу помилки.
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getToken]);

  if (isLoading || !stats) return null;

  return (
    <div className="bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] p-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-extrabold text-ink mb-1">
            Моя послідовність
          </h2>
          <p className="text-sm text-muted">{streakMessage(stats)}</p>
        </div>

        <div className="flex gap-6 text-center">
          <div>
            <p className="text-2xl font-extrabold text-primary">
              {stats.currentStreak}
            </p>
            <p className="text-xs text-muted">поточна серія</p>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-ink">
              {stats.longestStreak}
            </p>
            <p className="text-xs text-muted">найдовша серія</p>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-ink">
              {stats.activeDaysCount}
            </p>
            <p className="text-xs text-muted">днів активності</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-5">
        {stats.last7.map((day) => (
          <span
            key={day.key}
            title={day.key}
            className={`w-6 h-6 rounded-full ${
              day.active
                ? "bg-primary"
                : "bg-canvas border border-border"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default StreakCard;
