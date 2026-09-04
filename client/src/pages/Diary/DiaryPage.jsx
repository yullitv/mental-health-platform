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

function average(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const METRIC_LABELS = {
  mood: "настрій",
  physicalState: "фізичний стан",
  energy: "енергія",
  anxiety: "тривожність",
  stress: "стрес",
};

const METRICS = Object.keys(METRIC_LABELS);

const METRIC_PAIRS = [
  ["mood", "physicalState"],
  ["anxiety", "stress"],
  ["mood", "energy"],
  ["mood", "anxiety"],
  ["physicalState", "energy"],
  ["stress", "physicalState"],
  ["mood", "stress"],
];

// Генерує текстові інсайти на основі кореляцій, порівнянь сну і трендів.
// Усе рахується виключно на РОЗШИФРОВАНИХ записах у браузері — сервер
// цих даних ніколи не бачить.
function generateInsights(entries) {
  const insights = [];

  // 1. Парні кореляції між метриками
  for (const [a, b] of METRIC_PAIRS) {
    const pairs = entries.filter((e) => e[a] != null && e[b] != null);
    if (pairs.length < 5) continue;
    const r = pearsonCorrelation(
      pairs.map((e) => e[a]),
      pairs.map((e) => e[b]),
    );
    if (r === null || Math.abs(r) < 0.4) continue;
    const direction =
      r > 0
        ? "часто змінюються разом"
        : "часто змінюються у протилежних напрямках";
    insights.push({
      key: `pair-${a}-${b}`,
      strength: Math.abs(r),
      icon: r > 0 ? "🔗" : "↔️",
      text: `${cap(METRIC_LABELS[a])} і ${METRIC_LABELS[b]} ${direction}.`,
    });
  }

  // 2. Сон vs інші метрики
  const withSleep = entries.filter((e) => e.sleepHours != null);
  const goodSleep = withSleep.filter((e) => e.sleepHours >= 7);
  const poorSleep = withSleep.filter((e) => e.sleepHours < 7);
  if (goodSleep.length >= 2 && poorSleep.length >= 2) {
    for (const m of METRICS) {
      const gVals = goodSleep.filter((e) => e[m] != null).map((e) => e[m]);
      const pVals = poorSleep.filter((e) => e[m] != null).map((e) => e[m]);
      if (gVals.length < 2 || pVals.length < 2) continue;
      const avgGood = average(gVals);
      const avgPoor = average(pVals);
      const diff = avgGood - avgPoor;
      if (Math.abs(diff) < 0.6) continue;
      const cmp = diff > 0 ? "вищий" : "нижчий";
      insights.push({
        key: `sleep-${m}`,
        strength: Math.min(Math.abs(diff) / 3, 1),
        icon: "😴",
        text: `У дні з ≥7 год сну ${METRIC_LABELS[m]} у середньому ${cmp} (${avgGood.toFixed(1)}/5) порівняно з днями з меншим сном (${avgPoor.toFixed(1)}/5).`,
      });
    }
  }

  // 3. Тренд за останні записи
  for (const m of METRICS) {
    const withMetric = entries.filter((e) => e[m] != null);
    const n = Math.min(14, withMetric.length);
    if (n < 6) continue;
    const recent = withMetric.slice(-n);
    const half = Math.floor(n / 2);
    const avg1 = average(recent.slice(0, half).map((e) => e[m]));
    const avg2 = average(recent.slice(-half).map((e) => e[m]));
    const diff = avg2 - avg1;
    if (Math.abs(diff) < 0.6) continue;
    const direction = diff > 0 ? "зростає" : "знижується";
    insights.push({
      key: `trend-${m}`,
      strength: Math.min(Math.abs(diff) / 3, 1),
      icon: diff > 0 ? "📈" : "📉",
      text: `За останні ${n} записів ${METRIC_LABELS[m]} поступово ${direction} (з ${avg1.toFixed(1)} до ${avg2.toFixed(1)}).`,
    });
  }

  // 4. Позначки "що вплинуло" — чи повторюється патерн при певному факторі
  const withFactors = entries.filter(
    (e) => Array.isArray(e.factors) && e.factors.length > 0,
  );
  if (withFactors.length > 0) {
    const factorCounts = {};
    for (const e of withFactors) {
      for (const f of e.factors) {
        factorCounts[f] = (factorCounts[f] || 0) + 1;
      }
    }
    for (const factorKeyName of Object.keys(factorCounts)) {
      if (factorCounts[factorKeyName] < 3) continue;
      const label = FACTOR_LABELS[factorKeyName] ?? factorKeyName;
      const withFactor = entries.filter(
        (e) => Array.isArray(e.factors) && e.factors.includes(factorKeyName),
      );
      for (const m of METRICS) {
        const vals = withFactor.filter((e) => e[m] != null).map((e) => e[m]);
        if (vals.length < 3) continue;
        const highCount = vals.filter((v) => v >= 4).length;
        const lowCount = vals.filter((v) => v <= 2).length;
        if (highCount / vals.length >= 0.6) {
          insights.push({
            key: `factor-${factorKeyName}-${m}-high`,
            strength: highCount / vals.length,
            icon: "🧩",
            text: `У ${highCount} з ${vals.length} днів із позначкою «${label}» ${METRIC_LABELS[m]} був 4/5 або вище.`,
          });
        } else if (lowCount / vals.length >= 0.6) {
          insights.push({
            key: `factor-${factorKeyName}-${m}-low`,
            strength: lowCount / vals.length,
            icon: "🧩",
            text: `У ${lowCount} з ${vals.length} днів із позначкою «${label}» ${METRIC_LABELS[m]} був 2/5 або нижче.`,
          });
        }
      }
    }
  }

  return insights.sort((a, b) => b.strength - a.strength).slice(0, 6);
}

const TREND_METRICS = [
  { key: "mood", label: "Настрій", icon: "😐" },
  { key: "energy", label: "Енергія", icon: "⚡" },
  { key: "anxiety", label: "Тривожність", icon: "😰" },
];

function percentChange(current, previous) {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

// Підсумок для картки "Моє самопочуття": сьогоднішні значення + зміна
// порівняно з попереднім 7-денним вікном. Усе на РОЗШИФРОВАНИХ записах.
function buildTodaySummary(entries) {
  const today =
    entries.find((e) => entryKey(e.date) === dateKeyOffset(0)) ?? null;

  const recent = entries.slice(-7);
  const previous = entries.slice(-14, -7);

  const trends = TREND_METRICS.map(({ key, label, icon }) => {
    const recentVals = recent.filter((e) => e[key] != null).map((e) => e[key]);
    const prevVals = previous.filter((e) => e[key] != null).map((e) => e[key]);
    if (recentVals.length < 2 || prevVals.length < 2) {
      return { key, label, icon, pct: null };
    }
    return {
      key,
      label,
      icon,
      pct: percentChange(average(recentVals), average(prevVals)),
    };
  });

  const topInsight = generateInsights(entries)[0] ?? null;

  return { today, trends, topInsight };
}

// Підсумок картки "Мій тиждень": найкращий/найважчий день і середні
// значення за останні до 7 записів.
function buildWeekSummary(entries) {
  const recent = entries.slice(-7);
  const withMood = recent.filter((e) => e.mood != null);
  if (withMood.length === 0) return null;

  let best = withMood[0];
  let worst = withMood[0];
  for (const e of withMood) {
    if (
      e.mood > best.mood ||
      (e.mood === best.mood && (e.anxiety ?? 3) < (best.anxiety ?? 3))
    ) {
      best = e;
    }
    if (
      e.mood < worst.mood ||
      (e.mood === worst.mood && (e.anxiety ?? 3) > (worst.anxiety ?? 3))
    ) {
      worst = e;
    }
  }

  const anxietyVals = recent.filter((e) => e.anxiety != null).map((e) => e.anxiety);
  const sleepVals = recent.filter((e) => e.sleepHours != null).map((e) => e.sleepHours);

  return {
    best,
    worst,
    count: recent.length,
    avgMood: average(withMood.map((e) => e.mood)),
    avgAnxiety: anxietyVals.length > 0 ? average(anxietyVals) : null,
    avgSleep: sleepVals.length > 0 ? average(sleepVals) : null,
  };
}

const PERIOD_OPTIONS = [
  { key: "7", label: "7 днів" },
  { key: "30", label: "30 днів" },
  { key: "90", label: "3 місяці" },
  { key: "all", label: "Увесь період" },
];

function filterByPeriod(entries, period) {
  if (period === "all") return entries;
  const days = { "7": 7, "30": 30, "90": 90 }[period];
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - (days - 1));
  return entries.filter((e) => new Date(e.date) >= cutoff);
}

const CHART_METRIC_OPTIONS = [
  { key: "mood", label: "Настрій", color: "#6C5DD3" },
  { key: "physicalState", label: "Фізичний стан", color: "#E2A24C" },
  { key: "energy", label: "Енергія", color: "#10B981" },
  { key: "anxiety", label: "Тривожність", color: "#F43F5E" },
  { key: "stress", label: "Стрес", color: "#F97316" },
];

const FACTOR_OPTIONS = [
  { key: "sleep", label: "Сон" },
  { key: "work", label: "Навчання / робота" },
  { key: "conflict", label: "Конфлікт" },
  { key: "relationships", label: "Стосунки" },
  { key: "loneliness", label: "Самотність" },
  { key: "activity", label: "Фізична активність" },
  { key: "social", label: "Соціальне життя" },
  { key: "finances", label: "Фінанси" },
  { key: "health", label: "Здоров'я" },
  { key: "other", label: "Інше" },
];

const FACTOR_LABELS = Object.fromEntries(
  FACTOR_OPTIONS.map((f) => [f.key, f.label]),
);

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

const DiaryChart = ({ entries, metrics, onHover, onSelect }) => {
  const width = 600;
  const height = 160;
  const padding = 20;

  if (entries.length < 2) return null;

  const step = (width - padding * 2) / (entries.length - 1);
  const toY = (value) =>
    height - padding - ((value - 1) / 4) * (height - padding * 2);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40">
      {metrics.map((m) => {
        const points = entries
          .map((e, i) => ({ e, i }))
          .filter(({ e }) => e[m.key] != null)
          .map(({ e, i }) => `${padding + i * step},${toY(e[m.key])}`)
          .join(" ");
        return (
          <polyline
            key={m.key}
            points={points}
            fill="none"
            stroke={m.color}
            strokeWidth="2.5"
          />
        );
      })}
      {entries.map((e, i) => (
        <g key={e.id}>
          {metrics.map(
            (m) =>
              e[m.key] != null && (
                <circle
                  key={m.key}
                  cx={padding + i * step}
                  cy={toY(e[m.key])}
                  r="3"
                  fill={m.color}
                />
              ),
          )}
          <rect
            x={padding + i * step - step / 2}
            y={0}
            width={step}
            height={height}
            fill="transparent"
            className="cursor-pointer"
            onMouseEnter={() => onHover(e)}
            onMouseLeave={() => onHover(null)}
            onClick={() => onSelect(e)}
          />
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
      <div className="bg-canvas border border-border rounded-xl p-3 font-mono text-xs break-all">
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
  const [factors, setFactors] = useState([]);
  const [chartPeriod, setChartPeriod] = useState("30");
  const [chartMetrics, setChartMetrics] = useState(["mood", "energy", "anxiety"]);
  const [hoveredEntry, setHoveredEntry] = useState(null);
  const [reflectionState, setReflectionState] = useState("idle");
  const [reflectionText, setReflectionText] = useState("");
  const [reflectionError, setReflectionError] = useState("");
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
      setFactors(Array.isArray(existing.factors) ? existing.factors : []);
    } else {
      setMood(3);
      setPhysicalState(3);
      setEnergy(3);
      setAnxiety(3);
      setStress(3);
      setSleepHours("");
      setNote("");
      setFactors([]);
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

  const toggleFactor = (key) => {
    setFactors((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const toggleChartMetric = (key) => {
    setChartMetrics((prev) => {
      if (prev.includes(key)) {
        return prev.length > 1 ? prev.filter((k) => k !== key) : prev;
      }
      return [...prev, key];
    });
  };

  const handleSelectChartPoint = (entry) => {
    setSelectedDate(entryKey(entry.date));
  };

  const handleGenerateReflection = async () => {
    setReflectionState("loading");
    setReflectionError("");
    try {
      const weekEntries = validEntries.slice(-7).map((e) => ({
        date: entryKey(e.date),
        mood: e.mood,
        physicalState: e.physicalState,
        energy: e.energy,
        anxiety: e.anxiety,
        stress: e.stress,
        sleepHours: e.sleepHours,
        note: e.note,
      }));
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/diary/weekly-reflection`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ entries: weekEntries }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Не вдалось згенерувати рефлексію");
      }
      const data = await response.json();
      setReflectionText(data.reflection);
      setReflectionState("done");
    } catch (err) {
      setReflectionError(err.message);
      setReflectionState("error");
    }
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
        factors,
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

  const insights = useMemo(() => generateInsights(validEntries), [validEntries]);
  const todaySummary = useMemo(
    () => buildTodaySummary(validEntries),
    [validEntries],
  );
  const weekSummary = useMemo(
    () => buildWeekSummary(validEntries),
    [validEntries],
  );
  const chartEntries = useMemo(
    () => filterByPeriod(validEntries, chartPeriod),
    [validEntries, chartPeriod],
  );
  const activeChartMetrics = CHART_METRIC_OPTIONS.filter((m) =>
    chartMetrics.includes(m.key),
  );

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

      {!isLoading && validEntries.length > 0 && (
        <div className="bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] p-6">
          <h3 className="text-xl font-extrabold text-ink mb-4">
            🧠 Моє самопочуття
          </h3>
          {todaySummary.today ? (
            <div className="flex flex-wrap gap-3 mb-3">
              {TREND_METRICS.map(({ key, label, icon }) => (
                <div
                  key={key}
                  className="flex items-center gap-2 bg-canvas rounded-xl px-4 py-2"
                >
                  <span className="text-lg">{icon}</span>
                  <div>
                    <p className="text-xs text-muted">{label}</p>
                    <p className="text-sm font-bold text-ink">
                      {todaySummary.today[key] ?? "—"}/5
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted mb-3">
              Сьогодні ще немає запису — заповни форму нижче.
            </p>
          )}

          {todaySummary.trends.some((t) => t.pct !== null) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted mb-3">
              {todaySummary.trends
                .filter((t) => t.pct !== null)
                .map((t) => (
                  <span key={t.key}>
                    {t.label}{" "}
                    {Math.abs(t.pct) < 1
                      ? "→ без змін"
                      : `${t.pct > 0 ? "↑" : "↓"} ${Math.abs(t.pct).toFixed(0)}% за тиждень`}
                  </span>
                ))}
            </div>
          )}

          {todaySummary.topInsight && (
            <p className="text-sm text-ink bg-primary-soft rounded-xl p-3">
              💡 Що помітно: {todaySummary.topInsight.text}
            </p>
          )}
        </div>
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

        <div className="flex gap-2 mb-2 flex-wrap">
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

        {!DAY_OPTIONS.some(
          (opt) => dateKeyOffset(opt.offset) === selectedDate,
        ) && (
          <p className="text-xs text-muted mb-4">
            Переглядаєш запис за {formatDate(selectedDate)}.{" "}
            <button
              type="button"
              onClick={() => setSelectedDate(dateKeyOffset(0))}
              className="text-primary font-semibold hover:underline"
            >
              Повернутись до сьогодні
            </button>
          </p>
        )}

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
              Що сьогодні могло вплинути на твій стан? (необов'язково)
            </label>
            <div className="flex flex-wrap gap-2">
              {FACTOR_OPTIONS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => toggleFactor(f.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                    factors.includes(f.key)
                      ? "bg-primary text-white border-transparent"
                      : "bg-canvas border-border text-ink hover:border-primary"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
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

        {!isLoading && validEntries.length >= 2 && (
          <>
            <div className="flex flex-wrap gap-2 mb-2">
              {PERIOD_OPTIONS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setChartPeriod(p.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    chartPeriod === p.key
                      ? "bg-primary text-white"
                      : "bg-canvas border border-border text-ink hover:border-primary"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {CHART_METRIC_OPTIONS.map((m) => {
                const active = chartMetrics.includes(m.key);
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => toggleChartMetric(m.key)}
                    style={active ? { backgroundColor: m.color } : undefined}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${
                      active
                        ? "text-white border-transparent"
                        : "bg-canvas border-border text-muted hover:border-primary"
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {isLoading && <p className="text-muted">Завантаження...</p>}
        {!isLoading && validEntries.length < 2 && (
          <p className="text-muted">
            Додай ще кілька записів, щоб побачити графік динаміки.
          </p>
        )}
        {!isLoading && validEntries.length >= 2 && chartEntries.length < 2 && (
          <p className="text-muted">
            За цей період замало записів — вибери довший період.
          </p>
        )}
        {!isLoading && chartEntries.length >= 2 && (
          <>
            <DiaryChart
              entries={chartEntries}
              metrics={activeChartMetrics}
              onHover={setHoveredEntry}
              onSelect={handleSelectChartPoint}
            />
            <div className="flex flex-wrap gap-4 text-sm mt-2">
              {activeChartMetrics.map((m) => (
                <span key={m.key} className="flex items-center gap-1">
                  <span
                    className="w-3 h-3 rounded-full inline-block"
                    style={{ backgroundColor: m.color }}
                  />
                  {m.label}
                </span>
              ))}
            </div>
            {hoveredEntry && (
              <div className="mt-3 bg-canvas rounded-xl p-3 text-sm flex flex-wrap items-center gap-3">
                <span className="font-semibold text-ink">
                  {formatDate(hoveredEntry.date)}
                </span>
                {activeChartMetrics
                  .filter((m) => hoveredEntry[m.key] != null)
                  .map((m) => (
                    <span key={m.key} style={{ color: m.color }}>
                      {m.label}: {hoveredEntry[m.key]}/5
                    </span>
                  ))}
                {hoveredEntry.sleepHours != null && (
                  <span className="text-muted">
                    Сон: {hoveredEntry.sleepHours} год
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleSelectChartPoint(hoveredEntry)}
                  className="text-primary text-xs font-semibold hover:underline ml-auto"
                >
                  Відкрити запис →
                </button>
              </div>
            )}
          </>
        )}

        {insights.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-bold text-muted uppercase tracking-wide">
              🔎 Твої закономірності
            </p>
            {insights.map((ins) => (
              <div
                key={ins.key}
                className="flex gap-2 items-start bg-primary-soft rounded-xl p-3"
              >
                <span className="text-lg shrink-0">{ins.icon}</span>
                <p className="text-sm text-ink">{ins.text}</p>
              </div>
            ))}
            <p className="text-xs text-muted">
              Виявлено на основі {validEntries.length} записів. Це
              статистична закономірність, а не причинно-наслідковий зв'язок.
            </p>
          </div>
        )}
        {insights.length === 0 && validEntries.length >= 2 && (
          <p className="text-sm text-muted mt-3">
            Ще недостатньо даних для помітних закономірностей — веди
            щоденник регулярніше, і тут з'являться інсайти.
          </p>
        )}
      </div>

      {weekSummary && (
        <div className="bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] p-6">
          <h3 className="text-xl font-extrabold text-ink mb-4">
            📅 Мій тиждень
          </h3>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <div className="bg-canvas rounded-xl p-3">
              <p className="text-muted text-xs mb-1">Найкращий день</p>
              <p className="font-semibold text-ink">
                🌿 {formatDate(weekSummary.best.date)} (настрій{" "}
                {weekSummary.best.mood}/5)
              </p>
            </div>
            <div className="bg-canvas rounded-xl p-3">
              <p className="text-muted text-xs mb-1">Найскладніший день</p>
              <p className="font-semibold text-ink">
                🌧 {formatDate(weekSummary.worst.date)} (настрій{" "}
                {weekSummary.worst.mood}/5)
              </p>
            </div>
            <div className="bg-canvas rounded-xl p-3">
              <p className="text-muted text-xs mb-1">Середній настрій</p>
              <p className="font-semibold text-ink">
                {weekSummary.avgMood.toFixed(1)}/5
              </p>
            </div>
            {weekSummary.avgAnxiety != null && (
              <div className="bg-canvas rounded-xl p-3">
                <p className="text-muted text-xs mb-1">Середня тривожність</p>
                <p className="font-semibold text-ink">
                  {weekSummary.avgAnxiety.toFixed(1)}/5
                </p>
              </div>
            )}
            {weekSummary.avgSleep != null && (
              <div className="bg-canvas rounded-xl p-3">
                <p className="text-muted text-xs mb-1">Середній сон</p>
                <p className="font-semibold text-ink">
                  {weekSummary.avgSleep.toFixed(1)} год
                </p>
              </div>
            )}
          </div>
          <p className="text-xs text-muted mt-3">
            За останні {weekSummary.count} записів.
          </p>
        </div>
      )}

      {weekSummary && (
        <div className="bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] p-6">
          <h3 className="text-xl font-extrabold text-ink mb-2">
            🧠 AI-рефлексія тижня
          </h3>

          {reflectionState === "idle" && (
            <>
              <p className="text-sm text-muted mb-3">
                Gemini прочитає твої оцінки та нотатки за останні 7 днів і
                напише один короткий підсумок людською мовою. Це не діагноз і
                не заміна фахівця — лише погляд збоку.
              </p>
              <button
                type="button"
                onClick={() => setReflectionState("confirm")}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary-dark transition"
              >
                Згенерувати
              </button>
            </>
          )}

          {reflectionState === "confirm" && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 space-y-3">
              <p className="text-sm text-ink">
                ⚠️ На відміну від решти щоденника, цей крок розшифрує нотатки
                за останні 7 днів і надішле їх до AI-сервісу (Google Gemini)
                для аналізу. Дані не зберігаються після відповіді, але
                тимчасово покидають твій браузер.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleGenerateReflection}
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary-dark transition"
                >
                  Так, згенерувати
                </button>
                <button
                  type="button"
                  onClick={() => setReflectionState("idle")}
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-canvas border border-border text-ink hover:border-primary transition"
                >
                  Скасувати
                </button>
              </div>
            </div>
          )}

          {reflectionState === "loading" && (
            <p className="text-sm text-muted">Аналізую...</p>
          )}

          {reflectionState === "done" && (
            <>
              <p className="text-sm text-ink bg-primary-soft rounded-xl p-4 whitespace-pre-line">
                {reflectionText}
              </p>
              <button
                type="button"
                onClick={() => setReflectionState("idle")}
                className="mt-3 text-xs font-semibold text-primary hover:underline"
              >
                Згенерувати ще раз
              </button>
            </>
          )}

          {reflectionState === "error" && (
            <>
              <p className="text-sm text-red-500 mb-2">{reflectionError}</p>
              <button
                type="button"
                onClick={() => setReflectionState("idle")}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Спробувати ще раз
              </button>
            </>
          )}
        </div>
      )}

      <div className="bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] p-6">
        <h3 className="text-xl font-extrabold text-ink mb-4">Історія записів</h3>
        {!isLoading && entries.length === 0 && (
          <p className="text-muted">Записів поки немає.</p>
        )}
        <div className="flex flex-col gap-2">
          {recentEntries.map((entry) => {
            const borderClass = entry.decryptFailed
              ? "border-border"
              : entry.mood >= 4
                ? "border-emerald-300"
                : entry.mood <= 2
                  ? "border-rose-300"
                  : "border-amber-300";
            return (
              <div
                key={entry.id}
                className={`bg-canvas border-l-4 border border-border rounded-xl p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 ${borderClass}`}
              >
                {entry.decryptFailed ? (
                  <p className="text-sm text-muted">
                    {formatDate(entry.date)} — 🔒 не вдалося розшифрувати (інший ключ)
                  </p>
                ) : (
                  <>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">
                        {formatDate(entry.date)}
                      </p>
                      {entry.note && (
                        <p className="text-sm text-muted mt-1 line-clamp-1">
                          {entry.note}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm shrink-0">
                      <span>😐 {entry.mood}/5</span>
                      {entry.energy != null && <span>⚡ {entry.energy}/5</span>}
                      {entry.anxiety != null && <span>😰 {entry.anxiety}/5</span>}
                      {entry.sleepHours != null && (
                        <span>💤 {entry.sleepHours} год</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DiaryPage;
