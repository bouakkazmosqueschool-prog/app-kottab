import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { RequireAuth } from './components/layout/RequireAuth';
import { RoleRoute } from './components/layout/RoleRoute';
import { useSettingsStore } from './store/settingsStore';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import StudentsPage from './pages/StudentsPage';
import StudentDetailPage from './pages/StudentDetailPage';
import GoalsPage from './pages/GoalsPage';
import AchievementsPage from './pages/AchievementsPage';
import ReportsPage from './pages/ReportsPage';
import PaymentsPage from './pages/PaymentsPage';
import PaymentsReportPage from './pages/PaymentsReportPage';

export default function App() {
  const darkMode = useSettingsStore((s) => s.settings.darkMode);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="payments-report" element={<PaymentsReportPage />} />
            {/* الطلاب/الأهداف/الإنجاز/التقارير: الأستاذ والمدير العام فقط (لا المشرف المالي) */}
            <Route element={<RoleRoute allow={['teacher', 'super_admin']} />}>
              <Route path="students" element={<StudentsPage />} />
              <Route path="students/:id" element={<StudentDetailPage />} />
              <Route path="goals" element={<GoalsPage />} />
              <Route path="achievements" element={<AchievementsPage />} />
              <Route path="reports" element={<ReportsPage />} />
            </Route>
            {/* تسجيل الأداءات: المشرف المالي فقط */}
            <Route element={<RoleRoute allow={['supervisor']} />}>
              <Route path="payments" element={<PaymentsPage />} />
            </Route>
            <Route path="settings" element={<Navigate to="/dashboard" replace />} />
            <Route path="memorization" element={<Navigate to="/dashboard" replace />} />
            <Route path="surahs" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
