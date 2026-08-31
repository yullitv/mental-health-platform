import { Outlet, NavLink, Link } from "react-router-dom";
import Header from "./Header";
import { useCurrentUser } from "../../context/CurrentUserContext";
import { useNotifications } from "../../context/NotificationContext";

const baseNavItems = [
  { to: "/", label: "Головна" },
  { to: "/dashboard", label: "Кабінет" },
  { to: "/specialists", label: "Спеціалісти" },
  { to: "/notifications", label: "Сповіщення" },
];

const AppLayout = () => {
  const { dbUser } = useCurrentUser();
  const { unreadCount } = useNotifications();

  let navItems = baseNavItems;
  if (dbUser?.role === "ADMIN") {
    navItems = [...baseNavItems, { to: "/admin", label: "Адмін-панель" }];
  } else if (dbUser?.role === "CLIENT") {
    navItems = [
      ...baseNavItems,
      { to: "/diary", label: "Щоденник" },
      { to: "/thought-analysis", label: "Аналіз думки" },
      { to: "/screening", label: "Тести" },
      { to: "/breathing", label: "Дихання" },
      { to: "/companion", label: "AI-розмова" },
      { to: "/safety-plan", label: "Аптечка" },
      { to: "/privacy", label: "Приватність" },
      { to: "/onboarding", label: "Анкета" },
    ];
  }

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

      {dbUser?.role === "CLIENT" && (
        <Link
          to="/crisis"
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-full text-sm font-semibold bg-danger text-white shadow-[0_8px_20px_rgba(226,87,76,0.35)] hover:bg-danger/90 transition"
        >
          🤍 Потрібна допомога
        </Link>
      )}
    </div>
  );
};

export default AppLayout;