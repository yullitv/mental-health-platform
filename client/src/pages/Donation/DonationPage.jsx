import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { API_BASE_URL } from "../../api/config";

const DonationPage = () => {
  const { id } = useParams();
  const { getToken } = useAuth();
  const navigate = useNavigate();

  const [fundraisers, setFundraisers] = useState([]);
  const [fundraiserId, setFundraiserId] = useState("");
  const [amount, setAmount] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadFundraisers = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/fundraisers`);
        const data = await response.json();
        setFundraisers(data);
        if (data.length > 0) setFundraiserId(data[0].id);
      } catch (err) {
        console.error("❌ Помилка завантаження фондів:", err);
      }
    };

    loadFundraisers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!fundraiserId || !proofUrl.trim()) {
      setError("Обери фонд і встав посилання на підтвердження донату");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/donations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sessionId: id,
          fundraiserId,
          amount: amount ? Number(amount) : undefined,
          proofUrl: proofUrl.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Не вдалось надіслати донат");
      }

      navigate("/dashboard");
    } catch (err) {
      console.error("❌ Помилка донату:", err);
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto text-left bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] p-6">
      <h2 className="text-2xl font-extrabold text-ink mb-2">Підтвердження донату</h2>
      <p className="text-muted mb-6">
        Сесія оплачується не спеціалісту напряму, а через донат у благодійний фонд.
        Зроби переказ на банку фонду й встав посилання на скріншот-підтвердження.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-semibold text-ink mb-1">Фонд</label>
          <select
            value={fundraiserId}
            onChange={(e) => setFundraiserId(e.target.value)}
            className="w-full border border-border rounded-xl px-3 py-2 bg-canvas"
          >
            {fundraisers.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-semibold text-ink mb-1">Сума (грн, необов'язково)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full border border-border rounded-xl px-3 py-2 bg-canvas"
            placeholder="500"
          />
        </div>

        <div>
          <label className="block font-semibold text-ink mb-1">
            Посилання на скріншот підтвердження
          </label>
          <input
            type="url"
            value={proofUrl}
            onChange={(e) => setProofUrl(e.target.value)}
            className="w-full border border-border rounded-xl px-3 py-2 bg-canvas"
            placeholder="https://..."
            required
          />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-primary text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary-dark transition disabled:opacity-50"
        >
          {isSubmitting ? "Надсилаємо..." : "Надіслати на підтвердження"}
        </button>
      </form>
    </div>
  );
};

export default DonationPage;