import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { API_BASE_URL, SERVER_ORIGIN } from "../../api/config";
import { AI_STATUS_LABELS } from "../../constants/specialistVerification";
import { DONATION_AI_STATUS_LABELS } from "../../constants/donationVerification";

const AdminPage = () => {
  const { getToken } = useAuth();
  const [pending, setPending] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const [pendingDonations, setPendingDonations] = useState([]);
  const [isLoadingDonations, setIsLoadingDonations] = useState(true);
  const [donationsError, setDonationsError] = useState("");
  const [donationBusyId, setDonationBusyId] = useState(null);

  const loadPending = useCallback(async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/specialists/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Не вдалось завантажити заявки");
      setPending(await response.json());
    } catch (err) {
      console.error("❌ Помилка адмін-панелі:", err);
      setError("Не вдалось завантажити заявки.");
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  // Адмін бачить усі донати на розгляді (не лише свої сесії, як спеціаліст) —
  // бекенд (GET /donations/pending) уже це підтримує, тут просто відкриваємо
  // це в інтерфейсі.
  const loadPendingDonations = useCallback(async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/donations/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Не вдалось завантажити донати");
      setPendingDonations(await response.json());
    } catch (err) {
      console.error("❌ Помилка завантаження донатів:", err);
      setDonationsError("Не вдалось завантажити донати.");
    } finally {
      setIsLoadingDonations(false);
    }
  }, [getToken]);

  useEffect(() => {
    loadPending();
    loadPendingDonations();
  }, [loadPending, loadPendingDonations]);

  const handleVerify = async (id, status) => {
    setBusyId(id);
    setError("");
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/specialists/${id}/verify`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Не вдалось обробити заявку");
      }
      await loadPending();
    } catch (err) {
      console.error("❌ Помилка верифікації:", err);
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleDonationAction = async (id, action) => {
    setDonationBusyId(id);
    setDonationsError("");
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/donations/${id}/${action}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Не вдалось обробити донат");
      }
      await loadPendingDonations();
    } catch (err) {
      console.error("❌ Помилка обробки донату:", err);
      setDonationsError(err.message);
    } finally {
      setDonationBusyId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto text-left space-y-6">
    <div className="bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] p-6">
      <h2 className="text-2xl font-extrabold text-ink mb-4">
        Заявки спеціалістів на верифікацію
      </h2>

      {isLoading && <p className="text-muted">Завантаження...</p>}
      {error && <p className="text-red-500 mb-2">{error}</p>}
      {!isLoading && !error && pending.length === 0 && (
        <p className="text-muted">Заявок на розгляді немає.</p>
      )}

      <div className="flex flex-col gap-4">
        {pending.map((specialist) => (
          <div
            key={specialist.id}
            className="bg-canvas border border-border rounded-xl p-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <div className="flex items-center gap-3">
                  {specialist.photoUrl ? (
                    <img
                      src={`${SERVER_ORIGIN}${specialist.photoUrl}`}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover border border-border shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-canvas border border-border flex items-center justify-center text-base text-muted shrink-0">
                      👤
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-ink">
                      {specialist.user?.firstName} {specialist.user?.lastName}
                    </p>
                    <p className="text-sm text-muted">{specialist.user?.email}</p>
                  </div>
                </div>
                {specialist.bio && (
                  <p className="text-sm text-ink mt-2">{specialist.bio}</p>
                )}
                {specialist.specializations?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {specialist.specializations.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs font-semibold bg-primary-soft text-primary px-2 py-1 rounded-lg"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {specialist.hourlyRate != null && (
                  <p className="text-sm text-muted mt-2">
                    Рекомендований донат: {specialist.hourlyRate} грн
                  </p>
                )}

                {(specialist.fullLegalName ||
                  specialist.licenseNumber ||
                  specialist.issuingInstitution ||
                  specialist.graduationYear) && (
                  <div className="text-sm text-ink mt-2 bg-canvas border border-border rounded-lg p-3 space-y-1">
                    {specialist.fullLegalName && (
                      <p>
                        <span className="text-muted">ПІБ у документі:</span>{" "}
                        {specialist.fullLegalName}
                      </p>
                    )}
                    {specialist.licenseNumber && (
                      <p>
                        <span className="text-muted">Номер документа:</span>{" "}
                        {specialist.licenseNumber}
                      </p>
                    )}
                    {specialist.issuingInstitution && (
                      <p>
                        <span className="text-muted">Заклад:</span>{" "}
                        {specialist.issuingInstitution}
                      </p>
                    )}
                    {specialist.graduationYear && (
                      <p>
                        <span className="text-muted">Рік видачі:</span>{" "}
                        {specialist.graduationYear}
                      </p>
                    )}
                  </div>
                )}

                {specialist.documentsUrl?.length > 0 && (
                  <div className="flex flex-col gap-1 mt-2">
                    {specialist.documentsUrl.map((url, i) => (
                      <a
                        key={url}
                        href={url.startsWith("http") ? url : `${SERVER_ORIGIN}${url}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-semibold text-primary hover:underline"
                      >
                        Документ {i + 1}
                      </a>
                    ))}
                  </div>
                )}

                {specialist.aiScreeningStatus && (
                  <div className="mt-2 bg-accent-soft border border-border rounded-lg p-3">
                    <p className="text-sm font-semibold text-ink">
                      {AI_STATUS_LABELS[specialist.aiScreeningStatus] ||
                        "AI переглянув документ"}
                    </p>
                    {specialist.aiScreeningNotes && (
                      <p className="text-sm text-muted mt-1">
                        {specialist.aiScreeningNotes}
                      </p>
                    )}
                    <p className="text-xs text-muted mt-2">
                      Попередня AI-підказка, не остаточне рішення — рішення приймаєш ти.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => handleVerify(specialist.id, "APPROVED")}
                  disabled={busyId === specialist.id}
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary-dark transition disabled:opacity-50"
                >
                  Підтвердити
                </button>
                <button
                  onClick={() => handleVerify(specialist.id, "REJECTED")}
                  disabled={busyId === specialist.id}
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-canvas border border-border text-ink hover:border-red-400 transition disabled:opacity-50"
                >
                  Відхилити
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>

    <div className="bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] p-6">
      <h2 className="text-2xl font-extrabold text-ink mb-4">Донати на розгляді</h2>

      {isLoadingDonations && <p className="text-muted">Завантаження...</p>}
      {donationsError && <p className="text-red-500 mb-2">{donationsError}</p>}
      {!isLoadingDonations && !donationsError && pendingDonations.length === 0 && (
        <p className="text-muted">Донатів на розгляді немає.</p>
      )}

      <div className="flex flex-col gap-3">
        {pendingDonations.map((donation) => (
          <div
            key={donation.id}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-canvas border border-border rounded-xl p-4"
          >
            <div>
              <p className="font-semibold text-ink">
                {donation.session?.client?.firstName} {donation.session?.client?.lastName}
              </p>
              <p className="text-sm text-muted">
                {donation.amount ? `${donation.amount} грн · ` : ""}
                {donation.fundraiser?.name}
              </p>
              {donation.proofUrl ? (
                <a
                  href={
                    donation.proofUrl?.startsWith("http")
                      ? donation.proofUrl
                      : `${SERVER_ORIGIN}${donation.proofUrl}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-primary hover:underline"
                >
                  Переглянути підтвердження
                </a>
              ) : (
                <p className="text-sm text-muted italic">
                  Клієнт ще не додав скрін — очікуємо або автоматичне
                  підтвердження банком, або скрін для ручної перевірки.
                </p>
              )}
              {donation.bankConfirmed && (
                <p className="text-xs font-semibold text-primary mt-1">
                  ✅ Підтверджено реальним переказом у банці фонду
                </p>
              )}
              {donation.aiScreeningStatus && (
                <p
                  className={`text-xs mt-1 ${
                    donation.aiScreeningStatus === "OK" ? "text-muted" : "text-accent"
                  }`}
                >
                  {DONATION_AI_STATUS_LABELS[donation.aiScreeningStatus] ||
                    donation.aiScreeningStatus}
                  {donation.extractedAmount != null &&
                    ` (AI прочитав: ${donation.extractedAmount} грн)`}
                </p>
              )}
              {donation.aiScreeningNotes && (
                <p className="text-xs text-muted mt-0.5">{donation.aiScreeningNotes}</p>
              )}
            </div>
            <div className="flex gap-2">
              {donation.proofUrl && (
                <button
                  onClick={() => handleDonationAction(donation.id, "confirm")}
                  disabled={donationBusyId === donation.id}
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary-dark transition disabled:opacity-50"
                >
                  Підтвердити
                </button>
              )}
              <button
                onClick={() => handleDonationAction(donation.id, "reject")}
                disabled={donationBusyId === donation.id}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-canvas border border-border text-ink hover:border-red-400 transition disabled:opacity-50"
              >
                Відхилити
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
    </div>
  );
};

export default AdminPage;