import { Routes, Route } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import ProtectedRoute from "../components/layout/ProtectedRoute";
import RoleRoute from "../components/layout/RoleRoute";
import HomePage from "../pages/Home/HomePage";
import DashboardPage from "../pages/Dashboard/DashboardPage";
import SpecialistsPage from "../pages/Specialists/SpecialistsPage";
import SpecialistDetailPage from "../pages/Specialists/SpecialistDetailPage";
import DiaryPage from "../pages/Diary/DiaryPage";
import ChatPage from "../pages/Chat/ChatPage";
import AdminPage from "../pages/Admin/AdminPage";
import DonationPage from "../pages/Donation/DonationPage";
import OnboardingPage from "../pages/Onboarding/OnboardingPage";
import NotFoundPage from "../pages/NotFound/NotFoundPage";

const AppRoutes = () => {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/specialists" element={<SpecialistsPage />} />
          <Route path="/specialists/:id" element={<SpecialistDetailPage />} />
          <Route path="/diary" element={<DiaryPage />} />
          <Route path="/chat" element={<ChatPage />} />

          <Route element={<RoleRoute allow={["ADMIN"]} />}>
            <Route path="/admin" element={<AdminPage />} />
          </Route>

          <Route element={<RoleRoute allow={["CLIENT"]} />}>
            <Route path="/sessions/:id/donate" element={<DonationPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes;
