import { useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../api/config";

const CONCERN_OPTIONS = [
  { value: "anxiety", label: "Тривожність" },
  { value: "stress", label: "Стрес" },
  { value: "relationships", label: "Стосунки" },
  { value: "sleep", label: "Сон" },
  { value: "self_esteem", label: "Самооцінка" },
  { value: "grief", label: "Втрата / горе" },
  { value: "other", label: "Інше" },
];

const GENDER_OPTIONS = [
  { value: "female", label: "Жінка" },
  { value: "male", label: "Чоловік" },
  { value: "no_preference", label: "Не має значення" },
];

const URGENCY_OPTIONS = [
  { value: "low", label: "Можу почекати" },
  { value: "medium", label: "Бажано найближчим часом" },
  { value: "high", label: "Потрібна підтримка якнайшвидше" },
];

const OnboardingPage = () => {
  const { getToken } = useAuth();
  const navigate = useNavigate();

  const [concerns, setConcerns] = useState([]);
  const [preferredGender, setPreferredGender] = useState("no_preference");
  const [urgencyLevel, setUrgencyLevel] = useState("medium");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const toggleConcern = (value) => {
    setConcerns((prev) =>
      prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (concerns.length === 0) {
      setError("Обери хоча б один пункт");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/onboarding`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ concerns, preferredGender, urgencyLevel }),
      });

      if (!response.ok) {
        throw new Error("Не вдалось зберегти анкету");
      }

      navigate("/dashboard");
    } catch (err) {
      console.error("❌ Помилка збереження анкети:", err);
      setError("Щось пішло не так. Спробуй ще раз.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto text-left bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] p-6">
      <h2 className="text-2xl font-extrabold text-ink mb-2">Коротка анкета</h2>
      <p className="text-muted mb-6">
        Це допоможе нам підібрати найбільш відповідного спеціаліста для тебе.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <p className="font-semibold text-ink mb-2">Що тебе турбує?</p>
          <div className="flex flex-wrap gap-2">
            {CONCERN_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => toggleConcern(option.value)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border transition ${
                  concerns.includes(option.value)
                    ? "bg-primary text-white border-primary"
                    : "bg-canvas text-muted border-border hover:border-primary"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="font-semibold text-ink mb-2">Бажана стать спеціаліста</p>
          <div className="flex gap-2">
            {GENDER_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setPreferredGender(option.value)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border transition ${
                  preferredGender === option.value
                    ? "bg-primary text-white border-primary"
                    : "bg-canvas text-muted border-border hover:border-primary"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="font-semibold text-ink mb-2">Наскільки терміново?</p>
          <div className="flex flex-col sm:flex-row gap-2">
            {URGENCY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setUrgencyLevel(option.value)}
                className={`flex-1 px-4 py-2 rounded-xl text-sm font-semibold border transition ${
                  urgencyLevel === option.value
                    ? "bg-primary text-white border-primary"
                    : "bg-canvas text-muted border-border hover:border-primary"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-primary text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary-dark transition disabled:opacity-50"
        >
          {isSubmitting ? "Зберігаємо..." : "Зберегти й перейти в кабінет"}
        </button>
      </form>
    </div>
  );
};

export default OnboardingPage;