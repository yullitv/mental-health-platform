import AppRoutes from "./router/AppRoutes";
import AppLockGate from "./components/lock/AppLockGate";

function App() {
  return (
    <AppLockGate>
      <AppRoutes />
    </AppLockGate>
  );
}

export default App;
