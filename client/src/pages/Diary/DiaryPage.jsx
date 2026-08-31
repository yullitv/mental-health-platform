import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { API_BASE_URL } from "../../api/config";
import {
  clearStoredKey,
  decryptEntry,
  encryptEntry,
  ensureKey,
  generateKey,
  storeKey,
  tryDecrypt,
} from "../../utils/diaryCrypto";

const SCALE = [1, 2, 3, 4, 5];

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
  });

const dateKeyOffset = (daysAgo) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
};

const entryKey = (iso) => new Date(iso).toISOString().slice(0, 10);

const DAY_OPTIONS = [
  { offset: 0, label: "Сьогодні" },
  { offset: 1, label: "Вчора" },
  { offset: 2, label: "Позавчора" },
];

function pearsonCorrelation(x, y) {
  const n = x.length;
  if (n < 2) return null;
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let denX = 0;
  let denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  if (denX === 0 || denY === 0) return null;
  return num / Math.sqrt(denX * denY);
}

const ScalePicker = ({ label, value, onChange, color }) => (
  <div>
    <p className="text-sm font-semibold text-ink mb-2">{label}</p>
    <div className="flex gap-2">
      {SCALE.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`w-10 h-10 rounded-xl text-sm font-bold border transition ${
            value === n
              ? `${color} text-white border-transparent`
              : "bg-canvas border-border text-ink hover:border-primary"
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  </div>
);

const DiaryChart = ({ entries }) => {
  const width = 600;
  const height = 160;
  const padding = 20;

  if (entries.length < 2) return null;

  const step = (width - padding * 2) / (entries.length - 1);
  const toY = (value) =>
    height - padding - ((value - 1) / 4) * (height - padding * 2);

  const moodPoints = entries
    .map((e, i) => `${padding + i * step},${toY(e.mood)}`)
    .join(" ");
  const physPoints = entries
    .map((e, i) => `${padding + i * step},${toY(e.physicalState)}`)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40">
      <polyline points={moodPoints} fill="none" stroke="#6C5DD3" strokeWidth="2.5" />
      <polyline points={physPoints} fill="none" stroke="#E2A24C" strokeWidth="2.5" />
      {entries.map((e, i) => (
        <g key={e.id}>
          <circle cx={padding + i * step} cy={toY(e.mood)} r="3" fill="#6C5DD3" />
          <circle cx={padding + i * step} cy={toY(e.physicalState)} r="3" fill="#E2A24C" />
        </g>
      ))}
    </svg>
  );
};

// Екран, що з'являється, коли в браузері немає ключа, а в БД вже є
// зашифровані записи (наприклад, новий пристрій) — потрібно ввести
// існуючий ключ або свідомо почати щоденник заново.
const KeyGate = ({ onImport, onReset, error, isChecking }) => {
  const [value, setValue] = useState("");

  return (
    <div className="max-w-lg mx-auto text-left bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] p-6 space-y-4">
      <h2 className="text-xl font-extrabold text-ink">
        Потрібен ключ шифрування
      </h2>
      <p className="text-sm text-muted">
        У цьому браузері немає ключа для щоденника, а в базі вже є зашифровані
        записи. Введи ключ, який ти зберігала раніше (з іншого пристрою), щоб
        розшифрувати їх тут.
      </p>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={2}
        placeholder="Встав ключ шифрування сюди"
        className="w-full border border-border rounded-xl px-4 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary"
      />
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={isChecking || !value.trim()}
          onClick={() => onImport(value.trim())}
          className="px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary-dark transition disabled:opacity-50"
        >
          Використати цей ключ
        </button>
        <button
          type="button"
          onClick={onReset}
          className="px-4 py-2 rounded-xl text-sm font-semibold bg-canvas border border-border text-ink hover:border-primary transition"
        >
          У мене немає ключа — почати заново
        </button>
      </div>
      <p className="text-xs text-muted">
        "Почати заново" створить новий ключ. Старі записи залишаться в базі,
        але без правильного ключа їх більше не можна буде прочитати.
      </p>
    </div>
  );
};

const KeyBackupBanner = ({ encryptionKey, onDismiss }) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(encryptionKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="bg-amber-50 border border-amber-300 rounded-2xl p-5 space-y-3">
      <h3 className="text-base font-extrabold text-ink">
        🔑 Збережи свій ключ шифрування
      </h3>
      <p className="text-sm text-ink">
        Записи щоденника шифруються прямо в браузері — навіть ми не можемо їх
        прочитати. Але це означає, що без цього ключа записи не відкриються на
        іншому пристрої чи в іншому браузері. Збережи його в надійному місці
        (наприклад, менеджер паролів).
      </p>
      <div className="bg-white border border-border rounded-xl p-3 font-mono text-xs break-all">
        {encryptionKey}
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={copy}
          className="px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary-dark transition"
        >
          {copied ? "Скопійовано ✓" : "Скопіювати ключ"}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="px-4 py-2 rounded-xl text-sm font-semibold bg-canvas border border-border text-ink hover:border-primary transition"
        >
          Я зберегла, приховати
        </button>
      </div>
    </div>
  );
};

const DiaryPage = () => {
  const { getToken } = useAuth();

  // 'loading' | 'need-key' | 'ready'
  const [keyStatus, setKeyStatus] = useState("loading");
  const [encryptionKey, setEncryptionKey] = useState(null);
  const [showBackupBanner, setShowBackupBanner] = useState(false);
  const [keyGateError, setKeyGateError] = useState("");

  const [rawEntries, setRawEntries] = useState([]);
  const [entries, setEntries] = useState([]);
  const [selectedDate, setSelectedDate] = useState(dateKeyOffset(0));
  const [mood, setMood] = useState(3);
  const [physicalState, setPhysicalState] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [anxiety, setAnxiety] = useState(3);
  const [stress, setStress] = useState(3);
  const [sleepHours, setSleepHours] = useState("");
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");

  const loadRawEntries = useCallback(async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/diary/mine`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Не вдалось завантажити щоденник");
      const data = await response.json();
      setRawEntries(data);
      return data;
    } catch (err) {
      console.error("❌ Помилка щоденника:", err);
      setError("Не вдалось завантажити щоденник.");
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  // Початкове завантаження: спершу тягнемо зашифровані записи, тоді
  // вирішуємо, чи є в браузері ключ, чи потрібно його запитати.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await loadRawEntries();
      if (cancelled) return;
      const { key, isNew } = await ensureKey(data.length > 0);
      if (cancelled) return;
      if (key) {
        setEncryptionKey(key);
        setKeyStatus("ready");
        if (isNew) setShowBackupBanner(true);
      } else {
        setKeyStatus("need-key");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Розшифровка записів кожного разу, коли з'являється ключ або приходять нові дані.
  useEffect(() => {
    if (keyStatus !== "ready" || !encryptionKey) return;
    let cancelled = false;
    (async () => {
      const decrypted = await Promise.all(
        rawEntries.map(async (raw) => {
          try {
            const data = await decryptEntry(encryptionKey, raw.cipherText);
            return { id: raw.id, date: raw.date, ...data };
          } catch {
            return {
              id: raw.id,
              date: raw.date,
              decryptFailed: true,
              mood: null,
              physicalState: null,
              sleepHours: null,
              note: null,
            };
          }
        }),
      );
      if (!cancelled) setEntries(decrypted);
    })();
    return () => {
      cancelled = true;
    };
  }, [rawEntries, encryptionKey, keyStatus]);

  useEffect(() => {
    const existing = entries.find(
      (e) => entryKey(e.date) === selectedDate && !e.decryptFailed,
    );
    if (existing) {
      setMood(existing.mood);
      setPhysicalState(existing.physicalState);
      setEnergy(existing.energy ?? 3);
      setAnxiety(existing.anxiety ?? 3);
      setStress(existing.stress ?? 3);
      setSleepHours(existing.sleepHours ?? "");
      setNote(existing.note ?? "");
    } else {
      setMood(3);
      setPhysicalState(3);
      setEnergy(3);
      setAnxiety(3);
      setStress(3);
      setSleepHours("");
      setNote("");
    }
    setSavedMessage("");
  }, [selectedDate, entries]);

  const handleImportKey = async (candidate) => {
    setKeyGateError("");
    if (rawEntries.length > 0) {
      const sample = rawEntries[0];
      const ok = await tryDecrypt(candidate, sample.cipherText);
      if (!ok) {
        setKeyGateError("Цей ключ не підходить до наявних записів.");
        return;
      }
    }
    storeKey(candidate);
    setEncryptionKey(candidate);
    setKeyStatus("ready");
  };

  const handleResetKey = async () => {
    const confirmed = window.confirm(
      "Старі записи залишаться в базі, але без правильного ключа їх більше не можна буде прочитати. Створити новий ключ і почати заново?",
    );
    if (!confirmed) return;
    clearStoredKey();
    const fresh = await generateKey();
    storeKey(fresh);
    setEncryptionKey(fresh);
    setKeyStatus("ready");
    setShowBackupBanner(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!encryptionKey) return;
    setIsSaving(true);
    setError("");
    setSavedMessage("");
    try {
      const cipherText = await encryptEntry(encryptionKey, {
        mood,
        physicalState,
        energy,
        anxiety,
        stress,
        sleepHours: sleepHours === "" ? null : Number(sleepHours),
        note: note.trim() || null,
      });

      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/diary`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ date: selectedDate, cipherText }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Не вдалось зберегти запис");
      }
      setSavedMessage("Запис збережено.");
      await loadRawEntries();
    } catch (err) {
      console.error("❌ Помилка збереження:", err);
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const validEntries = useMemo(
    () => entries.filter((e) => !e.decryptFailed),
    [entries],
  );

  const correlation = useMemo(() => {
    if (validEntries.length < 3) return null;
    return pearsonCorrelation(
      validEntries.map((e) => e.mood),
      validEntries.map((e) => e.physicalState),
    );
  }, [validEntries]);

  const recentEntries = [...entries].reverse();

  if (keyStatus === "loading") {
    return <p className="text-muted text-center mt-8">Завантаження...</p>;
  }

  if (keyStatus === "need-key") {
    return (
      <KeyGate
        onImport={handleImportKey}
        onReset={handleResetKey}
        error={keyGateError}
        isChecking={false}
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto text-left space-y-6">
      {showBackupBanner && (
        <KeyBackupBanner
          encryptionKey={encryptionKey}
          onDismiss={() => setShowBackupBanner(false)}
        />
      )}

      <div className="bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-extrabold text-ink">Щоденник настрою</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">🔒 зашифровано локально</span>
            {!showBackupBanner && (
              <button
                type="button"
                onClick={() => setShowBackupBanner(true)}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Показати ключ
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          {DAY_OPTIONS.map((opt) => {
            const key = dateKeyOffset(opt.offset);
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedDate(key)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                  selectedDate === key
                    ? "bg-primary text-white"
                    : "bg-canvas border border-border text-ink hover:border-primary"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <ScalePicker
              label="Настрій"
              value={mood}
              onChange={setMood}
              color="bg-primary"
            />
            <ScalePicker
              label="Фізичний стан"
              value={physicalState}
              onChange={setPhysicalState}
              color="bg-amber-500"
            />
            <ScalePicker
              label="Енергія"
              value={energy}
              onChange={setEnergy}
              color="bg-emerald-500"
            />
            <ScalePicker
              label="Тривожність"
              value={anxiety}
              onChange={setAnxiety}
              color="bg-rose-500"
            />
            <ScalePicker
              label="Стрес"
              value={stress}
              onChange={setStress}
              color="bg-orange-500"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-ink mb-2 block">
              Години сну (необов'язково)
            </label>
            <input
              type="number"
              min="0"
              max="24"
              step="0.5"
              value={sleepHours}
              onChange={(e) => setSleepHours(e.target.value)}
              className="w-32 border border-border rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-ink mb-2 block">
              Нотатка (необов'язково)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full border border-border rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Що вплинуло на день?"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}
          {savedMessage && (
            <p className="text-green-600 text-sm">{savedMessage}</p>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="self-start px-5 py-2 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary-dark transition disabled:opacity-50"
          >
            Зберегти запис
          </button>
        </form>
      </div>

      <div className="bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] p-6">
        <h3 className="text-xl font-extrabold text-ink mb-2">Динаміка</h3>

        {isLoading && <p className="text-muted">Завантаження...</p>}
        {!isLoading && validEntries.length < 2 && (
          <p className="text-muted">
            Додай ще кілька записів, щоб побачити графік динаміки.
          </p>
        )}
        {!isLoading && validEntries.length >= 2 && (
          <>
            <DiaryChart entries={validEntries} />
            <div className="flex gap-4 text-sm mt-2">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-primary inline-block" />
                Настрій
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
                Фізичний стан
              </span>
            </div>
          </>
        )}

        {correlation !== null && (
          <p className="text-sm text-muted mt-3">
            Кореляція настрою і фізичного стану: {correlation.toFixed(2)}
          </p>
        )}
      </div>

      <div className="bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] p-6">
        <h3 className="text-xl font-extrabold text-ink mb-4">Історія записів</h3>
        {!isLoading && entries.length === 0 && (
          <p className="text-muted">Записів поки немає.</p>
        )}
        <div className="flex flex-col gap-2">
          {recentEntries.map((entry) => (
            <div
              key={entry.id}
              className="bg-canvas border border-border rounded-xl p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
            >
              {entry.decryptFailed ? (
                <p className="text-sm text-muted">
                  {formatDate(entry.date)} — 🔒 не вдалося розшифрувати (інший ключ)
                </p>
              ) : (
                <>
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      {formatDate(entry.date)}
                    </p>
                    {entry.note && (
                      <p className="text-sm text-muted mt-1">{entry.note}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm">
                    <span>Настрій: {entry.mood}/5</span>
                    <span>Стан: {entry.physicalState}/5</span>
                    {entry.energy != null && <span>Енергія: {entry.energy}/5</span>}
                    {entry.anxiety != null && (
                      <span>Тривожність: {entry.anxiety}/5</span>
                    )}
                    {entry.stress != null && <span>Стрес: {entry.stress}/5</span>}
                    {entry.sleepHours != null && (
                      <span>Сон: {entry.sleepHours} год</span>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DiaryPage;
