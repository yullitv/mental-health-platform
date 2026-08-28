import { SignedOut, SignUpButton } from "@clerk/clerk-react";
import WelcomeMessage from "../../components/shared/WelcomeMessage";

const HomePage = () => {
  return (
    <div className="text-center px-4 pt-8">
      <h1 className="text-4xl font-extrabold text-ink mb-4 tracking-tight">
        Опора
      </h1>
      <p className="text-muted max-w-md mx-auto">
        Твій персональний простір для емоційного балансу та підтримки.
      </p>

      <SignedOut>
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center max-w-lg mx-auto">
          <SignUpButton
            mode="modal"
            unsafeMetadata={{ intendedRole: "CLIENT" }}
          >
            <button className="flex-1 bg-primary text-white px-6 py-4 rounded-2xl font-semibold hover:bg-primary-dark transition">
              Я шукаю підтримку
            </button>
          </SignUpButton>
          <SignUpButton
            mode="modal"
            unsafeMetadata={{ intendedRole: "SPECIALIST" }}
          >
            <button className="flex-1 bg-surface border border-border text-ink px-6 py-4 rounded-2xl font-semibold hover:bg-border/40 transition">
              Я спеціаліст
            </button>
          </SignUpButton>
        </div>
      </SignedOut>

      <WelcomeMessage />
    </div>
  );
};

export default HomePage;
