import { Navigate, Outlet } from "react-router-dom";
import { useCurrentUser } from "../../context/CurrentUserContext";

const RoleRoute = ({ allow }) => {
  const { dbUser, isLoading } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted">
        Завантаження...
      </div>
    );
  }

  if (!dbUser || !allow.includes(dbUser.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default RoleRoute;
