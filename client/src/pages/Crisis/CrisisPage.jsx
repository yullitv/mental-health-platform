import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { API_BASE_URL } from "../../api/config";
import { CRISIS_RESOURCES } from "../../constants/crisisResources";

const GROUNDING_STEPS = [
  { sense: "5", text: "речей, які ти бачиш навколо" },
  { sense: "4", text: "речей, яких можеш торкнутися" },
  { sense: "3", text: "звуків, які чуєш" },
  { sense: "2", text: "запахів, які відчуваєш" },
  { sense: "1", text: "смак, який відчуваєш зараз" },
];

// Окремий, завжди доступний екран підтримки — не прив'язаний до жодної
// конкретної фічі. Відкривається з плаваючої кнопки "Потрібна допомога"
// на будь-якій сторінці, а також з кризової картки в "Аналізі думки".
const CrisisPage = () => {
  const { getToken } = useAuth();
  const [activeSession, setActiveSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${API_BASE_URL}/sessions/mine`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const sessions = await res.json();
        const confirmed = sessions.find((s) => s.status === "CONFIRMED");
        if (!cancelled) setActiveSession(confirmed ?? null);
      } catch {
        // Мовчки ігноруємо — недоступність сесій не має блокувати сторінку допомоги.
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getToken]);

  return (
    <div className="max-w-2xl mx-auto text-left space-y-6">
      <div className="bg-danger/5 border-2 border-danger/30 rounded-2xl p-6">
        <div className="flex items-start gap-3">
          <span className="text-3xl">🤍</span>
          <div>
            <h2 className="text-xl font-extrabold text-ink">
              Тобі зараз важко — і це нормально, що ти тут
            </h2>
            <p className="text-sm text-ink mt-1">
              Нижче — конкретні кроки, які можуть допомогти прямо зараз. Не
              обов'язково проходити все по порядку — почни з того, що
              відгукується найбільше.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] p-6">
        <h3 className="text-lg font-extrabold text-ink mb-2">
          🌬️ Спробуй заземлитись прямо зараз
        </h3>
        <p className="text-sm text-muted mb-4">
          Техніка "5-4-3-2-1" допомагає повернути увагу в тіло і в теперішній
          момент, коли думки закручуються.
        </p>
        <div className="space-y-2">
          {GROUNDING_STEPS.map((s) => (
            <div
              key={s.sense}
              className="flex gap-3 items-center bg-canvas rounded-xl p-3"
            >
              <span className="w-8 h-8 rounded-full bg-primary-soft text-primary font-bold flex items-center justify-center shrink-0">
                {s.sense}
              </span>
              <p className="text-sm text-ink">Назви подумки {s.text}.</p>
            </div>
          ))}
        </div>
      </div>

      {!isLoading && activeSession && (
        <div className="bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] p-6">
          <h3 className="text-lg font-extrabold text-ink mb-2">
            💬 Напиши своєму спеціалісту
          </h3>
          <p className="text-sm text-muted mb-4">
            У тебе є активна сесія з{" "}
            {activeSession.specialist?.user?.firstName}{" "}
            {activeSession.specialist?.user?.lastName}. Можеш написати прямо
            зараз.
          </p>
          <Link
            to={`/sessions/${activeSession.id}/chat`}
            className="inline-block px-5 py-2 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary-dark transition"
          >
            Відкрити чат →
          </Link>
        </div>
      )}

      <div className="bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] p-6">
        <h3 className="text-lg font-extrabold text-ink mb-4">
          📞 Гарячі лінії
        </h3>
        <div className="space-y-2">
          {CRISIS_RESOURCES.map((r) => (
            <a
              key={r.phone}
              href={`tel:${r.tel}`}
              className="flex items-center justify-between gap-3 bg-canvas border border-border rounded-xl p-4 hover:border-danger hover:shadow-[0_8px_20px_rgba(226,87,76,0.12)] transition group"
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
      </div>

      <p className="text-xs text-muted text-center">
        Якщо життю загрожує безпосередня небезпека просто зараз — телефонуй
        112, не чекаючи.
      </p>
    </div>
  );
};

export default CrisisPage;
