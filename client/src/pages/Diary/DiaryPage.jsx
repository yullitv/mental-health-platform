import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { API_BASE_URL } from "../../api/config";

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

const DiaryPage = () => {
  const { getToken } = useAuth();
  const [entries, setEntries] = useState([]);
  const [selectedDate, setSelectedDate] = useState(dateKeyOffset(0));
  const [mood, setMood] = useState(3);
  const [physicalState, setPhysicalState] = useState(3);
  const [sleepHours, setSleepHours] = useState("");
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");

  const loadEntries = useCallback(async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/diary/mine`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Не вдалось завантажити щоденник");
      setEntries(await response.json());
    } catch (err) {
      console.error("❌ Помилка щоденника:", err);
      setError("Не вдалось завантажити щоденник.");
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  useEffect(() => {
    const existing = entries.find((e) => entryKey(e.date) === selectedDate);
    if (existing) {
      setMood(existing.mood);
      setPhysicalState(existing.physicalState);
      setSleepHours(existing.sleepHours ?? "");
      setNote(existing.note ?? "");
    } else {
      setMood(3);
      setPhysicalState(3);
      setSleepHours("");
      setNote("");
    }
    setSavedMessage("");
  }, [selectedDate, entries]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError("");
    setSavedMessage("");
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/diary`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          date: selectedDate,
          mood,
          physicalState,
          sleepHours: sleepHours === "" ? undefined : Number(sleepHours),
          note: note.trim() || undefined,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Не вдалось зберегти запис");
      }
      setSavedMessage("Запис збережено.");
      await loadEntries();
    } catch (err) {
      console.error("❌ Помилка збереження:", err);
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const correlation = useMemo(() => {
    if (entries.length < 3) return null;
    return pearsonCorrelation(
      entries.map((e) => e.mood),
      entries.map((e) => e.physicalState),
    );
  }, [entries]);

  const recentEntries = [...entries].reverse();

  return (
    <div className="max-w-3xl mx-auto text-left space-y-6">
      <div className="bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] p-6">
        <h2 className="text-2xl font-extrabold text-ink mb-4">
          Щоденник настрою
        </h2>

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
        {!isLoading && entries.length < 2 && (
          <p className="text-muted">
            Додай ще кілька записів, щоб побачити графік динаміки.
          </p>
        )}
        {!isLoading && entries.length >= 2 && (
          <>
            <DiaryChart entries={entries} />
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
              <div>
                <p className="text-sm font-semibold text-ink">
                  {formatDate(entry.date)}
                </p>
                {entry.note && (
                  <p className="text-sm text-muted mt-1">{entry.note}</p>
                )}
              </div>
              <div className="flex gap-3 text-sm">
                <span>Настрій: {entry.mood}/5</span>
                <span>Стан: {entry.physicalState}/5</span>
                {entry.sleepHours != null && (
                  <span>Сон: {entry.sleepHours} год</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DiaryPage;