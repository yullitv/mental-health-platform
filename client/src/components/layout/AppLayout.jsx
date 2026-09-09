import { Outlet, NavLink, Link } from "react-router-dom";
import Header from "./Header";
import { useCurrentUser } from "../../context/CurrentUserContext";
import { useNotifications } from "../../context/NotificationContext";

// "Головна" (лендинг з описом платформи) доступна і залогіненим - вона
// більше не редіректить одразу на "/dashboard" (див. HomePage.jsx).
const baseNavItems = [
  { to: "/", label: "Головна" },
  { to: "/dashboard", label: "Кабінет" },
  { to: "/specialists", label: "Спеціалісти" },
  { to: "/notifications", label: "Сповіщення" },
];

// Гість (не залогінена людина): "Головна" + те, що реально доступне без
// акаунту - перегляд спеціалістів і кризова підтримка. "Кабінет"/
// "Сповіщення" без логіну однаково нікуди не ведуть (ProtectedRoute
// поверне на "/").
const guestNavItems = [
  { to: "/", label: "Головна" },
  { to: "/specialists", label: "Спеціалісти" },
  { to: "/crisis", label: "Потрібна допомога" },
];

const AppLayout = () => {
  const { dbUser } = useCurrentUser();
  const { unreadCount } = useNotifications();

  let navItems = dbUser ? baseNavItems : guestNavItems;
  if (dbUser?.role === "ADMIN") {
    // "Кабінет" (сесії клієнта/спеціаліста) - не про роль адміна, його
    // робочий простір це "Адмін-панель". "Спеціалісти" лишаємо - корисно
    // звірити, як публічний профіль виглядає після підтвердження
    // (SpecialistDetailPage сама ховає бронювання для адміна).
    navItems = [
      ...baseNavItems.filter((item) => item.to !== "/dashboard"),
      { to: "/admin", label: "Адмін-панель" },
    ];
  } else if (dbUser?.role === "CLIENT") {
    // Інструменти самодопомоги (щоденник, тести, дихання тощо) згруповані
    // в одну сторінку "Інструменти" (ToolsPage.jsx) - окремий пункт меню
    // поруч з іншими, а не 7 окремих пунктів чи підрозділ "Кабінету".
    navItems = [
      ...baseNavItems.slice(0, 2),
      { to: "/tools", label: "Інструменти" },
      ...baseNavItems.slice(2),
    ];
  } else if (dbUser?.role === "SPECIALIST") {
    // "Спеціалісти" - це бронювання ІНШИХ спеціалістів, спеціалісту в його
    // власній роботі не потрібне.
    navItems = [
      ...baseNavItems.filter((item) => item.to !== "/specialists"),
      { to: "/specialist-profile", label: "Профіль і верифікація" },
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

      {(!dbUser || dbUser.role === "CLIENT") && (
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
