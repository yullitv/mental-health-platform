import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { API_BASE_URL } from "../../api/config";
import {
  ensureKey,
  encryptEntry,
  decryptEntry,
} from "../../utils/diaryCrypto";
import {
  SCREENING_TESTS,
  RESPONSE_OPTIONS,
  scoreTest,
} from "../../constants/screeningTests";

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

// 'select' -> 'questions' -> 'result'
const ScreeningPage = () => {
  const { getToken } = useAuth();

  const [encryptionKey, setEncryptionKey] = useState(null);
  const [history, setHistory] = useState([]);

  const [test, setTest] = useState(null);
  const [step, setStep] = useState("select");
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [saveError, setSaveError] = useState("");

  // Історія результатів шифрується тим самим локальним ключем, що й
  // щоденник (той самий "diary_encryption_key_v1" у localStorage) — так
  // застосунок має один ключ для всіх чутливих даних, які вводить людина.
  const loadHistory = useCallback(
    async (key) => {
      if (!key) return;
      try {
        const token = await getToken();
        const res = await fetch(`${API_BASE_URL}/screening/mine`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const raw = await res.json();
        const decrypted = await Promise.all(
          raw.map(async (r) => {
            try {
              const data = await decryptEntry(key, r.cipherText);
              return { id: r.id, testKey: r.testKey, date: r.date, ...data };
            } catch {
              return {
                id: r.id,
                testKey: r.testKey,
                date: r.date,
                decryptFailed: true,
              };
            }
          }),
        );
        setHistory(decrypted);
      } catch {
        // Історія — доповнення, а не критичний шлях; мовчки ігноруємо збій.
      }
    },
    [getToken],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // ensureKey(false) повертає вже наявний локальний ключ (наприклад,
      // з щоденника), або створює новий, якщо його ще немає в браузері.
      const { key } = await ensureKey(false);
      if (cancelled || !key) return;
      setEncryptionKey(key);
      await loadHistory(key);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadHistory]);

  const startTest = (t) => {
    setTest(t);
    setAnswers({});
    setResult(null);
    setSaveError("");
    setStep("questions");
  };

  const setAnswer = (index, value) => {
    setAnswers((prev) => ({ ...prev, [index]: value }));
  };

  const allAnswered = test ? test.items.every((_, i) => answers[i] != null) : false;

  const handleSubmit = async () => {
    if (!test || !allAnswered) return;
    const scored = scoreTest(test, answers);
    setResult(scored);
    setStep("result");
    setSaveError("");

    if (!encryptionKey) return;
    try {
      const cipherText = await encryptEntry(encryptionKey, {
        total: scored.total,
        maxScore: test.maxScore,
        bandLabel: scored.band.label,
        selfHarmFlag: scored.selfHarmFlag,
        answers,
      });
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/screening`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ testKey: test.key, cipherText }),
      });
      if (!res.ok) throw new Error("Не вдалось зберегти результат");
      await loadHistory(encryptionKey);
    } catch {
      setSaveError(
        "Результат показано, але не вдалось зберегти його в історію — спробуй пізніше.",
      );
    }
  };

  const reset = () => {
    setTest(null);
    setStep("select");
    setAnswers({});
    setResult(null);
    setSaveError("");
  };

  const historyByTest = useMemo(() => {
    const map = {};
    for (const t of SCREENING_TESTS) map[t.key] = [];
    for (const h of history) {
      if (h.decryptFailed || !map[h.testKey]) continue;
      map[h.testKey].push(h);
    }
    for (const key of Object.keys(map)) {
      map[key] = map[key].slice(-5).reverse();
    }
    return map;
  }, [history]);

  if (step === "select") {
    return (
      <div className="max-w-2xl mx-auto text-left space-y-6">
        <div className="bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] p-6">
          <h2 className="text-2xl font-extrabold text-ink mb-2">
            Скринінг-тести
          </h2>
          <p className="text-sm text-muted">
            Короткі стандартизовані опитувальники (PHQ-9, GAD-7), якими
            користуються фахівці для первинної оцінки стану. Це{" "}
            <strong>скринінг, а не діагностика</strong> — результат не
            встановлює діагноз і не замінює консультацію спеціаліста.
            Результати шифруються тим самим локальним ключем, що й
            щоденник — сервер їх не бачить.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {SCREENING_TESTS.map((t) => (
            <div
              key={t.key}
              className="bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] p-6 flex flex-col"
            >
              <h3 className="text-lg font-extrabold text-ink mb-1">
                {t.title}
              </h3>
              <p className="text-sm text-muted mb-4">{t.short}</p>
              <p className="text-xs text-muted mb-4">
                {t.items.length} запитань · 2-3 хвилини
              </p>

              {historyByTest[t.key]?.length > 0 && (
                <div className="mb-4 space-y-1.5">
                  <p className="text-xs font-bold text-muted uppercase tracking-wide">
                    Останні результати
                  </p>
                  {historyByTest[t.key].map((h) => (
                    <div
                      key={h.id}
                      className="flex items-center justify-between text-xs bg-canvas rounded-lg px-3 py-1.5"
                    >
                      <span className="text-muted">{formatDate(h.date)}</span>
                      <span className="font-semibold text-ink">
                        {h.total}/{h.maxScore} · {h.bandLabel}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => startTest(t)}
                className="self-start mt-auto px-5 py-2 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary-dark transition"
              >
                Почати
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (step === "questions" && test) {
    return (
      <div className="max-w-2xl mx-auto text-left space-y-6">
        <div className="bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] p-6">
          <h2 className="text-xl font-extrabold text-ink mb-2">
            {test.title}
          </h2>
          <p className="text-sm text-muted mb-4">{test.intro}</p>
          <p className="text-sm font-semibold text-ink">{test.timeframe}</p>
        </div>

        <div className="space-y-3">
          {test.items.map((item, i) => (
            <div
              key={i}
              className="bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] p-5"
            >
              <p className="text-sm font-semibold text-ink mb-3">
                {i + 1}. {item}
              </p>
              <div className="flex flex-wrap gap-2">
                {RESPONSE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAnswer(i, opt.value)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                      answers[i] === opt.value
                        ? "bg-primary text-white border-transparent"
                        : "bg-canvas border-border text-ink hover:border-primary"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={!allAnswered}
            onClick={handleSubmit}
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary-dark transition disabled:opacity-50"
          >
            Показати результат
          </button>
          {!allAnswered && (
            <p className="text-xs text-muted">
              Дай відповідь на всі запитання, щоб побачити результат.
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            className="ml-auto text-xs font-semibold text-muted hover:text-ink hover:underline"
          >
            Скасувати
          </button>
        </div>
      </div>
    );
  }

  if (step === "result" && test && result) {
    return (
      <div className="max-w-2xl mx-auto text-left space-y-6">
        {result.selfHarmFlag && (
          <div className="bg-danger/5 border-2 border-danger/30 rounded-2xl p-6">
            <div className="flex items-start gap-3">
              <span className="text-3xl">🤍</span>
              <div>
                <h3 className="text-lg font-extrabold text-ink">
                  Одна з відповідей звернула нашу увагу
                </h3>
                <p className="text-sm text-ink mt-1">
                  Ти зазначила/зазначив думки про те, що краще б тебе не
                  було, або про заподіяння собі шкоди. Це не має лишатись
                  наодинці з тобою — поруч є підтримка.
                </p>
              </div>
            </div>
            <Link
              to="/crisis"
              className="inline-block mt-4 px-5 py-2 rounded-xl text-sm font-semibold bg-danger text-white hover:bg-danger/90 transition"
            >
              Відкрити екран підтримки →
            </Link>
          </div>
        )}

        <div className="bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] p-6">
          <h2 className="text-xl font-extrabold text-ink mb-1">
            {test.title}: результат
          </h2>
          <p className="text-sm text-muted mb-4">
            {test.items.length} запитань · {result.total} з {test.maxScore}{" "}
            балів
          </p>

          <div className="bg-primary-soft rounded-xl p-4 mb-4">
            <p className="text-xs font-bold text-primary uppercase tracking-wide mb-1">
              {result.band.label}
            </p>
            <p className="text-sm text-ink">{result.band.description}</p>
          </div>

          {saveError && <p className="text-xs text-muted mb-2">{saveError}</p>}

          <p className="text-xs text-muted">
            Це скринінговий опитувальник, а не діагностичний інструмент. Він
            не замінює консультацію лікаря чи психотерапевта і не є
            підставою для самостійного встановлення діагнозу — лише привід
            звернути увагу на своє самопочуття.
          </p>
        </div>

        <div className="bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] p-6">
          <h3 className="text-base font-extrabold text-ink mb-3">
            Що можна зробити далі
          </h3>
          <div className="flex flex-col gap-2">
            <Link
              to="/specialists"
              className="text-sm font-semibold text-primary hover:underline"
            >
              Переглянути спеціалістів →
            </Link>
            <Link
              to="/diary"
              className="text-sm font-semibold text-primary hover:underline"
            >
              Вести щоденник настрою →
            </Link>
            <Link
              to="/thought-analysis"
              className="text-sm font-semibold text-primary hover:underline"
            >
              Розібрати тривожну думку →
            </Link>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => startTest(test)}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-canvas border border-border text-ink hover:border-primary transition"
          >
            Пройти ще раз
          </button>
          <button
            type="button"
            onClick={reset}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-canvas border border-border text-ink hover:border-primary transition"
          >
            Обрати інший тест
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default ScreeningPage;
