import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { API_BASE_URL } from "../../api/config";
import { ensureKey, encryptEntry, decryptEntry } from "../../utils/diaryCrypto";

const TEXT_CATEGORIES = [
  {
    key: "simpleActions",
    icon: "✅",
    title: "Прості дії, які допомагають",
    placeholder: "Наприклад: вийти на балкон подихати",
  },
  {
    key: "memories",
    icon: "🌿",
    title: "Спогади й речі, що заспокоюють",
    placeholder: "Наприклад: море, бабусин плед, запах кави",
  },
  {
    key: "quotes",
    icon: "💬",
    title: "Цитати й нагадування собі",
    placeholder: "Наприклад: Це теж мине",
  },
];

const MAX_ITEMS_PER_CATEGORY = 20;
const MAX_ITEM_LENGTH = 150;

const EMPTY_PLAN = {
  simpleActions: [],
  memories: [],
  quotes: [],
  playlists: [],
  contacts: [],
};

const SafetyPlanPage = () => {
  const { getToken } = useAuth();

  const [encryptionKey, setEncryptionKey] = useState(null);
  const [plan, setPlan] = useState(EMPTY_PLAN);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState("");

  const [drafts, setDrafts] = useState({
    simpleActions: "",
    memories: "",
    quotes: "",
  });
  const [playlistDraft, setPlaylistDraft] = useState({ label: "", url: "" });
  const [contactDraft, setContactDraft] = useState({ name: "", phone: "" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { key } = await ensureKey(false);
        if (cancelled) return;
        setEncryptionKey(key);
        if (!key) {
          setIsLoading(false);
          return;
        }

        const token = await getToken();
        const res = await fetch(`${API_BASE_URL}/safety-plan/mine`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (data?.cipherText) {
          try {
            const decrypted = await decryptEntry(key, data.cipherText);
            if (!cancelled) setPlan({ ...EMPTY_PLAN, ...decrypted });
          } catch {
            if (!cancelled) setLoadError("Не вдалось розшифрувати аптечку.");
          }
        }
      } catch {
        if (!cancelled) setLoadError("Не вдалось завантажити аптечку ресурсу.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getToken]);

  const savePlan = async (nextPlan) => {
    setPlan(nextPlan);
    if (!encryptionKey) return;
    setIsSaving(true);
    setSaveNotice("");
    try {
      const cipherText = await encryptEntry(encryptionKey, nextPlan);
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/safety-plan`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ cipherText }),
      });
      if (!res.ok) throw new Error();
      setSaveNotice("Збережено.");
    } catch {
      setSaveNotice("Не вдалось зберегти — спробуй ще раз.");
    } finally {
      setIsSaving(false);
    }
  };

  const addTextItem = (categoryKey) => {
    const value = drafts[categoryKey].trim();
    if (!value) return;
    if (plan[categoryKey].length >= MAX_ITEMS_PER_CATEGORY) return;
    savePlan({
      ...plan,
      [categoryKey]: [...plan[categoryKey], value.slice(0, MAX_ITEM_LENGTH)],
    });
    setDrafts((prev) => ({ ...prev, [categoryKey]: "" }));
  };

  const removeTextItem = (categoryKey, index) => {
    savePlan({
      ...plan,
      [categoryKey]: plan[categoryKey].filter((_, i) => i !== index),
    });
  };

  const addPlaylist = () => {
    const label = playlistDraft.label.trim();
    const url = playlistDraft.url.trim();
    if (!label || !url) return;
    if (plan.playlists.length >= MAX_ITEMS_PER_CATEGORY) return;
    savePlan({
      ...plan,
      playlists: [
        ...plan.playlists,
        { label: label.slice(0, MAX_ITEM_LENGTH), url: url.slice(0, 500) },
      ],
    });
    setPlaylistDraft({ label: "", url: "" });
  };

  const removePlaylist = (index) => {
    savePlan({ ...plan, playlists: plan.playlists.filter((_, i) => i !== index) });
  };

  const addContact = () => {
    const name = contactDraft.name.trim();
    const phone = contactDraft.phone.trim();
    if (!name || !phone) return;
    if (plan.contacts.length >= MAX_ITEMS_PER_CATEGORY) return;
    savePlan({
      ...plan,
      contacts: [
        ...plan.contacts,
        { name: name.slice(0, MAX_ITEM_LENGTH), phone: phone.slice(0, 40) },
      ],
    });
    setContactDraft({ name: "", phone: "" });
  };

  const removeContact = (index) => {
    savePlan({ ...plan, contacts: plan.contacts.filter((_, i) => i !== index) });
  };

  const isEmpty =
    plan.simpleActions.length === 0 &&
    plan.memories.length === 0 &&
    plan.quotes.length === 0 &&
    plan.playlists.length === 0 &&
    plan.contacts.length === 0;

  if (isLoading) {
    return <p className="text-center text-muted">Завантаження…</p>;
  }

  return (
    <div className="max-w-2xl mx-auto text-left space-y-6">
      <div className="bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] p-6">
        <h2 className="text-2xl font-extrabold text-ink mb-2">
          Аптечка ресурсу
        </h2>
        <p className="text-sm text-muted">
          Персональний список того, що повертає тебе до стабільного стану.
          Заповни її зараз, поки все спокійно, — щоб у важку хвилину не
          довелось нічого вигадувати. Все шифрується тим самим ключем, що й
          щоденник — сервер не бачить вмісту.
        </p>
        {plan.simpleActions.length + plan.memories.length > 0 && (
          <Link
            to="/crisis"
            className="inline-block mt-3 text-sm font-semibold text-primary hover:underline"
          >
            Відкрити екран підтримки →
          </Link>
        )}
      </div>

      {loadError && <p className="text-sm text-danger">{loadError}</p>}

      {isEmpty && !loadError && (
        <p className="text-sm text-muted bg-primary-soft rounded-xl p-4">
          Аптечка поки порожня. Додай хоча б кілька пунктів у будь-якому
          розділі нижче — навіть один-два вже можуть допомогти в потрібний
          момент.
        </p>
      )}

      {TEXT_CATEGORIES.map((cat) => (
        <div
          key={cat.key}
          className="bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] p-6"
        >
          <h3 className="text-base font-extrabold text-ink mb-3">
            {cat.icon} {cat.title}
          </h3>

          {plan[cat.key].length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {plan[cat.key].map((item, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-2 bg-canvas border border-border rounded-full px-3 py-1.5 text-sm text-ink"
                >
                  {item}
                  <button
                    type="button"
                    onClick={() => removeTextItem(cat.key, i)}
                    className="text-muted hover:text-danger"
                    aria-label="Видалити"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={drafts[cat.key]}
              onChange={(e) =>
                setDrafts((prev) => ({
                  ...prev,
                  [cat.key]: e.target.value.slice(0, MAX_ITEM_LENGTH),
                }))
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTextItem(cat.key);
                }
              }}
              placeholder={cat.placeholder}
              className="flex-1 rounded-xl border border-border bg-canvas px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={() => addTextItem(cat.key)}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary-dark transition"
            >
              Додати
            </button>
          </div>
        </div>
      ))}

      <div className="bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] p-6">
        <h3 className="text-base font-extrabold text-ink mb-3">
          🎧 Спокійні плейлисти й посилання
        </h3>

        {plan.playlists.length > 0 && (
          <div className="flex flex-col gap-2 mb-3">
            {plan.playlists.map((p, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-3 bg-canvas border border-border rounded-xl px-3 py-2"
              >
                <a
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-primary hover:underline truncate"
                >
                  {p.label}
                </a>
                <button
                  type="button"
                  onClick={() => removePlaylist(i)}
                  className="text-muted hover:text-danger shrink-0"
                  aria-label="Видалити"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={playlistDraft.label}
            onChange={(e) =>
              setPlaylistDraft((prev) => ({ ...prev, label: e.target.value }))
            }
            placeholder="Назва (напр. Спокійний плейлист)"
            className="flex-1 rounded-xl border border-border bg-canvas px-3 py-2 text-sm focus:outline-none focus:border-primary"
          />
          <input
            type="text"
            value={playlistDraft.url}
            onChange={(e) =>
              setPlaylistDraft((prev) => ({ ...prev, url: e.target.value }))
            }
            placeholder="Посилання"
            className="flex-1 rounded-xl border border-border bg-canvas px-3 py-2 text-sm focus:outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={addPlaylist}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary-dark transition"
          >
            Додати
          </button>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] p-6">
        <h3 className="text-base font-extrabold text-ink mb-3">
          🫂 Довірені люди
        </h3>

        {plan.contacts.length > 0 && (
          <div className="flex flex-col gap-2 mb-3">
            {plan.contacts.map((c, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-3 bg-canvas border border-border rounded-xl px-3 py-2"
              >
                <div>
                  <p className="text-sm font-semibold text-ink">{c.name}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={`tel:${c.phone.replace(/\s/g, "")}`}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-primary-soft text-primary hover:bg-primary hover:text-white transition"
                  >
                    📞 {c.phone}
                  </a>
                  <button
                    type="button"
                    onClick={() => removeContact(i)}
                    className="text-muted hover:text-danger"
                    aria-label="Видалити"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={contactDraft.name}
            onChange={(e) =>
              setContactDraft((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder="Ім'я"
            className="flex-1 rounded-xl border border-border bg-canvas px-3 py-2 text-sm focus:outline-none focus:border-primary"
          />
          <input
            type="tel"
            value={contactDraft.phone}
            onChange={(e) =>
              setContactDraft((prev) => ({ ...prev, phone: e.target.value }))
            }
            placeholder="Телефон"
            className="flex-1 rounded-xl border border-border bg-canvas px-3 py-2 text-sm focus:outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={addContact}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary-dark transition"
          >
            Додати
          </button>
        </div>
      </div>

      <p className="text-xs text-muted text-center min-h-[1rem]">
        {isSaving ? "Збереження…" : saveNotice}
      </p>
    </div>
  );
};

export default SafetyPlanPage;
