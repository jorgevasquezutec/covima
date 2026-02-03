import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Calendar,
  Plus,
  Loader2,
} from 'lucide-react';
import { calendarioApi } from '@/services/api';
import type { ActividadCalendario } from '@/types';
import { toast } from 'sonner';
import ActividadDialog from './components/ActividadDialog';
import { CalendarioMes } from '@/components/calendario';

export default function CalendarioAdminPage() {
  const now = new Date();
  const [mes] = useState(now.getMonth() + 1);
  const [anio] = useState(now.getFullYear());

  const [showDialog, setShowDialog] = useState(false);
  const [selectedActividad, setSelectedActividad] = useState<ActividadCalendario | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
  const [selectedEndDate, setSelectedEndDate] = useState<string | undefined>(undefined);
  const [selectedHoraInicio, setSelectedHoraInicio] = useState<string | undefined>(undefined);
  const [selectedHoraFin, setSelectedHoraFin] = useState<string | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; titulo: string; esSerie: boolean } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      if (deleteTarget.esSerie) {
        await calendarioApi.deleteSerieRecurrente(deleteTarget.id);
        toast.success('Serie eliminada correctamente');
      } else {
        await calendarioApi.deleteActividad(deleteTarget.id);
        toast.success('Actividad eliminada correctamente');
      }
      setRefreshKey((k) => k + 1);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al eliminar');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleNew = (startDate?: Date, endDate?: Date) => {
    setSelectedActividad(null);
    if (startDate) {
      const year = startDate.getFullYear();
      const month = String(startDate.getMonth() + 1).padStart(2, '0');
      const day = String(startDate.getDate()).padStart(2, '0');
      setSelectedDate(`${year}-${month}-${day}`);

      // Extract time if it's a time slot selection (not all-day)
      const startHour = startDate.getHours();
      const startMinute = startDate.getMinutes();
      const isTimeSlot = startHour !== 0 || startMinute !== 0;

      if (isTimeSlot) {
        setSelectedHoraInicio(
          `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`
        );
      } else {
        setSelectedHoraInicio(undefined);
      }

      if (endDate) {
        const endHour = endDate.getHours();
        const endMinute = endDate.getMinutes();
        const isSameDay = startDate.toDateString() === endDate.toDateString();

        if (isTimeSlot && isSameDay) {
          // Time range on same day
          setSelectedHoraFin(
            `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`
          );
          setSelectedEndDate(undefined);
        } else if (!isSameDay) {
          // Multi-day selection
          const adjustedEnd = new Date(endDate);
          adjustedEnd.setDate(adjustedEnd.getDate() - 1);
          const endYear = adjustedEnd.getFullYear();
          const endMonth = String(adjustedEnd.getMonth() + 1).padStart(2, '0');
          const endDay = String(adjustedEnd.getDate()).padStart(2, '0');
          setSelectedEndDate(`${endYear}-${endMonth}-${endDay}`);
          setSelectedHoraFin(undefined);
        } else {
          setSelectedEndDate(undefined);
          setSelectedHoraFin(undefined);
        }
      } else {
        setSelectedEndDate(undefined);
        setSelectedHoraFin(undefined);
      }
    } else {
      setSelectedDate(undefined);
      setSelectedEndDate(undefined);
      setSelectedHoraInicio(undefined);
      setSelectedHoraFin(undefined);
    }
    setShowDialog(true);
  };

  const handleSuccess = () => {
    setRefreshKey((k) => k + 1);
  };

  const handleEdit = (actividad: ActividadCalendario) => {
    setSelectedActividad(actividad);
    setSelectedDate(undefined);
    setSelectedEndDate(undefined);
    setShowDialog(true);
  };

  const handleDeleteRequest = (actividad: ActividadCalendario, deleteSerie: boolean) => {
    setDeleteTarget({
      id: actividad.id,
      titulo: actividad.titulo,
      esSerie: deleteSerie,
    });
  };

  return (
    <div className="space-y-6 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" />
            <span className="truncate">Calendario de Actividades</span>
          </h1>
          <p className="text-sm text-muted-foreground hidden sm:block">
            Gestiona las actividades mensuales de COVIMA
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" onClick={() => handleNew()} className="text-xs sm:text-sm">
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Nueva Actividad</span>
            <span className="sm:hidden">Nueva</span>
          </Button>
        </div>
      </div>

      {/* Calendar - Full Width */}
      <CalendarioMes
        key={refreshKey}
        initialMonth={mes}
        initialYear={anio}
        showExportButton={true}
        onCreateActividad={handleNew}
        onEditActividad={handleEdit}
        onDeleteActividad={handleDeleteRequest}
      />

      {/* Activity Dialog */}
      <ActividadDialog
        open={showDialog}
        onOpenChange={(open) => {
          setShowDialog(open);
          if (!open) {
            setSelectedDate(undefined);
            setSelectedEndDate(undefined);
            setSelectedHoraInicio(undefined);
            setSelectedHoraFin(undefined);
          }
        }}
        actividad={selectedActividad}
        onSuccess={handleSuccess}
        defaultDate={selectedDate}
        defaultEndDate={selectedEndDate}
        defaultHoraInicio={selectedHoraInicio}
        defaultHoraFin={selectedHoraFin}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget?.esSerie ? 'Eliminar serie completa' : 'Eliminar actividad'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.esSerie ? (
                <>
                  ¿Estás seguro de eliminar toda la serie de "{deleteTarget?.titulo}"? Esta acción
                  no se puede deshacer y eliminará todas las instancias recurrentes.
                </>
              ) : (
                <>
                  ¿Estás seguro de eliminar "{deleteTarget?.titulo}"? Esta acción no se puede
                  deshacer.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                'Eliminar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
