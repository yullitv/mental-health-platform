import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { API_BASE_URL, SERVER_ORIGIN } from "../../api/config";
import { AI_STATUS_LABELS } from "../../constants/specialistVerification";

const STATUS_LABELS = {
  PENDING: { text: "На розгляді", className: "bg-accent-soft text-accent" },
  APPROVED: { text: "Підтверджено", className: "bg-primary-soft text-primary" },
  REJECTED: { text: "Відхилено", className: "bg-danger/10 text-danger" },
};

const SpecialistProfileEditPage = () => {
  const { getToken } = useAuth();
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const [form, setForm] = useState({
    bio: "",
    specializations: "",
    hourlyRate: "",
    experience: "",
    fullLegalName: "",
    licenseNumber: "",
    issuingInstitution: "",
    graduationYear: "",
  });

  const loadProfile = useCallback(async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/specialists/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Не вдалось завантажити профіль");
      const data = await response.json();
      setProfile(data);
      setForm({
        bio: data.bio || "",
        specializations: (data.specializations || []).join(", "),
        hourlyRate: data.hourlyRate ?? "",
        experience: data.experience || "",
        fullLegalName: data.fullLegalName || "",
        licenseNumber: data.licenseNumber || "",
        issuingInstitution: data.issuingInstitution || "",
        graduationYear: data.graduationYear ?? "",
      });
    } catch (err) {
      console.error("❌ Помилка завантаження профілю спеціаліста:", err);
      setError("Не вдалось завантажити профіль.");
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleChange = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError("");
    setNotice("");
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/specialists/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bio: form.bio,
          specializations: form.specializations
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          hourlyRate: form.hourlyRate === "" ? null : Number(form.hourlyRate),
          experience: form.experience,
          fullLegalName: form.fullLegalName,
          licenseNumber: form.licenseNumber,
          issuingInstitution: form.issuingInstitution,
          graduationYear:
            form.graduationYear === "" ? null : Number(form.graduationYear),
        }),
      });
      if (!response.ok) throw new Error("Не вдалось зберегти профіль");
      const data = await response.json();
      setProfile(data);
      setNotice(
        data.verificationResetToPending
          ? "Профіль збережено. Ти змінила дані верифікації — заявку повернуто на повторний розгляд адміністратором."
          : "Профіль збережено.",
      );
    } catch (err) {
      console.error("❌ Помилка збереження профілю:", err);
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUploadDocuments = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, 3);
    if (files.length === 0) return;

    setIsUploading(true);
    setError("");
    setNotice("");
    try {
      const token = await getToken();
      const formData = new FormData();
      files.forEach((file) => formData.append("documents", file));

      const response = await fetch(`${API_BASE_URL}/specialists/me/documents`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Не вдалось завантажити документи");
      }
      const data = await response.json();
      setProfile(data);
      setNotice(
        data.verificationResetToPending
          ? "Документи завантажено. AI переглянув їх попередньо, а заявку повернуто на повторний розгляд адміністратором."
          : "Документи завантажено. AI переглянув їх попередньо — остаточне рішення залишається за адміністратором.",
      );
    } catch (err) {
      console.error("❌ Помилка завантаження документів:", err);
      setError(err.message);
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleUploadPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    setError("");
    setNotice("");
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append("photo", file);

      const response = await fetch(`${API_BASE_URL}/specialists/me/photo`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Не вдалось завантажити фото");
      }
      const data = await response.json();
      setProfile(data);
      setNotice("Фото оновлено.");
    } catch (err) {
      console.error("❌ Помилка завантаження фото:", err);
      setError(err.message);
    } finally {
      setIsUploadingPhoto(false);
      e.target.value = "";
    }
  };

  if (isLoading) {
    return <p className="text-muted text-center">Завантаження...</p>;
  }

  const statusInfo = profile ? STATUS_LABELS[profile.verificationStatus] : null;

  return (
    <div className="max-w-2xl mx-auto text-left space-y-6">
      <div className="bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] p-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-extrabold text-ink">Мій профіль</h2>
          {statusInfo && (
            <span
              className={`text-xs font-semibold px-3 py-1 rounded-lg ${statusInfo.className}`}
            >
              {statusInfo.text}
            </span>
          )}
        </div>
        <p className="text-sm text-muted">
          Ці дані бачать клієнти на твоїй публічній картці, а адміністратор — під
          час розгляду заявки на верифікацію.
        </p>
      </div>

      {notice && (
        <p className="text-sm text-primary bg-primary-soft rounded-xl p-3">
          {notice}
        </p>
      )}
      {error && (
        <p className="text-sm text-danger bg-danger/10 rounded-xl p-3">{error}</p>
      )}

      <div className="bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] p-6 space-y-4">
        <h3 className="text-base font-extrabold text-ink">Фото профілю</h3>
        <p className="text-sm text-muted">
          Показується клієнтам на публічній картці. JPG, PNG або WEBP, до 3 МБ.
        </p>
        <div className="flex items-center gap-4">
          {profile?.photoUrl ? (
            <img
              src={`${SERVER_ORIGIN}${profile.photoUrl}`}
              alt="Фото профілю"
              className="w-20 h-20 rounded-full object-cover border border-border"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-canvas border border-border flex items-center justify-center text-2xl text-muted">
              👤
            </div>
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleUploadPhoto}
            disabled={isUploadingPhoto}
            className="text-sm text-muted"
          />
        </div>
        {isUploadingPhoto && (
          <p className="text-sm text-muted">Завантаження фото...</p>
        )}
      </div>

      <form
        onSubmit={handleSaveProfile}
        className="bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] p-6 space-y-4"
      >
        <h3 className="text-base font-extrabold text-ink">Публічний профіль</h3>
        <textarea
          placeholder="Коротко про себе й підхід у роботі"
          value={form.bio}
          onChange={handleChange("bio")}
          rows={4}
          className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
        />
        <input
          type="text"
          placeholder="Спеціалізації через кому: КПТ, Гештальт"
          value={form.specializations}
          onChange={handleChange("specializations")}
          className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
        />
        <textarea
          placeholder="Досвід роботи: скільки років практикуєш, де працювала раніше"
          value={form.experience}
          onChange={handleChange("experience")}
          rows={3}
          className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
        />
        <input
          type="number"
          placeholder="Рекомендований донат, грн"
          value={form.hourlyRate}
          onChange={handleChange("hourlyRate")}
          className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
        />

        <h3 className="text-base font-extrabold text-ink pt-2">
          Дані для верифікації
        </h3>
        <p className="text-xs text-muted -mt-2">
          Заповни точно як у документі про освіту/ліцензії — за цим AI звірятиме
          завантажений документ. Якщо ти вже підтверджена і зміниш ці поля,
          заявка автоматично повернеться на повторний розгляд.
        </p>
        <input
          type="text"
          placeholder="ПІБ як у документі"
          value={form.fullLegalName}
          onChange={handleChange("fullLegalName")}
          className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
        />
        <input
          type="text"
          placeholder="Номер диплома/сертифіката/ліцензії"
          value={form.licenseNumber}
          onChange={handleChange("licenseNumber")}
          className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
        />
        <input
          type="text"
          placeholder="Заклад, що видав документ"
          value={form.issuingInstitution}
          onChange={handleChange("issuingInstitution")}
          className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
        />
        <input
          type="number"
          placeholder="Рік випуску/видачі"
          value={form.graduationYear}
          onChange={handleChange("graduationYear")}
          className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
        />

        <button
          type="submit"
          disabled={isSaving}
          className="px-5 py-2 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary-dark transition disabled:opacity-50"
        >
          {isSaving ? "Збереження..." : "Зберегти профіль"}
        </button>
      </form>

      <div className="bg-surface border border-border rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] p-6 space-y-4">
        <h3 className="text-base font-extrabold text-ink">
          Документи про освіту/ліцензію
        </h3>
        <p className="text-sm text-muted">
          Диплом, сертифікат чи ліцензія — JPG, PNG, WEBP або PDF, до 5 МБ,
          максимум 3 файли за раз. Заповни ПІБ вище перед завантаженням — за ним
          AI звіряє документ.
        </p>

        {profile?.documentsUrl?.length > 0 && (
          <div className="flex flex-col gap-1">
            {profile.documentsUrl.map((url, i) => (
              <a
                key={url}
                href={`${SERVER_ORIGIN}${url}`}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-semibold text-primary hover:underline"
              >
                Документ {i + 1}
              </a>
            ))}
          </div>
        )}

        {profile?.aiScreeningStatus && (
          <div className="bg-canvas border border-border rounded-xl p-3">
            <p className="text-sm font-semibold text-ink">
              {AI_STATUS_LABELS[profile.aiScreeningStatus] ||
                "AI переглянув документ"}
            </p>
            {profile.aiScreeningNotes && (
              <p className="text-sm text-muted mt-1">
                {profile.aiScreeningNotes}
              </p>
            )}
            <p className="text-xs text-muted mt-2">
              Це попередня AI-підказка для адміністратора, не остаточне рішення.
            </p>
          </div>
        )}

        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          multiple
          onChange={handleUploadDocuments}
          disabled={isUploading}
          className="text-sm text-muted"
        />
        {isUploading && (
          <p className="text-sm text-muted">Завантаження і перевірка...</p>
        )}
      </div>
    </div>
  );
};

export default SpecialistProfileEditPage;
