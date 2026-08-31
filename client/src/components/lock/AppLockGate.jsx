import { useEffect, useRef, useState } from "react";
import {
  hasPinSet,
  isUnlockedThisSession,
  markLocked,
  markUnlocked,
  removePin,
  verifyPin,
} from "../../utils/appLock";

// Автоблокування: якщо вкладка була прихована довше цього порогу (перехід
// в інший застосунок, вимкнення екрана) — при поверненні знову просимо PIN.
// Короткий погляд убік (перевірити сповіщення) замок НЕ спрацьовує.
const AUTO_LOCK_AFTER_HIDDEN_MS = 30000;

const AppLockGate = ({ children }) => {
  const [locked, setLocked] = useState(
    () => hasPinSet() && !isUnlockedThisSession(),
  );
  const [pinInput, setPinInput] = useState("");
  const [error, setError] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const hiddenAtRef = useRef(null);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        hiddenAtRef.current = Date.now();
        return;
      }
      if (
        hiddenAtRef.current &&
        Date.now() - hiddenAtRef.current > AUTO_LOCK_AFTER_HIDDEN_MS &&
        hasPinSet()
      ) {
        markLocked();
        setLocked(true);
      }
      hiddenAtRef.current = null;
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  const handleUnlock = async (e) => {
    e.preventDefault();
    setIsChecking(true);
    setError("");
    const ok = await verifyPin(pinInput);
    setIsChecking(false);
    setPinInput("");
    if (ok) {
      markUnlocked();
      setLocked(false);
    } else {
      setError("Невірний PIN.");
    }
  };

  const handleForgotPin = () => {
    removePin();
    setLocked(false);
    setPinInput("");
    setError("");
  };

  if (!locked) return children;

  return (
    <div className="fixed inset-0 z-[100] bg-canvas flex items-center justify-center p-4">
      <form
        onSubmit={handleUnlock}
        className="w-full max-w-sm bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.1)] p-6 text-left space-y-4"
      >
        <div className="text-center">
          <span className="text-3xl">🔒</span>
          <h2 className="text-lg font-extrabold text-ink mt-2">
            Застосунок заблоковано
          </h2>
          <p className="text-sm text-muted mt-1">Введи PIN, щоб продовжити.</p>
        </div>

        <input
          type="password"
          inputMode="numeric"
          autoFocus
          value={pinInput}
          onChange={(e) =>
            setPinInput(e.target.value.replace(/\D/g, "").slice(0, 6))
          }
          className="w-full text-center tracking-[0.5em] text-xl rounded-xl border border-border bg-canvas px-4 py-3 focus:outline-none focus:border-primary"
          placeholder="••••"
        />

        {error && <p className="text-sm text-danger text-center">{error}</p>}

        <button
          type="submit"
          disabled={pinInput.length < 4 || isChecking}
          className="w-full px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary-dark transition disabled:opacity-50"
        >
          {isChecking ? "Перевірка..." : "Розблокувати"}
        </button>

        <button
          type="button"
          onClick={handleForgotPin}
          className="w-full text-xs text-muted hover:text-ink hover:underline"
        >
          Забула PIN? Скинути його
        </button>
      </form>
    </div>
  );
};

export default AppLockGate;
