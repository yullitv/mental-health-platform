import { useState } from "react";
import { useSignIn } from "@clerk/clerk-react";
import { Link, useNavigate } from "react-router-dom";

const errorMessage = (err, fallback) =>
  err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || fallback;

const LoginPage = () => {
  const { isLoaded, signIn, setActive } = useSignIn();
  const navigate = useNavigate();

  // "sign_in" - звичайний вхід; "second_factor" - код з пошти при вході з
  // нового пристрою (захист Clerk Device Trust); "forgot_email" - вводимо
  // пошту для коду скидання; "forgot_reset" - вводимо код і новий пароль.
  const [step, setStep] = useState("sign_in");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const finishSignIn = async (result) => {
    await setActive({ session: result.createdSessionId });
    navigate("/");
  };

  // Clerk Device Trust: при вході паролем з нового пристрою Clerk вимагає
  // другий крок - одноразовий код, надісланий на пошту. Без цього кроку
  // правильний пароль закінчувався загальною помилкою "Не вдалось увійти".
  const startEmailCodeStep = async (result) => {
    const emailFactor = result.supportedSecondFactors?.find(
      (f) => f.strategy === "email_code",
    );
    if (!emailFactor) return false;
    await signIn.prepareSecondFactor({
      strategy: "email_code",
      emailAddressId: emailFactor.emailAddressId,
    });
    setCode("");
    setStep("second_factor");
    return true;
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    if (!isLoaded) return;
    setError("");
    setIsSubmitting(true);
    try {
      const result = await signIn.create({ identifier: email, password });
      if (result.status === "complete") {
        await finishSignIn(result);
      } else if (
        (result.status === "needs_second_factor" ||
          result.status === "needs_client_trust") &&
        (await startEmailCodeStep(result))
      ) {
        // Далі - форма введення коду (step "second_factor").
      } else {
        setError("Не вдалось увійти. Перевір, чи все правильно введено.");
      }
    } catch (err) {
      console.error("❌ Помилка входу:", err);
      setError(errorMessage(err, "Не вдалось увійти. Перевір email і пароль."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSecondFactor = async (e) => {
    e.preventDefault();
    if (!isLoaded) return;
    setError("");
    setIsSubmitting(true);
    try {
      const result = await signIn.attemptSecondFactor({
        strategy: "email_code",
        code: code.trim(),
      });
      if (result.status === "complete") {
        await finishSignIn(result);
      } else {
        setError("Код не підійшов. Перевір цифри з листа.");
      }
    } catch (err) {
      console.error("❌ Помилка перевірки коду:", err);
      setError(errorMessage(err, "Код не підійшов. Спробуй ще раз."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    if (!isLoaded) return;
    setError("");
    try {
      await startEmailCodeStep(signIn);
    } catch (err) {
      setError(errorMessage(err, "Не вдалось надіслати код повторно."));
    }
  };

  const handleRequestReset = async (e) => {
    e.preventDefault();
    if (!isLoaded) return;
    setError("");
    setIsSubmitting(true);
    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email,
      });
      setStep("forgot_reset");
    } catch (err) {
      console.error("❌ Помилка запиту скидання пароля:", err);
      setError(
        errorMessage(
          err,
          "Не вдалось надіслати код. Перевір email або зверніcь пізніше.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!isLoaded) return;
    setError("");
    setIsSubmitting(true);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code,
        password: newPassword,
      });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        navigate("/");
      } else {
        setError("Код не підійшов. Перевір цифри з листа.");
      }
    } catch (err) {
      console.error("❌ Помилка скидання пароля:", err);
      setError(errorMessage(err, "Не вдалось змінити пароль. Спробуй ще раз."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto text-left">
      <div className="bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] p-6 sm:p-8">
        {step === "sign_in" && (
          <>
            <h1 className="text-2xl font-extrabold text-ink mb-1">Увійти</h1>
            <p className="text-sm text-muted mb-6">
              Радо бачимо знову. Введи email і пароль.
            </p>

            <form onSubmit={handleSignIn} className="space-y-3">
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
                placeholder="Пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-primary"
              />

              {error && (
                <p className="text-sm text-danger bg-danger/10 rounded-xl p-3">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary text-white px-6 py-3 rounded-2xl font-semibold hover:bg-primary-dark transition disabled:opacity-50"
              >
                {isSubmitting ? "Входимо..." : "Увійти"}
              </button>
            </form>

            <button
              type="button"
              onClick={() => {
                setError("");
                setStep("forgot_email");
              }}
              className="w-full text-sm font-semibold text-primary hover:underline mt-4"
            >
              Не пам'ятаєш пароль?
            </button>

            <p className="text-sm text-muted text-center mt-3">
              Ще немає акаунту?{" "}
              <Link
                to="/register"
                className="font-semibold text-primary hover:underline"
              >
                Зареєструватись
              </Link>
            </p>
          </>
        )}

        {step === "second_factor" && (
          <>
            <h1 className="text-2xl font-extrabold text-ink mb-1">
              Підтвердь вхід
            </h1>
            <p className="text-sm text-muted mb-6">
              Схоже, ти входиш з нового пристрою. Ми надіслали код на{" "}
              <strong className="text-ink">{email}</strong> - введи його, щоб
              завершити вхід.
            </p>

            <form onSubmit={handleSecondFactor} className="space-y-3">
              <input
                type="text"
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="Код з листа"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm text-ink text-center tracking-[0.3em] focus:outline-none focus:border-primary"
              />

              {error && (
                <p className="text-sm text-danger bg-danger/10 rounded-xl p-3">
                  {error}
                </p>
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
            <button
              type="button"
              onClick={() => {
                setError("");
                setStep("sign_in");
              }}
              className="w-full text-sm font-semibold text-muted hover:text-primary mt-2"
            >
              ← Назад до входу
            </button>
          </>
        )}

        {step === "forgot_email" && (
          <>
            <h1 className="text-2xl font-extrabold text-ink mb-1">
              Відновлення пароля
            </h1>
            <p className="text-sm text-muted mb-6">
              Введи email, на який зареєстрований акаунт - надішлемо код для
              скидання пароля.
            </p>

            <form onSubmit={handleRequestReset} className="space-y-3">
              <input
                type="email"
                required
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-primary"
              />

              {error && (
                <p className="text-sm text-danger bg-danger/10 rounded-xl p-3">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary text-white px-6 py-3 rounded-2xl font-semibold hover:bg-primary-dark transition disabled:opacity-50"
              >
                {isSubmitting ? "Надсилаємо..." : "Надіслати код"}
              </button>
            </form>

            <button
              type="button"
              onClick={() => {
                setError("");
                setStep("sign_in");
              }}
              className="w-full text-sm font-semibold text-muted hover:text-primary mt-4"
            >
              ← Назад до входу
            </button>
          </>
        )}

        {step === "forgot_reset" && (
          <>
            <h1 className="text-2xl font-extrabold text-ink mb-1">
              Новий пароль
            </h1>
            <p className="text-sm text-muted mb-6">
              Ми надіслали код на <strong className="text-ink">{email}</strong>.
              Введи його разом з новим паролем.
            </p>

            <form onSubmit={handleResetPassword} className="space-y-3">
              <input
                type="text"
                required
                inputMode="numeric"
                placeholder="Код з листа"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm text-ink text-center tracking-[0.3em] focus:outline-none focus:border-primary"
              />
              <input
                type="password"
                required
                minLength={8}
                placeholder="Новий пароль (мінімум 8 символів)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-primary"
              />

              {error && (
                <p className="text-sm text-danger bg-danger/10 rounded-xl p-3">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary text-white px-6 py-3 rounded-2xl font-semibold hover:bg-primary-dark transition disabled:opacity-50"
              >
                {isSubmitting ? "Зберігаємо..." : "Змінити пароль і увійти"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
