import { useUser, SignedIn } from "@clerk/clerk-react";

const WelcomeMessage = () => {
  const { user } = useUser();

  return (
    <SignedIn>
      <div className="mt-8 p-5 bg-surface rounded-2xl shadow-[0_12px_28px_rgba(36,31,51,0.06)] border border-border">
        <p className="text-ink font-semibold">
          Вітаємо, {user?.firstName || "користувачу"}! Ти в системі. ✨
        </p>
      </div>
    </SignedIn>
  );
};

export default WelcomeMessage;
