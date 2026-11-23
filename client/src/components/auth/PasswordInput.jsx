import { useState } from "react";

const EyeIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a17.7 17.7 0 0 1-3.2 4.2" />
    <path d="M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    <path d="M2 2l20 20" />
  </svg>
);

const PasswordInput = ({ value, onChange, placeholder, minLength, autoComplete, invalid = false }) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        required
        minLength={minLength}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        aria-invalid={invalid}
        className={`w-full rounded-xl border bg-canvas pl-4 pr-11 py-2.5 text-sm text-ink focus:outline-none ${
          invalid ? "border-danger focus:border-danger" : "border-border focus:border-primary"
        }`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Сховати пароль" : "Показати пароль"}
        title={visible ? "Сховати пароль" : "Показати пароль"}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-muted hover:text-primary"
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
};

export default PasswordInput;
