import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { useSettingsStore } from './store/settingsStore';
import DashboardPage from './pages/DashboardPage';
import StudentsPage from './pages/StudentsPage';
import StudentDetailPage from './pages/StudentDetailPage';
import GoalsPage from './pages/GoalsPage';
import AchievementsPage from './pages/AchievementsPage';
import MemorizationPage from './pages/MemorizationPage';
import ReportsPage from './pages/ReportsPage';
import SurahsPage from './pages/SurahsPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  const darkMode = useSettingsStore((s) => s.settings.darkMode);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="students" element={<StudentsPage />} />
          <Route path="students/:id" element={<StudentDetailPage />} />
          <Route path="goals" element={<GoalsPage />} />
          <Route path="achievements" element={<AchievementsPage />} />
          <Route path="memorization" element={<MemorizationPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="surahs" element={<SurahsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
