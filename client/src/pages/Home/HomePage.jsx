import WelcomeMessage from "../../components/shared/WelcomeMessage";

const HomePage = () => {
  return (
    <div className="text-center px-4 pt-8">
      <h1 className="text-4xl font-bold text-gray-800 mb-4">
        Mental Health Platform
      </h1>
      <p className="text-gray-600 max-w-md mx-auto">
        Твій персональний простір для емоційного балансу та підтримки.
      </p>

      <WelcomeMessage />
    </div>
  );
};

export default HomePage;