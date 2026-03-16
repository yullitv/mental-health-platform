import Header from "./components/Header";
import WelcomeMessage from "./components/WelcomeMessage";
import { useSyncUser } from "./hooks/useSyncUser";

function App() {
  // Викликаємо наш магічний хук
  useSyncUser();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <Header />
      
      <main className="text-center px-4">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          Mental Health Platform
        </h1>
        <p className="text-gray-600 max-w-md mx-auto">
          Твій персональний простір для емоційного балансу та підтримки.
        </p>
        
        <WelcomeMessage />
        
        {/* Сюди ми скоро додамо форму щоденника */}
      </main>
    </div>
  );
}

export default App;