import { SignedIn, UserButton } from "@clerk/clerk-react";
import { useTheme } from "../../context/ThemeContext";

const Header = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="p-4 w-full flex justify-between items-center bg-surface border-b border-border absolute top-0">
      <div className="flex items-center gap-2">
        <svg width="26" height="29" viewBox="0 0 100 112" fill="none">
          <ellipse cx="50" cy="88" rx="34" ry="17" transform="rotate(-6 50 88)" fill="#5A4CC0" />
          <ellipse cx="48" cy="64" rx="26" ry="14" transform="rotate(8 48 64)" fill="#6C5DD3" stroke="white" strokeWidth="3.5" />
          <ellipse cx="51" cy="44" rx="18" ry="10" transform="rotate(-8 51 44)" fill="#8B7EDB" stroke="white" strokeWidth="3.5" />
          <ellipse cx="49" cy="27" rx="13" ry="10" transform="rotate(10 49 27)" fill="#E2A24C" stroke="white" strokeWidth="3.5" />
        </svg>
        <span className="font-extrabold text-xl text-ink tracking-tight">Опора</span>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={
            theme === "dark" ? "Увімкнути світлу тему" : "Увімкнути темну тему"
          }
          title={
            theme === "dark" ? "Увімкнути світлу тему" : "Увімкнути темну тему"
          }
          className="w-9 h-9 flex items-center justify-center rounded-full border border-border bg-canvas text-ink hover:bg-primary-soft hover:text-primary transition"
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
        <SignedIn>
          <UserButton afterSignOutUrl="/" />
        </SignedIn>
      </div>
    </header>
  );
};

export default Header;
