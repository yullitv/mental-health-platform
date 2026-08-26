import { Routes, Route } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import ProtectedRoute from "../components/layout/ProtectedRoute";
import HomePage from "../pages/Home/HomePage";
import DashboardPage from "../pages/Dashboard/DashboardPage";
import SpecialistsPage from "../pages/Specialists/SpecialistsPage";
import DiaryPage from "../pages/Diary/DiaryPage";
import ChatPage from "../pages/Chat/ChatPage";
import AdminPage from "../pages/Admin/AdminPage";
import NotFoundPage from "../pages/NotFound/NotFoundPage";

const AppRoutes = () => {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/specialists" element={<SpecialistsPage />} />
          <Route path="/diary" element={<DiaryPage />} />
          <Route path="/chat" element={<ChatPage />} />
          {/* TODO: коли зробимо синхронізацію ролі з бекенду на фронтенд,
              /admin винесемо в окремий Route з перевіркою role === "ADMIN" */}
          <Route path="/admin" element={<AdminPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes;