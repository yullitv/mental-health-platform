import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { API_BASE_URL } from "../../api/config";

const ReviewPage = () => {
  const { id: sessionId } = useParams();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating) {
      setError("Постав оцінку від 1 до 5.");
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sessionId,
          rating,
          comment: comment.trim() || undefined,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Не вдалось надіслати відгук");
      }
      navigate("/dashboard");
    } catch (err) {
      console.error("❌ Помилка відгуку:", err);
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto text-left bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] p-6">
      <h2 className="text-2xl font-extrabold text-ink mb-4">Залишити відгук</h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <p className="text-sm font-semibold text-ink mb-2">Оцінка</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="text-3xl leading-none transition"
                aria-label={`${star} з 5`}
              >
                <span
                  className={
                    star <= (hoverRating || rating)
                      ? "text-amber-400"
                      : "text-border"
                  }
                >
                  ★
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-ink mb-2 block">
            Коментар (необов'язково)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            className="w-full border border-border rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Поділись враженнями від сесії..."
          />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="px-5 py-2 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary-dark transition disabled:opacity-50"
        >
          Надіслати відгук
        </button>
      </form>
    </div>
  );
};

export default ReviewPage;