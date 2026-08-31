import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { API_BASE_URL } from "../../api/config";
import { CRISIS_RESOURCES } from "../../constants/crisisResources";

const STEPS = [
  { key: "fact", icon: "📌", label: "Факт" },
  { key: "interpretation", icon: "💭", label: "Інтерпретація" },
  { key: "prediction", icon: "🔮", label: "Прогноз" },
];

const ThoughtAnalysisPage = () => {
  const { getToken } = useAuth();
  const [situation, setSituation] = useState("");
  const [thought, setThought] = useState("");
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setResult(null);
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/thought-analysis`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ situation, thought }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Не вдалось виконати аналіз");
      }
      setResult(await response.json());
    } catch (err) {
      console.error("❌ Помилка аналізу думки:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto text-left space-y-6">
      <div className="bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] p-6">
        <h2 className="text-2xl font-extrabold text-ink mb-2">Аналіз думки</h2>
        <p className="text-sm text-muted mb-4">
          Опиши ситуацію і думку, яка тебе турбує, — розберемо її на факти,
          інтерпретації та альтернативні пояснення. Це не діагностика і не
          заміна консультації спеціаліста.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-semibold text-ink mb-2 block">
              Що сталося?
            </label>
            <textarea
              value={situation}
              onChange={(e) => setSituation(e.target.value)}
              rows={3}
              maxLength={1000}
              required
              className="w-full border border-border rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Наприклад: він не відповідає на повідомлення вже 5 годин"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-ink mb-2 block">
              Яка думка з'явилась?
            </label>
            <textarea
              value={thought}
              onChange={(e) => setThought(e.target.value)}
              rows={2}
              maxLength={500}
              required
              className="w-full border border-border rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Наприклад: я йому набридла, він мене кине"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="self-start px-5 py-2 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary-dark transition disabled:opacity-50"
          >
            {isLoading ? "Аналізую..." : "Розібрати"}
          </button>
        </form>
      </div>

      {result?.crisisDetected && (
        <div className="bg-danger/5 border-2 border-danger/30 rounded-2xl p-6 space-y-5">
          <div className="flex items-start gap-3">
            <span className="text-3xl">🤍</span>
            <div>
              <h3 className="text-lg font-extrabold text-ink">
                Схоже, тобі зараз дуже важко
              </h3>
              <p className="text-sm text-ink mt-1">{result.reflectionQuestion}</p>
            </div>
          </div>

          <div className="space-y-2">
            {CRISIS_RESOURCES.map((r) => (
              <a
                key={r.phone}
                href={`tel:${r.tel}`}
                className="flex items-center justify-between gap-3 bg-surface border border-border rounded-xl p-4 hover:border-danger hover:shadow-[0_8px_20px_rgba(226,87,76,0.12)] transition group"
              >
                <div>
                  <p className="font-semibold text-ink">{r.name}</p>
                  <p className="text-xs text-muted mt-0.5">{r.note}</p>
                </div>
                <span className="shrink-0 px-4 py-2 rounded-xl text-sm font-bold bg-danger/10 text-danger group-hover:bg-danger group-hover:text-white transition">
                  📞 {r.phone}
                </span>
              </a>
            ))}
          </div>

          <Link
            to="/crisis"
            className="text-sm font-semibold text-danger hover:underline"
          >
            Відкрити повноцінний екран підтримки →
          </Link>
        </div>
      )}

      {result && !result.crisisDetected && (
        <div className="bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] p-6">
          <h3 className="text-lg font-extrabold text-ink mb-5">
            Розбір ситуації
          </h3>

          <div className="relative pl-2">
            {STEPS.map((step, i) => (
              <div key={step.key} className="relative flex gap-4 pb-6 last:pb-0">
                {i < STEPS.length - 1 && (
                  <span className="absolute left-[19px] top-10 bottom-0 w-px bg-border" />
                )}
                <span className="shrink-0 w-10 h-10 rounded-full bg-primary-soft text-primary flex items-center justify-center text-lg">
                  {step.icon}
                </span>
                <div className="pt-1.5">
                  <p className="text-xs font-bold text-primary uppercase tracking-wide mb-1">
                    {step.label}
                  </p>
                  <p className="text-ink leading-relaxed">{result[step.key]}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-2 bg-accent-soft border border-accent/30 rounded-xl p-4">
            <p className="text-xs font-bold text-accent uppercase tracking-wide mb-2 flex items-center gap-1.5">
              💡 Альтернативні пояснення
            </p>
            <div className="flex flex-col gap-2">
              {(result.alternatives || []).map((alt, i) => (
                <div
                  key={i}
                  className="flex gap-2 items-start bg-surface/70 rounded-lg px-3 py-2"
                >
                  <span className="text-accent font-bold text-sm mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-ink text-sm">{alt}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 bg-primary-soft rounded-xl p-4 flex gap-3 items-start">
            <span className="text-xl">🌱</span>
            <div>
              <p className="text-xs font-bold text-primary uppercase tracking-wide mb-1">
                Для роздумів
              </p>
              <p className="text-ink italic leading-relaxed">
                {result.reflectionQuestion}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThoughtAnalysisPage;
