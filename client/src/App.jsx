import { useSyncUser } from "./hooks/useSyncUser";
import AppRoutes from "./router/AppRoutes";

function App() {
  useSyncUser();

  return <AppRoutes />;
}

export default App;