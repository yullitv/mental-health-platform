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

      <WelcomeMessage />
    </div>
  );
};

export default HomePage;
