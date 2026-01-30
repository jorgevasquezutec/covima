import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { useAuthStore } from '@/store/auth';
import ProtectedRoute from '@/components/ProtectedRoute';
import MainLayout from '@/components/layout/MainLayout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import UsuariosPage from '@/pages/usuarios/UsuariosPage';
import ProgramasPage from '@/pages/programas/ProgramasPage';
import ProgramaForm from '@/pages/programas/ProgramaForm';
import AsistenciaPage from '@/pages/asistencia/AsistenciaPage';
import AsistenciaRoom from '@/pages/asistencia/AsistenciaRoom';
import RegistrarAsistencia from '@/pages/asistencia/RegistrarAsistencia';
import TiposAsistenciaPage from '@/pages/asistencia/TiposAsistenciaPage';
import ProfilePage from '@/pages/profile/ProfilePage';
import InboxPage from '@/pages/inbox/InboxPage';
import { RankingPage, MiProgresoPage } from '@/pages/gamificacion';
import { ConfigPuntajesPage, RegistroEventoPage, EventosPage, PeriodosRankingPage, GruposRankingPage, NivelesPage, HistorialPuntosPage } from '@/pages/admin/gamificacion';
import { PartesProgramaPage } from '@/pages/admin/partes';

function App() {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Ruta pública para registrar asistencia via QR */}
        <Route path="/asistencia/:codigo" element={<RegistrarAsistencia />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Dashboard />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/programas"
          element={
            <ProtectedRoute>
              <MainLayout>
                <ProgramasPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/programas/nuevo"
          element={
            <ProtectedRoute>
              <MainLayout>
                <ProgramaForm />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/programas/:id/editar"
          element={
            <ProtectedRoute>
              <MainLayout>
                <ProgramaForm />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/asistencias"
          element={
            <ProtectedRoute>
              <MainLayout>
                <AsistenciaPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        {/* Ruta pública para ver Room en vivo - solo logueados pueden confirmar */}
        <Route path="/asistencias/room/:codigo" element={<AsistenciaRoom />} />
        <Route
          path="/tipos-asistencia"
          element={
            <ProtectedRoute>
              <MainLayout>
                <TiposAsistenciaPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/usuarios"
          element={
            <ProtectedRoute>
              <MainLayout>
                <UsuariosPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/inbox"
          element={
            <ProtectedRoute>
              <MainLayout>
                <InboxPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        {/* Gamificación - Usuario */}
        <Route
          path="/ranking"
          element={
            <ProtectedRoute>
              <MainLayout>
                <RankingPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/mi-progreso"
          element={
            <ProtectedRoute>
              <MainLayout>
                <MiProgresoPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        {/* Gamificación - Admin */}
        <Route
          path="/admin/gamificacion/puntajes"
          element={
            <ProtectedRoute>
              <MainLayout>
                <ConfigPuntajesPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/gamificacion/eventos"
          element={
            <ProtectedRoute>
              <MainLayout>
                <EventosPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/gamificacion/registrar"
          element={
            <ProtectedRoute>
              <MainLayout>
                <RegistroEventoPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/gamificacion/periodos"
          element={
            <ProtectedRoute>
              <MainLayout>
                <PeriodosRankingPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/gamificacion/grupos"
          element={
            <ProtectedRoute>
              <MainLayout>
                <GruposRankingPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/gamificacion/niveles"
          element={
            <ProtectedRoute>
              <MainLayout>
                <NivelesPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/gamificacion/historial"
          element={
            <ProtectedRoute>
              <MainLayout>
                <HistorialPuntosPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/partes-programa"
          element={
            <ProtectedRoute>
              <MainLayout>
                <PartesProgramaPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/configuracion"
          element={
            <ProtectedRoute>
              <MainLayout>
                <div className="text-gray-900">Página de Configuración - Próximamente</div>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <MainLayout>
                <ProfilePage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster position="top-right" />
    </BrowserRouter>
  );
}

export default App;
