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
import PreviewTemplatePage from "./Page/PreviewTemplate/PreviewTemplatePage";
import ScheduleAuditPage from "./Page/ScheduleAudit/ScheduleAuditPage";
import ScheduleAuditFormPage from "./Page/ScheduleAudit/ScheduleAuditFormPage";
import AuditPage from "./Page/Audit/AuditPage";
import { ContentProvider } from "./Providers/ContentProvider";
import KtsPage from "./Page/Kts/KtsPage";
import PusatKtsPage from "./Page/PusatKts/PusatKtsPage";
import AuditRenstraEditPage from "./Page/Audit/AuditRenstraEditPage";

import AuditTambahanEditPage from "./Page/Audit/AuditTambahanEditPage";
import BeritaAcaraPage from "./Page/BeritaAcara/BeritaAcaraPage";
import MasterTahunPage from "./Page/MasterTahun/MasterTahunPage";
import MataProgramPage from "./Page/MataProgram/MataProgramPage";
import AktivitasPage from "./Page/Aktivitas/AktivitasPage";
import PelaporanPelaksanaanPage from "./Page/PelaporanPelaksanaan/PelaporanPelaksanaanPage";
import PelaporanDokumenPage from "./Page/PelaporanDokumen/PelaporanDokumenPage";
import ReportPage from "./Page/Report/ReportPage";
import AccountUserPage from "./Page/AccountUser/AccountUserPage";
import UserMergePage from "./Page/AccountUser/UserMergePage";
import UserAssignmentPage from "./Page/AccountUser/UserAssignmentPage";
import SwotPage from "./Page/Swot/SwotPage";
import RiskAssessmentPage from "./Page/RiskAssessment/RiskAssessmentPage";
import ProkerV3Page from "./Page/ProkerV3/ProkerV3Page";
import ProkerV3AktivitasPage from "./Page/ProkerV3/ProkerV3AktivitasPage";
import ProkerV3DokumenPage from "./Page/ProkerV3/ProkerV3DokumenPage";
import ProkerV3TimelinePage from "./Page/ProkerV3/ProkerV3TimelinePage";

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <SidebarProvider>
          <ContentProvider>
            <Router>
                <Routes>
                  <Route path="/" element={<LoginPage />} />
                  <Route element={<ProtectedRoute />}>
                    <Route element={<PanelLayout />}>
                      <Route path="/dashboard" element={<DashboardPage />} />
                      <Route path="/users" element={<AccountUserPage />} />
                      <Route path="/users/merge" element={<UserMergePage />} />
                      <Route path="/users/abac" element={<UserAssignmentPage />} />
                      <Route path="/users/:userUuid/abac" element={<UserAssignmentPage />} />
                      <Route path="/users/assignment" element={<UserAssignmentPage />} />
                      <Route path="/users/:userUuid/assignment" element={<UserAssignmentPage />} />
                      <Route path="/users/penugasan" element={<UserAssignmentPage />} />
                      <Route path="/account_user" element={<AccountUserPage />} />
                      <Route path="/account_user/merge" element={<UserMergePage />} />
                      <Route path="/account_user/abac" element={<UserAssignmentPage />} />
                      <Route path="/account_user/:userUuid/abac" element={<UserAssignmentPage />} />
                      <Route path="/account_user/assignment" element={<UserAssignmentPage />} />
                      <Route path="/account_user/:userUuid/assignment" element={<UserAssignmentPage />} />
                      <Route path="/account_user/penugasan" element={<UserAssignmentPage />} />
                      <Route path="/master_tahun" element={<MasterTahunPage />} />
                      <Route path="/tahun_proker" element={<MasterTahunPage />} />
                      <Route path="/mata_program" element={<MataProgramPage />} />
                      <Route path="/aktivitas" element={<AktivitasPage />} />
                      <Route path="/aktivitas_proker" element={<AktivitasPage />} />
                      <Route path="/pelaporan_pelaksanaan" element={<PelaporanPelaksanaanPage />} />
                      <Route path="/pelaporan_dokumen" element={<PelaporanDokumenPage />} />
                      <Route path="/standar_renstra" element={<StandarRenstraPage />} />
                      <Route path="/indikator_renstra" element={<IndikatorRenstraPage />} />
                      <Route path="/jenis_file_audit" element={<JenisFilePage />} />
                      <Route path="/swot" element={<SwotPage />} />
                      <Route path="/analisis_swot" element={<SwotPage />} />
                      <Route path="/risk_assessment" element={<RiskAssessmentPage />} />
                      <Route path="/analisis_resiko" element={<RiskAssessmentPage />} />
                      <Route path="/analisis_risiko" element={<RiskAssessmentPage />} />
                      <Route path="/proker_v3" element={<ProkerV3Page />} />
                      <Route path="/proker_v3/:uuid/aktivitas" element={<ProkerV3AktivitasPage />} />
                      <Route path="/proker_v3/:uuid/aktivitas/:actUuid/timeline" element={<ProkerV3TimelinePage />} />
                      <Route path="/proker_v3/aktivitas/:actUuid/timeline" element={<ProkerV3TimelinePage />} />
                      <Route path="/proker_v3/:uuid/dokumen" element={<ProkerV3DokumenPage />} />
                      <Route path="/proker" element={<ProkerV3Page />} />
                      <Route path="/proker/:uuid/aktivitas" element={<ProkerV3AktivitasPage />} />
                      <Route path="/proker/:uuid/aktivitas/:actUuid/timeline" element={<ProkerV3TimelinePage />} />
                      <Route path="/proker/:uuid/dokumen" element={<ProkerV3DokumenPage />} />

                      <Route path="/template_renstra" element={<TemplateRenstraPage />} />
                      <Route path="/template_renstra/preview" element={<PreviewTemplatePage type="renstra" />} />
                      <Route path="/template_renstra/new" element={<TemplateRenstraFormPage />} />
                      <Route path="/template_renstra/:tahun/:uuidIndikator" element={<TemplateRenstraFormPage />} />

                      <Route path="/template_dokumen_tambahan" element={<TemplateDokumenTambahanPage />} />
                      <Route path="/template_dokumen_tambahan/preview" element={<PreviewTemplatePage type="dokumen_tambahan" />} />
                      <Route path="/template_dokumen_tambahan/new" element={<TemplateDokumenTambahanFormPage />} />
                      <Route path="/template_dokumen_tambahan/:tahun/:uuidJenisFile" element={<TemplateDokumenTambahanFormPage />} />

                      <Route path="/schedule_audit" element={<ScheduleAuditPage />} />
                      <Route path="/schedule_audit/new" element={<ScheduleAuditFormPage />} />
                      <Route path="/schedule_audit/edit/:uuidSchedule" element={<ScheduleAuditFormPage />} />

                      <Route path="/audit" element={<AuditPage />} />
                      <Route path="/audit/renstra/:uuidRenstra" element={<AuditRenstraEditPage />} />
                      <Route path="/audit/tambahan/:uuidRenstra" element={<AuditTambahanEditPage />} />

                      <Route path="/kts/:tahun/:target/:uuidaudit" element={<KtsPage />} />
                      <Route path="/pusat_kts/:uuidRenstra" element={<PusatKtsPage />} />
                      <Route path="/pusat_kts" element={<PusatKtsPage />} />

                      <Route path="/berita_acara" element={<BeritaAcaraPage />} />

                      <Route path="/berita_acara/:target" element={<BeritaAcaraPage />} />
                      <Route path="/report" element={<ReportPage />} />

                      {/* <Route element={<AccessControlRoute checkAccess={(auth) => (auth.isAdminAccess() || auth.isCompanyAccess())} />}>
                        <Route path="/users" element={<UserPage />} />
                        <Route path="/role_permissions" element={<RolePermissionPage />} />
                      </Route> */}
                    </Route>
                  </Route>
                </Routes>
            </Router>
          </ContentProvider>
        </SidebarProvider>
      </ToastProvider>
    </AuthProvider>
  );
}