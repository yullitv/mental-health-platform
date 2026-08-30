import { useEffect, useState } from "react";
import { Outlet, NavLink } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import Header from "./Header";
import { useCurrentUser } from "../../context/CurrentUserContext";
import { API_BASE_URL } from "../../api/config";

const baseNavItems = [
  { to: "/", label: "Головна" },
  { to: "/dashboard", label: "Кабінет" },
  { to: "/specialists", label: "Спеціалісти" },
  { to: "/diary", label: "Щоденник" },
  { to: "/notifications", label: "Сповіщення" },
];

const AppLayout = () => {
  const { dbUser } = useCurrentUser();
  const { getToken, isSignedIn } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  let navItems = baseNavItems;
  if (dbUser?.role === "ADMIN") {
    navItems = [...baseNavItems, { to: "/admin", label: "Адмін-панель" }];
  } else if (dbUser?.role === "CLIENT") {
    navItems = [...baseNavItems, { to: "/onboarding", label: "Анкета" }];
  }

  useEffect(() => {
    if (!isSignedIn) return;

    const loadUnreadCount = async () => {
      try {
        const token = await getToken();
        const response = await fetch(`${API_BASE_URL}/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return;
        const data = await response.json();
        setUnreadCount(data.filter((n) => !n.isRead).length);
      } catch (err) {
        console.error("❌ Помилка завантаження сповіщень:", err);
      }
    };

    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 15000);
    return () => clearInterval(interval);
  }, [isSignedIn, getToken]);

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <Header />

      <nav className="pt-20 pb-4 px-4 flex gap-2 justify-center flex-wrap">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `relative px-4 py-2 rounded-xl text-sm font-semibold transition ${
                isActive
                  ? "bg-primary text-white"
                  : "bg-surface text-muted border border-border hover:bg-primary-soft hover:text-primary"
              }`
            }
          >
            {item.label}
            {item.to === "/notifications" && unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {unreadCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <main className="flex-1 px-4 pb-8">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;