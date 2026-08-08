import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./guards/ProtectedRoute";
import RoleGuard from "./guards/RoleGuard";

// Public
import PublicLayout from "./components/layout/PublicLayout";
import VerifyPage from "./pages/public/VerifyPage";
import LandingPage from "./pages/public/LandingPage";


// Auth — portal-specific login pages
import AdminLoginPage from "./pages/auth/AdminLoginPage";
import IssuerLoginPage from "./pages/auth/IssuerLoginPage";
import ChangePasswordPage from "./pages/auth/ChangePasswordPage";

// Admin portal
import AdminLayout from "./components/layout/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import UniversitiesPage from "./pages/admin/UniversitiesPage";
import IssuersPage from "./pages/admin/IssuersPage";
import VerificationLogsPage from "./pages/admin/VerificationLogsPage";
import AdminCertificatesPage from "./pages/admin/AdminCertificatesPage";
import AdminSettingsPage  from "./pages/admin/SettingsPage";

// Issuer portal
import IssuerLayout from "./components/layout/IssuerLayout";
import IssuerDashboard from "./pages/issuer/IssuerDashboard";
import IssuerSettingsPage from "./pages/issuer/SettingsPage";
import UploadBatchPage from "./pages/issuer/UploadBatchPage";
import BatchesPage from "./pages/issuer/BatchesPage";
import BatchDetailPage from "./pages/issuer/BatchDetailPage";
import CertificateSearchPage from "./pages/issuer/CertificateSearchPage";
import CertificateStatusPage from "./pages/issuer/CertificateStatusPage";


export default function App() {
  return (
    <Routes>

      {/* PUBLIC */}
      <Route element={<PublicLayout />}>
        <Route path="/"       element={<LandingPage />} />
        <Route path="/verify" element={<VerifyPage />}  />
      </Route>

      {/* ADMIN PORTAL */}
      <Route path="/admin/login" element={<AdminLoginPage />} />

      <Route
        path="/admin"
        element={
          <ProtectedRoute loginPath="/admin/login">
            <RoleGuard role="ADMIN" redirectTo="/admin/login">
              <AdminLayout />
            </RoleGuard>
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="universities" element={<UniversitiesPage />} />
        <Route path="issuers" element={<IssuersPage />} />
        <Route path="logs" element={<VerificationLogsPage />} />
        <Route path="certificates" element={<AdminCertificatesPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
      </Route>


      {/* ISSUER PORTAL */}
      <Route path="/issuer/login" element={<IssuerLoginPage />} />

      <Route
        path="/issuer"
        element={
          <ProtectedRoute loginPath="/issuer/login">
            <RoleGuard role="ISSUER" redirectTo="/issuer/login">
              <IssuerLayout />
            </RoleGuard>
          </ProtectedRoute>
        }
      >
        <Route index element={<IssuerDashboard />} />
        <Route path="upload" element={<UploadBatchPage />} />
        <Route path="batches" element={<BatchesPage />} />
        <Route path="batches/:batchId" element={<BatchDetailPage />} />
        <Route path="certificates" element={<CertificateSearchPage />} />
        <Route path="certificates/:certId" element={<CertificateStatusPage />} />
        <Route path="settings" element={<IssuerSettingsPage />} />
      </Route>


      {/* SHARED */}
      <Route
        path="/change-password"
        element={
          <ProtectedRoute loginPath="/admin/login">
            <ChangePasswordPage />
          </ProtectedRoute>
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />

    </Routes>
  );
}
