import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { Loader } from "./components/Loader";
import { useAuth } from "./hooks/useAuth";
import { LandingPage } from "./pages/LandingPage";
import { ServicesPage } from "./pages/ServicesPage";
import { FAQPage } from "./pages/FAQPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DashboardPage } from "./pages/DashboardPage";
import { OwnersPage } from "./pages/OwnersPage";
import { OwnerDetailPage } from "./pages/OwnerDetailPage";
import { AppointmentsPage } from "./pages/AppointmentsPage";
import { VetsPage } from "./pages/VetsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { GoogleOAuthResultPage } from "./pages/GoogleOAuthResultPage";
import { AdminUsersPage } from "./pages/AdminUsersPage";
import { VerifyEmailPage } from "./pages/VerifyEmailPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { authenticated, loading } = useAuth();
  if (loading) {
    return (
      <div className="page">
        <Loader />
      </div>
    );
  }
  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/services" element={<ServicesPage />} />
      <Route path="/faq" element={<FAQPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/oauth/google" element={<GoogleOAuthResultPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AppLayout>
              <DashboardPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/owners"
        element={
          <ProtectedRoute>
            <AppLayout>
              <OwnersPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/owners/:ownerId"
        element={
          <ProtectedRoute>
            <AppLayout>
              <OwnerDetailPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/appointments/new"
        element={
          <ProtectedRoute>
            <AppLayout>
              <AppointmentsPage defaultOpenCreate={true} />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/appointments"
        element={
          <ProtectedRoute>
            <AppLayout>
              <AppointmentsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/vets"
        element={
          <ProtectedRoute>
            <AppLayout>
              <VetsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute>
            <AppLayout>
              <AdminUsersPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <AppLayout>
              <ProfilePage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="*"
        element={
          <ProtectedRoute>
            <AppLayout>
              <NotFoundPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
