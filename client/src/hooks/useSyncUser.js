import { useEffect } from "react";
import { useUser, useAuth } from "@clerk/clerk-react";
import { API_BASE_URL } from "../api/config";

export const useSyncUser = () => {
  const { user } = useUser();
  const { getToken } = useAuth();

  useEffect(() => {
    const syncUser = async () => {
      if (!user) return;

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
          }),
        });

        if (response.ok) {
          console.log("✅ Користувач синхронізований з Neon");
        }
      } catch (err) {
        console.error("❌ Помилка синхронізації:", err);
      }
    };

    syncUser();
  }, [user, getToken]);
};