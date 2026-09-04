import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { API_BASE_URL } from "../../api/config";
import { getPaymentCode } from "../../utils/paymentCode";

const DonationPage = () => {
  const { id } = useParams();
  const { getToken } = useAuth();
  const navigate = useNavigate();

  const [fundraisers, setFundraisers] = useState([]);
  const [fundraiserId, setFundraiserId] = useState("");
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Заповнюється після подачі заяви на донат, якщо банк одразу не
  // підтвердив переказ автоматично — тоді показуємо запасний крок:
  // довантажити скрін для ручної перевірки.
  const [pendingDonationId, setPendingDonationId] = useState(null);
  const [proofFile, setProofFile] = useState(null);
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);
  const [proofError, setProofError] = useState("");
  const [proofSent, setProofSent] = useState(false);

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

  const selectedFundraiser = fundraisers.find((f) => f.id === fundraiserId);
  const paymentCode = getPaymentCode(id);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!fundraiserId) {
      setError("Обери банку");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setError("Вкажи суму донату — вона потрібна для звірки з банком");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append("sessionId", id);
      formData.append("fundraiserId", fundraiserId);
      formData.append("amount", amount);

      const response = await fetch(`${API_BASE_URL}/donations`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Не вдалось надіслати донат");
      }

      if (data.status === "CONFIRMED") {
        navigate("/dashboard");
      } else {
        // Банк не підтвердив автоматично — пропонуємо довантажити скрін.
        setPendingDonationId(data.id);
      }
    } catch (err) {
      console.error("❌ Помилка донату:", err);
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProofSubmit = async (e) => {
    e.preventDefault();
    setProofError("");

    if (!proofFile) {
      setProofError("Додай файл скріншота");
      return;
    }

    setIsSubmittingProof(true);
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append("proof", proofFile);

      const response = await fetch(
        `${API_BASE_URL}/donations/${pendingDonationId}/proof`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Не вдалось надіслати скрін");
      }

      if (data.status === "CONFIRMED") {
        navigate("/dashboard");
      } else {
        setProofSent(true);
      }
    } catch (err) {
      console.error("❌ Помилка надсилання скріна:", err);
      setProofError(err.message);
    } finally {
      setIsSubmittingProof(false);
    }
  };

  if (proofSent) {
    return (
      <div className="max-w-xl mx-auto text-left bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] p-6">
        <h2 className="text-2xl font-extrabold text-ink mb-2">Скрін надіслано</h2>
        <p className="text-muted mb-4">
          Дякуємо! Спеціаліст або адмін перевірить підтвердження вручну, і сесія
          з'явиться в кабінеті після підтвердження.
        </p>
        <button
          onClick={() => navigate("/dashboard")}
          className="bg-primary text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary-dark transition"
        >
          До кабінету
        </button>
      </div>
    );
  }

  if (pendingDonationId) {
    return (
      <div className="max-w-xl mx-auto text-left bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] p-6">
        <h2 className="text-2xl font-extrabold text-ink mb-2">
          Не вдалось підтвердити автоматично
        </h2>
        <p className="text-muted mb-6">
          Банк поки не знайшов твій переказ у виписці — можливо, він ще не встиг
          відобразитись, або код у коментарі не збігся. Довантaж скріншот
          підтвердження, щоб спеціаліст або адмін перевірили вручну.
        </p>

        <form onSubmit={handleProofSubmit} className="space-y-4">
          <div>
            <label className="block font-semibold text-ink mb-1">
              Скріншот підтвердження (JPG, PNG, WEBP або PDF, до 5 МБ)
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(e) => setProofFile(e.target.files?.[0] || null)}
              className="w-full border border-border rounded-xl px-3 py-2 bg-canvas"
              required
            />
          </div>

          {proofError && <p className="text-red-500 text-sm">{proofError}</p>}

          <button
            type="submit"
            disabled={isSubmittingProof}
            className="w-full bg-primary text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary-dark transition disabled:opacity-50"
          >
            {isSubmittingProof ? "Надсилаємо..." : "Надіслати скрін"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto text-left bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] p-6">
      <h2 className="text-2xl font-extrabold text-ink mb-2">Підтвердження донату</h2>
      <p className="text-muted mb-6">
        Сесія оплачується не спеціалісту напряму, а через донат на благодійну банку.
        Зроби переказ і натисни кнопку нижче — ми спробуємо підтвердити його
        автоматично.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-semibold text-ink mb-1">Банка</label>
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

        {selectedFundraiser?.bankJarUrl && (
          <div className="bg-canvas border border-border rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                selectedFundraiser.bankJarUrl
              )}`}
              alt="QR-код банки фонду"
              className="w-32 h-32 rounded-lg border border-border bg-white p-1 shrink-0"
            />
            <div className="text-center sm:text-left">
              <p className="text-sm text-muted mb-2">
                Відскануй QR-код або перейди за посиланням, щоб зробити переказ на банку.
              </p>
              <a
                href={selectedFundraiser.bankJarUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-block bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-primary-dark transition"
              >
                Перейти до банки
              </a>
            </div>
          </div>
        )}

        {selectedFundraiser?.bankJarUrl && (
          <div className="bg-canvas border border-border rounded-xl p-4">
            <p className="text-sm text-muted mb-1">
              Щоб ми напевно розпізнали саме твій переказ (навіть якщо хтось ще
              донатить таку саму суму), вкажи цей код у коментарі до переказу:
            </p>
            <p className="text-2xl font-extrabold tracking-widest text-ink text-center bg-white border border-border rounded-lg py-2">
              {paymentCode}
            </p>
            <p className="text-xs text-muted mt-1">
              Це не обов'язково — без коду переказ теж перевірять, просто трохи
              повільніше.
            </p>
          </div>
        )}

        <div>
          <label className="block font-semibold text-ink mb-1">Сума (грн)</label>
          <input
            type="number"
            min="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full border border-border rounded-xl px-3 py-2 bg-canvas"
            placeholder="500"
            required
          />
          <p className="text-xs text-muted mt-1">
            Вкажи суму так, як ти її перекажеш — ми звіримо її з реальним переказом
            у банку.
          </p>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-primary text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary-dark transition disabled:opacity-50"
        >
          {isSubmitting ? "Перевіряємо..." : "Я зробив(ла) переказ"}
        </button>
      </form>
    </div>
  );
};

export default DonationPage;
