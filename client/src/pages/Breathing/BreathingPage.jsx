import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BREATHING_EXERCISES,
  EMOTIONAL_STATES,
} from "../../constants/breathingExercises";

const PHASE_SCALE = { inhale: 1.35, exhale: 0.85 };

const scaleForPhase = (phase) => {
  if (phase.type === "inhale") return PHASE_SCALE.inhale;
  if (phase.type === "exhale") return PHASE_SCALE.exhale;
  return 1;
};

const vibrateForPhase = (phase) => {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(phase.type === "hold" ? 25 : 60);
  }
};

// 'select' -> 'setup' -> 'running' -> 'done'
const BreathingPage = () => {
  const [stateFilter, setStateFilter] = useState("all");
  const [exercise, setExercise] = useState(null);
  const [step, setStep] = useState("select");
  const [targetCycles, setTargetCycles] = useState(0);

  const [phaseIndex, setPhaseIndex] = useState(0);
  const [cycleCount, setCycleCount] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [circleScale, setCircleScale] = useState(1);
  const [transitionSeconds, setTransitionSeconds] = useState(1);

  const filteredExercises =
    stateFilter === "all"
      ? BREATHING_EXERCISES
      : BREATHING_EXERCISES.filter((e) => e.states.includes(stateFilter));

  const openSetup = (ex) => {
    setExercise(ex);
    setTargetCycles(ex.defaultCycles);
    setStep("setup");
  };

  // Стан для першої фази виставляється тут, у відповідь на клік — це
  // звичайний обробник події, а не ефект, тож синхронний setState тут
  // не спричиняє каскадних рендерів.
  const startSession = () => {
    const firstPhase = exercise.pattern[0];
    setPhaseIndex(0);
    setCycleCount(0);
    setSecondsLeft(firstPhase.seconds);
    setTransitionSeconds(firstPhase.seconds);
    setCircleScale(scaleForPhase(firstPhase));
    setStep("running");
  };

  const stopSession = () => {
    setStep("select");
    setExercise(null);
    setCircleScale(1);
  };

  // Один ефект на всю логіку таймера поточної фази: секундний тік для
  // відображення лічильника і таймаут переходу до наступної фази. Стан для
  // НАСТУПНОЇ фази (і лічильник циклів) виставляється всередині callback'а
  // таймауту, а не синхронно в тілі ефекту — так React не бачить тут
  // каскадного оновлення стану.
  useEffect(() => {
    if (step !== "running" || !exercise) return undefined;
    const phase = exercise.pattern[phaseIndex];

    const tickId = setInterval(() => {
      setSecondsLeft((s) => Math.max(s - 1, 0));
    }, 1000);

    const advanceId = setTimeout(() => {
      const nextIndex = (phaseIndex + 1) % exercise.pattern.length;
      const nextPhase = exercise.pattern[nextIndex];

      if (nextIndex === 0) {
        const nextCycleCount = cycleCount + 1;
        if (nextCycleCount >= targetCycles) {
          setStep("done");
          return;
        }
        setCycleCount(nextCycleCount);
      }

      setPhaseIndex(nextIndex);
      setSecondsLeft(nextPhase.seconds);
      setTransitionSeconds(nextPhase.seconds);
      setCircleScale(scaleForPhase(nextPhase));
      vibrateForPhase(nextPhase);
    }, phase.seconds * 1000);

    return () => {
      clearInterval(tickId);
      clearTimeout(advanceId);
    };
  }, [step, phaseIndex, exercise, cycleCount, targetCycles]);

  const currentPhase = exercise ? exercise.pattern[phaseIndex] : null;

  if (step === "select") {
    return (
      <div className="max-w-3xl mx-auto text-left space-y-6">
        <div className="bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] p-6">
          <h2 className="text-2xl font-extrabold text-ink mb-2">
            Дихальні вправи
          </h2>
          <p className="text-sm text-muted">
            Короткі техніки дихання, які допомагають тілу заспокоїтись за
            кілька хвилин. Обери вправу під свій стан — або переглянь усі.
            Якщо зараз дуже важко і дихання не допомагає,{" "}
            <Link to="/crisis" className="text-primary font-semibold hover:underline">
              відкрий екран підтримки
            </Link>
            .
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {EMOTIONAL_STATES.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setStateFilter(s.key)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition ${
                stateFilter === s.key
                  ? "bg-primary text-white border-transparent"
                  : "bg-surface border-border text-muted hover:border-primary hover:text-primary"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {filteredExercises.map((ex) => (
            <div
              key={ex.key}
              className="bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] p-6 flex flex-col"
            >
              <h3 className="text-lg font-extrabold text-ink mb-1">
                {ex.title}
              </h3>
              <p className="text-xs font-semibold text-primary mb-2">
                {ex.subtitle}
              </p>
              <p className="text-sm text-muted mb-4 flex-1">
                {ex.description}
              </p>
              <button
                type="button"
                onClick={() => openSetup(ex)}
                className="self-start px-5 py-2 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary-dark transition"
              >
                Обрати
              </button>
            </div>
          ))}
          {filteredExercises.length === 0 && (
            <p className="text-sm text-muted col-span-2">
              Для цього стану поки немає підібраних вправ — спробуй інший
              фільтр.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (step === "setup" && exercise) {
    return (
      <div className="max-w-lg mx-auto text-left space-y-6">
        <div className="bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] p-6">
          <h2 className="text-xl font-extrabold text-ink mb-1">
            {exercise.title}
          </h2>
          <p className="text-sm text-muted mb-4">{exercise.description}</p>

          {exercise.caution && (
            <p className="text-xs bg-accent-soft text-ink rounded-xl p-3 mb-4">
              ⚠️ {exercise.caution}
            </p>
          )}

          <p className="text-sm font-semibold text-ink mb-2">
            Скільки циклів пройти?
          </p>
          <div className="flex gap-2 mb-6">
            {exercise.cycleOptions.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setTargetCycles(n)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border transition ${
                  targetCycles === n
                    ? "bg-primary text-white border-transparent"
                    : "bg-canvas border-border text-ink hover:border-primary"
                }`}
              >
                {n}
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={startSession}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary-dark transition"
            >
              Почати
            </button>
            <button
              type="button"
              onClick={() => setStep("select")}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-canvas border border-border text-ink hover:border-primary transition"
            >
              Назад
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "running" && exercise && currentPhase) {
    return (
      <div className="max-w-lg mx-auto text-center space-y-8">
        <p className="text-sm font-semibold text-muted">
          {exercise.title} · цикл {cycleCount + 1} з {targetCycles}
        </p>

        <div className="flex justify-center py-6">
          <div
            className="w-56 h-56 rounded-full bg-primary-soft border-4 border-primary flex flex-col items-center justify-center"
            style={{
              transform: `scale(${circleScale})`,
              transitionProperty: "transform",
              transitionTimingFunction: "ease-in-out",
              transitionDuration: `${transitionSeconds}s`,
            }}
          >
            <span className="text-lg font-extrabold text-primary">
              {currentPhase.label}
            </span>
            <span className="text-4xl font-extrabold text-ink mt-1">
              {secondsLeft}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={stopSession}
          className="px-5 py-2 rounded-xl text-sm font-semibold bg-canvas border border-border text-ink hover:border-primary transition"
        >
          Завершити
        </button>
      </div>
    );
  }

  if (step === "done" && exercise) {
    return (
      <div className="max-w-lg mx-auto text-left space-y-6">
        <div className="bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] p-6 text-center">
          <span className="text-4xl">🌿</span>
          <h2 className="text-xl font-extrabold text-ink mt-3 mb-1">
            Готово
          </h2>
          <p className="text-sm text-muted">
            Ти пройшла/пройшов {targetCycles} циклів вправи «{exercise.title}
            ». Зверни увагу, чи змінилось самопочуття прямо зараз.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 justify-center">
          <button
            type="button"
            onClick={startSession}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary-dark transition"
          >
            Ще раз
          </button>
          <button
            type="button"
            onClick={() => setStep("select")}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-canvas border border-border text-ink hover:border-primary transition"
          >
            Обрати іншу вправу
          </button>
          <Link
            to="/diary"
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-canvas border border-border text-ink hover:border-primary transition"
          >
            Записати в щоденник →
          </Link>
        </div>
      </div>
    );
  }

  return null;
};

export default BreathingPage;
