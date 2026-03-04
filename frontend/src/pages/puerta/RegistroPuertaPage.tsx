import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DoorOpen, Loader2, CalendarX, Users, UserPlus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { programasApi, usuariosApi, asistenciaApi } from '@/services/api';
import type { QRAsistencia, Usuario } from '@/types';
import { PuertaContextBar } from './components/PuertaContextBar';
import { PuertaMemberSearch } from './components/PuertaMemberSearch';
import { PuertaVisitorForm } from './components/PuertaVisitorForm';
import { PuertaRecentFeed, type RecentRegistration } from './components/PuertaRecentFeed';
import { PuertaSuccessOverlay } from './components/PuertaSuccessOverlay';

type Modo = 'miembro' | 'visita';

interface SuccessData {
  nombre: string;
  tipo: 'asistencia' | 'visita' | 'nuevo_miembro';
}

function isQRInTime(qr: QRAsistencia): boolean {
  const now = new Date();
  const horaActual = now.getHours() * 60 + now.getMinutes();
  const horaInicio = qr.horaInicio ? new Date(qr.horaInicio) : null;
  const horaFin = qr.horaFin ? new Date(qr.horaFin) : null;
  const inicioMinutos = horaInicio ? horaInicio.getHours() * 60 + horaInicio.getMinutes() : 9 * 60;
  const finMinutos = horaFin ? horaFin.getHours() * 60 + horaFin.getMinutes() : 12 * 60;
  const margenTemprana = qr.margenTemprana || 0;
  const horaApertura = inicioMinutos - margenTemprana;
  if (finMinutos > horaApertura) {
    return horaActual >= horaApertura && horaActual < finMinutos;
  }
  return horaActual >= horaApertura || horaActual < finMinutos;
}

export default function RegistroPuertaPage() {
  const queryClient = useQueryClient();
  const [modo, setModo] = useState<Modo>('miembro');
  const [selectedProgramaId, setSelectedProgramaId] = useState<number | null>(null);
  const [recentRegistrations, setRecentRegistrations] = useState<RecentRegistration[]>([]);
  const [successData, setSuccessData] = useState<SuccessData | null>(null);
  const [localUsuarios, setLocalUsuarios] = useState<Usuario[]>([]);
  const lastActivityRef = useRef(Date.now());

  // Fetch today's programs (includes qrAsistencia directly)
  const { data: programasHoy, isLoading: loadingProgramas } = useQuery({
    queryKey: ['programas-hoy-visitas'],
    queryFn: () => programasApi.getProgramasHoyVisitas(),
    refetchInterval: 60000,
  });

  // Fetch all active users
  const { data: usuariosData } = useQuery({
    queryKey: ['puerta-usuarios'],
    queryFn: () => usuariosApi.getAll({ activo: true, limit: 500 }),
    refetchInterval: 120000,
  });

  // Merge server users with locally created ones
  const allUsuarios = useMemo(() => {
    const serverUsers = usuariosData?.data ?? [];
    const serverIds = new Set(serverUsers.map((u) => u.id));
    const newOnly = localUsuarios.filter((u) => !serverIds.has(u.id));
    return [...serverUsers, ...newOnly];
  }, [usuariosData, localUsuarios]);

  // Build programa contexts using direct qrAsistencia relation
  const programaContexts = useMemo(() => {
    if (!programasHoy) return [];
    return programasHoy.map((p) => {
      const qr = (p.qrAsistencia && p.qrAsistencia.activo) ? p.qrAsistencia as QRAsistencia : null;
      return {
        id: p.id,
        titulo: p.titulo,
        qr,
        isActive: qr ? isQRInTime(qr) : false,
      };
    });
  }, [programasHoy]);

  // Auto-select first active program or first program
  useEffect(() => {
    if (programaContexts.length === 0) {
      setSelectedProgramaId(null);
      return;
    }
    if (selectedProgramaId && programaContexts.some((p) => p.id === selectedProgramaId)) return;
    const active = programaContexts.find((p) => p.isActive);
    setSelectedProgramaId(active?.id ?? programaContexts[0].id);
  }, [programaContexts, selectedProgramaId]);

  const selectedContext = programaContexts.find((p) => p.id === selectedProgramaId) ?? null;
  const hasQR = !!selectedContext?.qr;
  const isOutOfTime = selectedContext?.qr ? !isQRInTime(selectedContext.qr) : false;

  // Fetch today's attendance for pre-selection (cross-program chips)
  const todayStr = new Date().toISOString().slice(0, 10);
  const { data: todayAttendance } = useQuery({
    queryKey: ['puerta-asistencia-hoy', todayStr],
    queryFn: () => asistenciaApi.getAll({ fechaDesde: todayStr, fechaHasta: todayStr, limit: 500 }),
    refetchInterval: 30000,
  });

  // Build map: usuarioId → array of programa titles they already attended today
  const registrosOtrosProgramas = useMemo(() => {
    const map = new Map<number, string[]>();
    if (!todayAttendance?.data || !selectedContext) return map;

    // Build a lookup: qrId → programa title
    const qrToProgramaTitulo = new Map<number, string>();
    for (const ctx of programaContexts) {
      if (ctx.qr) qrToProgramaTitulo.set(ctx.qr.id, ctx.titulo);
    }

    const selectedQrId = selectedContext.qr?.id;

    for (const a of todayAttendance.data) {
      if (!a.usuario?.id || !a.qr?.id) continue;
      // Skip registrations for the currently selected program
      if (a.qr.id === selectedQrId) continue;
      const titulo = qrToProgramaTitulo.get(a.qr.id);
      if (!titulo) continue;
      const existing = map.get(a.usuario.id) ?? [];
      existing.push(titulo);
      map.set(a.usuario.id, existing);
    }
    return map;
  }, [todayAttendance, selectedContext, programaContexts]);

  // Force visita mode if no QR available at all
  useEffect(() => {
    if (!hasQR && modo === 'miembro') {
      setModo('visita');
    }
  }, [hasQR, modo]);

  // Track activity for auto-reset
  const trackActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  useEffect(() => {
    const handler = () => trackActivity();
    window.addEventListener('pointerdown', handler);
    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('pointerdown', handler);
      window.removeEventListener('keydown', handler);
    };
  }, [trackActivity]);

  // Auto-reset after 30s inactivity
  useEffect(() => {
    const interval = setInterval(() => {
      if (Date.now() - lastActivityRef.current > 30000) {
        // Don't reset during an active overlay
        if (!successData) {
          setModo(hasQR ? 'miembro' : 'visita');
          // Force remount of children by cycling selectedProgramaId briefly
          // This is a no-op since state doesn't actually change,
          // but children have their own internal state to manage
        }
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [hasQR, successData]);

  const addRecentRegistration = useCallback((nombre: string, tipo: RecentRegistration['tipo'], detalle?: string) => {
    const now = new Date();
    const hora = now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });
    setRecentRegistrations((prev) => [
      { id: `${Date.now()}-${Math.random()}`, nombre, tipo, detalle, hora },
      ...prev.slice(0, 14),
    ]);
  }, []);

  const handleMemberSuccess = useCallback((nombre: string, tipo: 'asistencia' | 'nuevo_miembro') => {
    trackActivity();
    setSuccessData({ nombre, tipo });
    addRecentRegistration(
      nombre,
      tipo,
      tipo === 'asistencia' ? selectedContext?.titulo : undefined
    );
    queryClient.invalidateQueries({ queryKey: ['programas-hoy-visitas'] });
    queryClient.invalidateQueries({ queryKey: ['puerta-asistencia-hoy'] });
  }, [trackActivity, addRecentRegistration, selectedContext, queryClient]);

  const handleVisitaSuccess = useCallback((nombre: string) => {
    trackActivity();
    setSuccessData({ nombre, tipo: 'visita' });
    addRecentRegistration(nombre, 'visita', selectedContext?.titulo);
    queryClient.invalidateQueries({ queryKey: ['programas-hoy-visitas'] });
    queryClient.invalidateQueries({ queryKey: ['puerta-asistencia-hoy'] });
  }, [trackActivity, addRecentRegistration, selectedContext, queryClient]);

  const handleNewUser = useCallback((user: Usuario) => {
    setLocalUsuarios((prev) => [...prev, user]);
  }, []);

  if (loadingProgramas) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!programasHoy || programasHoy.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CalendarX className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-gray-900 mb-1">No hay programas hoy</h2>
          <p className="text-sm text-gray-500">
            No se encontraron programas para registrar asistencia o visitas.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <DoorOpen className="w-5 h-5 text-blue-600" />
        <h1 className="text-xl font-bold text-gray-900">Registro en Puerta</h1>
      </div>

      {/* Context pills */}
      <PuertaContextBar
        programas={programaContexts}
        selectedId={selectedProgramaId}
        onSelect={(id) => {
          setSelectedProgramaId(id);
          trackActivity();
        }}
      />

      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => { setModo('miembro'); trackActivity(); }}
          disabled={!hasQR}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all',
            modo === 'miembro'
              ? 'bg-blue-600 text-white shadow-md'
              : hasQR
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : 'bg-gray-50 text-gray-300 cursor-not-allowed'
          )}
        >
          <Users className="w-4 h-4" />
          Miembro
        </button>
        <button
          onClick={() => { setModo('visita'); trackActivity(); }}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all',
            modo === 'visita'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          )}
        >
          <UserPlus className="w-4 h-4" />
          Visita
        </button>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="pt-6">
              {modo === 'miembro' && selectedContext?.qr ? (
                <PuertaMemberSearch
                  key={`member-${selectedProgramaId}`}
                  usuarios={allUsuarios}
                  qr={selectedContext.qr}
                  isOutOfTime={isOutOfTime}
                  registrosOtrosProgramas={registrosOtrosProgramas}
                  onSuccess={handleMemberSuccess}
                  onNewUser={handleNewUser}
                />
              ) : selectedProgramaId ? (
                <PuertaVisitorForm
                  key={`visitor-${selectedProgramaId}`}
                  programaId={selectedProgramaId}
                  onSuccess={handleVisitaSuccess}
                />
              ) : null}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Registros recientes</span>
                <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  {recentRegistrations.length}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PuertaRecentFeed registrations={recentRegistrations} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Success overlay */}
      {successData && (
        <PuertaSuccessOverlay
          nombre={successData.nombre}
          tipo={successData.tipo}
          onDismiss={() => setSuccessData(null)}
        />
      )}
    </div>
  );
}
