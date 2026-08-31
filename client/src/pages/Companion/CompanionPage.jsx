import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { API_BASE_URL } from "../../api/config";
import { ensureKey, decryptEntry } from "../../utils/diaryCrypto";
import { CRISIS_RESOURCES } from "../../constants/crisisResources";

const MAX_MESSAGE_LENGTH = 800;
const MAX_HISTORY_SENT = 20;

const STARTER_PROMPTS = [
  "Мені сьогодні важко зосередитись",
  "Хочу розібратись, чому в мене такий настрій",
  "Просто хочу з кимось поговорити",
];

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const CompanionPage = () => {
  const { getToken } = useAuth();

  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [diaryOptIn, setDiaryOptIn] = useState(false);
  const [diaryContext, setDiaryContext] = useState(null);
  const [diaryLoading, setDiaryLoading] = useState(false);
  const [diaryError, setDiaryError] = useState("");

  const enableDiaryContext = async () => {
    setDiaryLoading(true);
    setDiaryError("");
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/diary/mine`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const entries = await res.json();

      if (entries.length === 0) {
        setDiaryContext("");
        setDiaryOptIn(true);
        return;
      }

      const { key } = await ensureKey(false);
      if (!key) throw new Error();

      const recent = entries.slice(-14);
      const lines = await Promise.all(
        recent.map(async (e) => {
          try {
            const data = await decryptEntry(key, e.cipherText);
            const mood = data.mood != null ? `настрій ${data.mood}/10` : null;
            const note = data.note
              ? `нотатка: ${data.note.slice(0, 200)}`
              : null;
            const parts = [mood, note].filter(Boolean).join(", ");
            return `${formatDate(e.date)}${parts ? `: ${parts}` : ""}`;
          } catch {
            return null;
          }
        }),
      );

      setDiaryContext(lines.filter(Boolean).join("\n"));
      setDiaryOptIn(true);
    } catch {
      setDiaryError("Не вдалось завантажити записи щоденника.");
    } finally {
      setDiaryLoading(false);
    }
  };

  const disableDiaryContext = () => {
    setDiaryOptIn(false);
    setDiaryContext(null);
    setDiaryError("");
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || isLoading) return;

    const nextMessages = [...messages, { role: "user", text }];
    setMessages(nextMessages);
    setDraft("");
    setIsLoading(true);
    setError("");

    try {
      const token = await getToken();
      const payloadMessages = nextMessages
        .slice(-MAX_HISTORY_SENT)
        .map(({ role, text: t }) => ({ role, text: t }));

      const res = await fetch(`${API_BASE_URL}/companion/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: payloadMessages,
          diaryContext: diaryOptIn ? diaryContext : null,
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: data.reply, crisisDetected: data.crisisDetected },
      ]);
    } catch {
      setError("Щось пішло не так. Спробуй ще раз.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const resetConversation = () => {
    setMessages([]);
    setError("");
  };

  return (
    <div className="max-w-2xl mx-auto text-left space-y-6">
      <div className="bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] p-6">
        <h2 className="text-2xl font-extrabold text-ink mb-2">
          AI-розмова
        </h2>
        <p className="text-sm text-muted">
          Простір поговорити прямо зараз. Це не заміна психотерапевта чи{" "}
          <Link to="/specialists" className="text-primary font-semibold hover:underline">
            спеціаліста
          </Link>
          , а швидка підтримка між сесіями. Розмова НЕ зберігається — після
          виходу зі сторінки вона зникає.
        </p>
      </div>

      <div className="bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] p-4">
        <div className="flex items-start gap-3">
          <input
            id="diary-opt-in"
            type="checkbox"
            checked={diaryOptIn}
            disabled={diaryLoading}
            onChange={(e) =>
              e.target.checked ? enableDiaryContext() : disableDiaryContext()
            }
            className="mt-1 w-4 h-4 accent-primary"
          />
          <label htmlFor="diary-opt-in" className="text-sm text-ink cursor-pointer">
            <span className="font-semibold">
              Дозволити AI бачити мої останні записи щоденника
            </span>{" "}
            {diaryLoading && <span className="text-muted">(завантаження…)</span>}
            <p className="text-xs text-muted mt-1">
              Записи розшифровуються ТІЛЬКИ в твоєму браузері й на час цієї
              розмови виходять за межі шифрування — надсилаються сервісу
              Google Gemini, щоб AI міг спиратись на контекст. Вони НЕ
              зберігаються на сервері. За замовчуванням вимкнено.
            </p>
          </label>
        </div>
        {diaryError && <p className="text-xs text-danger mt-2">{diaryError}</p>}
      </div>

      <div className="bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] p-4 space-y-4 min-h-[16rem]">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted">
              Почни писати, або обери одну з підказок:
            </p>
            <div className="flex flex-wrap gap-2">
              {STARTER_PROMPTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setDraft(p)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold bg-canvas border border-border text-ink hover:border-primary transition"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) =>
          m.role === "assistant" && m.crisisDetected ? (
            <div
              key={i}
              className="bg-danger/5 border-2 border-danger/30 rounded-2xl p-5 space-y-4"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">🤍</span>
                <p className="text-sm text-ink">{m.text}</p>
              </div>
              <div className="space-y-2">
                {CRISIS_RESOURCES.map((r) => (
                  <a
                    key={r.phone}
                    href={`tel:${r.tel}`}
                    className="flex items-center justify-between gap-3 bg-surface border border-border rounded-xl p-3 hover:border-danger transition group"
                  >
                    <div>
                      <p className="font-semibold text-ink text-sm">{r.name}</p>
                      <p className="text-xs text-muted">{r.note}</p>
                    </div>
                    <span className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold bg-danger/10 text-danger group-hover:bg-danger group-hover:text-white transition">
                      📞 {r.phone}
                    </span>
                  </a>
                ))}
              </div>
              <Link to="/crisis" className="text-sm font-semibold text-danger hover:underline">
                Відкрити повноцінний екран підтримки →
              </Link>
            </div>
          ) : (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                  m.role === "user"
                    ? "bg-primary text-white"
                    : "bg-canvas border border-border text-ink"
                }`}
              >
                {m.text}
              </div>
            </div>
          ),
        )}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-canvas border border-border rounded-2xl px-4 py-2.5 text-sm text-muted">
              Друкує…
            </div>
          </div>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}
      </div>

      <form onSubmit={handleSend} className="flex flex-col gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
          onKeyDown={handleKeyDown}
          rows={2}
          placeholder="Напиши, що на думці…"
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-ink focus:outline-none focus:border-primary resize-none"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted">
            {draft.length}/{MAX_MESSAGE_LENGTH}
          </span>
          <div className="flex gap-2">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={resetConversation}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-canvas border border-border text-ink hover:border-primary transition"
              >
                Почати заново
              </button>
            )}
            <button
              type="submit"
              disabled={!draft.trim() || isLoading}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary-dark transition disabled:opacity-50"
            >
              Надіслати
            </button>
          </div>
        </div>
      </form>

      <p className="text-xs text-muted text-center">
        Це не екстрена допомога. Якщо життю загрожує безпосередня небезпека —
        телефонуй 112 або{" "}
        <Link to="/crisis" className="text-primary font-semibold hover:underline">
          відкрий екран підтримки
        </Link>
        .
      </p>
    </div>
  );
};

export default CompanionPage;
