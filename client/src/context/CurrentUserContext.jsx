import { createContext, useContext, useEffect, useState } from "react";
import { useUser, useAuth } from "@clerk/clerk-react";
import { API_BASE_URL } from "../api/config";

const CurrentUserContext = createContext({ dbUser: null, isLoading: true });

export const CurrentUserProvider = ({ children }) => {
  const { user, isLoaded: clerkLoaded } = useUser();
  const { getToken } = useAuth();
  const [dbUser, setDbUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const syncUser = async () => {
      if (!clerkLoaded) return;

      if (!user) {
        setDbUser(null);
        setIsLoading(false);
        return;
      }

      try {
        const token = await getToken();
        const response = await fetch(`${API_BASE_URL}/auth/sync`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            email: user.primaryEmailAddress?.emailAddress,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.unsafeMetadata?.intendedRole,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setDbUser(data);
          console.log("✅ Користувач синхронізований з Neon, роль:", data.role);
        }
      } catch (err) {
        console.error("❌ Помилка синхронізації:", err);
      } finally {
        setIsLoading(false);
      }
    };

    syncUser();
  }, [user, clerkLoaded, getToken]);

  return (
    <CurrentUserContext.Provider value={{ dbUser, isLoading }}>
      {children}
    </CurrentUserContext.Provider>
  );
};

export const useCurrentUser = () => useContext(CurrentUserContext);
