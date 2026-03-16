import { useUser, SignedIn } from "@clerk/clerk-react";

const WelcomeMessage = () => {
  const { user } = useUser();

  return (
    <SignedIn>
      <div className="mt-8 p-4 bg-white rounded-xl shadow-sm border border-green-100 animate-fade-in">
        <p className="text-green-700 font-medium">
          Вітаємо, {user?.firstName || "користувачу"}! Ти в системі. ✨
        </p>
      </div>
    </SignedIn>
  );
};

export default WelcomeMessage;