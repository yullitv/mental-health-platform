import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react";

const Header = () => {
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
      <div>
        <SignedOut>
          <SignInButton mode="modal">
            <button className="bg-primary text-white px-4 py-2 rounded-xl font-semibold hover:bg-primary-dark transition">
              Увійти
            </button>
          </SignInButton>
        </SignedOut>
        <SignedIn>
          <UserButton afterSignOutUrl="/" />
        </SignedIn>
      </div>
    </header>
  );
};

export default Header;
