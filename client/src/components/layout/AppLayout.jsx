import { Outlet, NavLink } from "react-router-dom";
import Header from "./Header";

const navItems = [
  { to: "/", label: "Головна" },
  { to: "/dashboard", label: "Кабінет" },
  { to: "/specialists", label: "Спеціалісти" },
  { to: "/diary", label: "Щоденник" },
  { to: "/chat", label: "Чат" },
];

const AppLayout = () => {
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
              `px-4 py-2 rounded-xl text-sm font-semibold transition ${
                isActive
                  ? "bg-primary text-white"
                  : "bg-surface text-muted border border-border hover:bg-primary-soft hover:text-primary"
              }`
            }
          >
            {item.label}
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
