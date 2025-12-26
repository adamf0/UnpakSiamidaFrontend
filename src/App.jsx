import { HashRouter as Router, Routes, Route } from "react-router-dom";
import LoginPage from "./Page/LoginPage";
import { SidebarProvider } from "./Providers/SidebarProvider";
import PanelLayout from "./Template/PanelLayout";
import ProtectedRoute from "./Components/ProtectedRoute";
import { AuthProvider } from "./Providers/AuthProvider";
import { ToastProvider } from "./Providers/ToastProvider";
import DashboardPage from "./Page/Dashboard/DashboardPage";
import StandarRenstraPage from "./Page/StandarRenstra/StandarRenstraPage";
import IndikatorRenstraPage from "./Page/IndikatorRenstra/IndikatorRenstraPage";
import JenisFilePage from "./Page/JenisFile/JenisFilePage";
import TemplateRenstraPage from "./Page/TemplateRenstra/TemplateRenstraPage";
import TemplateDokumenTambahanPage from "./Page/TemplateDokumenTambahan/TemplateDokumenTambahanPage";
import TemplateDokumenTambahanFormPage from "./Page/TemplateDokumenTambahan/TemplateDokumenTambahanFormPage";
import TemplateRenstraFormPage from "./Page/TemplateRenstra/TemplateRenstraFormPage";

export default function App() {
  return (
    <ToastProvider>
      <SidebarProvider>
        <Router>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<LoginPage />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<PanelLayout />}>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/standar_renstra" element={<StandarRenstraPage />} />
                  <Route path="/indikator_renstra" element={<IndikatorRenstraPage />} />
                  <Route path="/jenis_file_audit" element={<JenisFilePage />} />

                  <Route path="/template_renstra" element={<TemplateRenstraPage />} />
                  <Route path="/template_renstra/new" element={<TemplateRenstraFormPage />} />
                  <Route path="/template_renstra/:tahun/:uuidIndikator" element={<TemplateRenstraFormPage />} />

                  <Route path="/template_dokumen_tambahan" element={<TemplateDokumenTambahanPage />} />
                  <Route path="/template_dokumen_tambahan/new" element={<TemplateDokumenTambahanFormPage />} />
                  <Route path="/template_dokumen_tambahan/:tahun/:uuidJenisFile" element={<TemplateDokumenTambahanFormPage />} />
                  {/* <Route element={<AccessControlRoute checkAccess={(auth) => (auth.isAdminAccess() || auth.isCompanyAccess())} />}>
                    <Route path="/users" element={<UserPage />} />
                    <Route path="/role_permissions" element={<RolePermissionPage />} />
                  </Route> */}
                </Route>
              </Route>
            </Routes>
          </AuthProvider>
        </Router>
      </SidebarProvider>
    </ToastProvider>
  );
}