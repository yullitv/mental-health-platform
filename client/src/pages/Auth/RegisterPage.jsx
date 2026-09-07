import { useState } from "react";
import { useSignUp } from "@clerk/clerk-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

const ROLE_OPTIONS = [
  { value: "CLIENT", label: "Я шукаю підтримку" },
  { value: "SPECIALIST", label: "Я спеціаліст" },
];

const errorMessage = (err, fallback) =>
  err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || fallback;

const RegisterPage = () => {
  const { isLoaded, signUp, setActive } = useSignUp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialRole =
    searchParams.get("role") === "specialist" ? "SPECIALIST" : "CLIENT";

  const [step, setStep] = useState("form"); // "form" | "verify"
  const [role, setRole] = useState(initialRole);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isLoaded) return;
    setError("");

    if (!agreed) {
      setError("Потрібно погодитись з умовами обробки даних, щоб продовжити.");
      return;
    }

    setIsSubmitting(true);
    try {
      await signUp.create({
        emailAddress: email,
        password,
        firstName,
        lastName,
        unsafeMetadata: { intendedRole: role },
      });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setStep("verify");
    } catch (err) {
      console.error("❌ Помилка реєстрації:", err);
      setError(errorMessage(err, "Не вдалось зареєструватись. Перевір дані й спробуй ще раз."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!isLoaded) return;
    setError("");
    setIsSubmitting(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        navigate("/");
      } else {
        setError("Код не підійшов. Перевір, чи правильно ввела цифри з листа.");
      }
    } catch (err) {
      console.error("❌ Помилка підтвердження email:", err);
      setError(errorMessage(err, "Не вдалось підтвердити код. Спробуй ще раз."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    if (!isLoaded) return;
    setError("");
    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
    } catch (err) {
      console.error("❌ Помилка повторної відправки коду:", err);
      setError(errorMessage(err, "Не вдалось надіслати код повторно."));
    }
  };

  return (
    <div className="max-w-md mx-auto text-left">
      <div className="bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] p-6 sm:p-8">
        {step === "form" ? (
          <>
            <h1 className="text-2xl font-extrabold text-ink mb-1">Реєстрація</h1>
            <p className="text-sm text-muted mb-6">
              Створи акаунт, щоб отримати доступ до щоденника, практик і
              спеціалістів.
            </p>

            <div className="flex gap-2 mb-5">
              {ROLE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRole(opt.value)}
                  className={`flex-1 text-sm font-semibold px-3 py-2.5 rounded-xl border transition ${
                    role === opt.value
                      ? "bg-primary text-white border-primary"
                      : "bg-canvas text-muted border-border hover:border-primary hover:text-primary"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="flex gap-3">
                <input
                  type="text"
                  required
                  placeholder="Ім'я"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-1/2 rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-primary"
                />
                <input
                  type="text"
                  required
                  placeholder="Прізвище"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-1/2 rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-primary"
                />
              </div>
              <input
                type="email"
                required
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-primary"
              />
              <input
                type="password"
                required
                minLength={8}
                placeholder="Пароль (мінімум 8 символів)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-primary"
              />

              <label className="flex items-start gap-2 text-xs text-muted pt-1">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  Погоджуюсь з обробкою даних. Записи щоденника шифруються в
                  браузері — навіть ми не можемо їх прочитати.
                </span>
              </label>

              {error && (
                <p className="text-sm text-danger bg-danger/10 rounded-xl p-3">{error}</p>
              )}

              {/* Clerk-віджет для захисту від ботів (CAPTCHA), якщо ввімкнений у проєкті */}
              <div id="clerk-captcha" />

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary text-white px-6 py-3 rounded-2xl font-semibold hover:bg-primary-dark transition disabled:opacity-50"
              >
                {isSubmitting ? "Реєструємо..." : "Зареєструватись"}
              </button>
            </form>

            <p className="text-sm text-muted text-center mt-5">
              Вже є акаунт?{" "}
              <Link to="/login" className="font-semibold text-primary hover:underline">
                Увійти
              </Link>
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-extrabold text-ink mb-1">Перевір пошту</h1>
            <p className="text-sm text-muted mb-6">
              Ми надіслали код підтвердження на <strong className="text-ink">{email}</strong>.
              Введи його нижче, щоб завершити реєстрацію.
            </p>

            <form onSubmit={handleVerify} className="space-y-3">
              <input
                type="text"
                required
                inputMode="numeric"
                placeholder="Код з листа"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm text-ink text-center tracking-[0.3em] focus:outline-none focus:border-primary"
              />

              {error && (
                <p className="text-sm text-danger bg-danger/10 rounded-xl p-3">{error}</p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary text-white px-6 py-3 rounded-2xl font-semibold hover:bg-primary-dark transition disabled:opacity-50"
              >
                {isSubmitting ? "Перевіряємо..." : "Підтвердити"}
              </button>
            </form>

            <button
              type="button"
              onClick={handleResendCode}
              className="w-full text-sm font-semibold text-primary hover:underline mt-4"
            >
              Надіслати код ще раз
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default RegisterPage;
