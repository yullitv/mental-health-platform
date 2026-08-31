import { useState } from "react";
import {
  hasPinSet,
  markLocked,
  removePin,
  setPin,
  verifyPin,
} from "../../utils/appLock";

const isValidPin = (v) => /^\d{4,6}$/.test(v);

// 'status' -> 'create' | 'change' | 'disable'
const PrivacySettingsPage = () => {
  const [pinSet, setPinSet] = useState(hasPinSet());
  const [view, setView] = useState("status");

  const [pin, setPinValue] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [oldPin, setOldPin] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const resetForm = () => {
    setPinValue("");
    setConfirmPin("");
    setOldPin("");
    setError("");
  };

  const backToStatus = () => {
    resetForm();
    setView("status");
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    if (!isValidPin(pin)) {
      setError("PIN має складатись із 4-6 цифр.");
      return;
    }
    if (pin !== confirmPin) {
      setError("PIN-и не збігаються.");
      return;
    }
    await setPin(pin);
    setPinSet(true);
    setNotice("PIN увімкнено.");
    backToStatus();
  };

  const handleChange = async (e) => {
    e.preventDefault();
    setError("");
    const ok = await verifyPin(oldPin);
    if (!ok) {
      setError("Поточний PIN невірний.");
      return;
    }
    if (!isValidPin(pin)) {
      setError("Новий PIN має складатись із 4-6 цифр.");
      return;
    }
    if (pin !== confirmPin) {
      setError("PIN-и не збігаються.");
      return;
    }
    await setPin(pin);
    setNotice("PIN змінено.");
    backToStatus();
  };

  const handleDisable = async (e) => {
    e.preventDefault();
    setError("");
    const ok = await verifyPin(oldPin);
    if (!ok) {
      setError("PIN невірний.");
      return;
    }
    removePin();
    setPinSet(false);
    setNotice("PIN вимкнено.");
    backToStatus();
  };

  const handleLockNow = () => {
    markLocked();
    window.location.reload();
  };

  return (
    <div className="max-w-lg mx-auto text-left space-y-6">
      <div className="bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] p-6">
        <h2 className="text-2xl font-extrabold text-ink mb-2">Приватність</h2>
        <p className="text-sm text-muted">
          PIN додає короткий екран блокування перед усім застосунком у цьому
          браузері — щоб ніхто, хто випадково візьме твій телефон чи
          комп'ютер, одразу не побачив щоденник, тести чи розмову з AI.
        </p>
        <p className="text-xs text-muted mt-2">
          Це НЕ шифрування і не заміна входу через акаунт — лише швидкий
          захист від випадкового погляду. PIN діє тільки в цьому браузері й
          не пов'язаний із ключем шифрування щоденника, тож забутий PIN можна
          спокійно скинути — жодні дані від цього не постраждають.
        </p>
      </div>

      {notice && (
        <p className="text-sm text-primary bg-primary-soft rounded-xl p-3">
          {notice}
        </p>
      )}

      {view === "status" && (
        <div className="bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] p-6 space-y-4">
          <p className="text-sm font-semibold text-ink">
            PIN зараз {pinSet ? "увімкнено" : "вимкнено"}.
          </p>
          <div className="flex flex-wrap gap-3">
            {!pinSet && (
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setView("create");
                }}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary-dark transition"
              >
                Встановити PIN
              </button>
            )}
            {pinSet && (
              <>
                <button
                  type="button"
                  onClick={handleLockNow}
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-canvas border border-border text-ink hover:border-primary transition"
                >
                  Заблокувати зараз
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setView("change");
                  }}
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-canvas border border-border text-ink hover:border-primary transition"
                >
                  Змінити PIN
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setView("disable");
                  }}
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-canvas border border-border text-danger hover:border-danger transition"
                >
                  Вимкнути PIN
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {view === "create" && (
        <form
          onSubmit={handleCreate}
          className="bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] p-6 space-y-4"
        >
          <h3 className="text-base font-extrabold text-ink">Новий PIN</h3>
          <input
            type="password"
            inputMode="numeric"
            placeholder="Новий PIN (4-6 цифр)"
            value={pin}
            onChange={(e) => setPinValue(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
          />
          <input
            type="password"
            inputMode="numeric"
            placeholder="Повтори PIN"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
          />
          {error && <p className="text-xs text-danger">{error}</p>}
          <div className="flex gap-3">
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary-dark transition"
            >
              Зберегти
            </button>
            <button
              type="button"
              onClick={backToStatus}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-canvas border border-border text-ink hover:border-primary transition"
            >
              Скасувати
            </button>
          </div>
        </form>
      )}

      {view === "change" && (
        <form
          onSubmit={handleChange}
          className="bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] p-6 space-y-4"
        >
          <h3 className="text-base font-extrabold text-ink">Зміна PIN</h3>
          <input
            type="password"
            inputMode="numeric"
            placeholder="Поточний PIN"
            value={oldPin}
            onChange={(e) => setOldPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
          />
          <input
            type="password"
            inputMode="numeric"
            placeholder="Новий PIN (4-6 цифр)"
            value={pin}
            onChange={(e) => setPinValue(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
          />
          <input
            type="password"
            inputMode="numeric"
            placeholder="Повтори новий PIN"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
          />
          {error && <p className="text-xs text-danger">{error}</p>}
          <div className="flex gap-3">
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary-dark transition"
            >
              Зберегти
            </button>
            <button
              type="button"
              onClick={backToStatus}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-canvas border border-border text-ink hover:border-primary transition"
            >
              Скасувати
            </button>
          </div>
        </form>
      )}

      {view === "disable" && (
        <form
          onSubmit={handleDisable}
          className="bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] p-6 space-y-4"
        >
          <h3 className="text-base font-extrabold text-ink">Вимкнути PIN</h3>
          <input
            type="password"
            inputMode="numeric"
            placeholder="Поточний PIN"
            value={oldPin}
            onChange={(e) => setOldPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
          />
          {error && <p className="text-xs text-danger">{error}</p>}
          <div className="flex gap-3">
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-danger text-white hover:bg-danger/90 transition"
            >
              Вимкнути
            </button>
            <button
              type="button"
              onClick={backToStatus}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-canvas border border-border text-ink hover:border-primary transition"
            >
              Скасувати
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default PrivacySettingsPage;
