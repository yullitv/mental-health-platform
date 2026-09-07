import { ClerkProvider } from "@clerk/clerk-react";
import { ukUA } from "@clerk/localizations";
import { useTheme } from "./ThemeContext";

// Один спільний вигляд для всіх вбудованих екранів Clerk (UserButton →
// "Manage account", verification-код при реєстрації, форма скидання
// пароля тощо) — та сама палітра й шрифт, що й решта "Опори", плюс
// українська локалізація замість дефолтної англійської.
const buildAppearance = (theme) => {
  const isDark = theme === "dark";
  return {
    variables: {
      colorPrimary: isDark ? "#8b7edb" : "#6c5dd3",
      colorBackground: isDark ? "#1f1b2c" : "#ffffff",
      colorText: isDark ? "#f1eefa" : "#241f33",
      colorTextSecondary: isDark ? "#a79fbd" : "#6b6478",
      colorInputBackground: isDark ? "#17141f" : "#f8f7fc",
      colorInputText: isDark ? "#f1eefa" : "#241f33",
      colorDanger: isDark ? "#ef6a5f" : "#e2574c",
      colorNeutral: isDark ? "#a79fbd" : "#6b6478",
      borderRadius: "0.75rem",
      fontFamily: '"Manrope", system-ui, "Segoe UI", sans-serif',
    },
    elements: {
      card: "shadow-none",
      formButtonPrimary:
        "bg-[var(--color-primary)] hover:opacity-90 text-sm normal-case font-semibold",
      footerActionLink: "text-[var(--color-primary)] hover:underline",
    },
  };
};

const ClerkThemedProvider = ({ publishableKey, children }) => {
  const { theme } = useTheme();

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      localization={ukUA}
      appearance={buildAppearance(theme)}
    >
      {children}
    </ClerkProvider>
  );
};

export default ClerkThemedProvider;
