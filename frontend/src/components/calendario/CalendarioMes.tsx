import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Download, Calendar, Clock, ChevronLeft, ChevronRight, Plus, List, LayoutGrid, Pencil, Trash2 } from 'lucide-react';
import { calendarioApi } from '@/services/api';
import type { CalendarioMesResponse, ActividadCalendario } from '@/types';
import CalendarioExportable from './CalendarioExportable';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';

// react-big-calendar imports (for desktop)
import ShadcnBigCalendar from './shadcn-big-calendar';
import { dateFnsLocalizer, Views, type View, type SlotInfo } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { es } from 'date-fns/locale';

const locales = { es };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales,
});

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  resource: ActividadCalendario;
}

interface CalendarioMesProps {
  initialMonth?: number;
  initialYear?: number;
  compact?: boolean;
  showExportButton?: boolean;
  onCreateActividad?: (startDate: Date, endDate?: Date) => void;
  onEditActividad?: (actividad: ActividadCalendario) => void;
  onDeleteActividad?: (actividad: ActividadCalendario, deleteSerie: boolean) => void;
}

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DAYS_SHORT = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

const messages = {
  allDay: 'Todo el día',
  previous: 'Anterior',
  next: 'Siguiente',
  today: 'Hoy',
  month: 'Mes',
  week: 'Semana',
  day: 'Día',
  agenda: 'Lista',
  date: 'Fecha',
  time: 'Hora',
  event: 'Evento',
  noEventsInRange: 'No hay actividades en este rango.',
  showMore: (total: number) => `+${total} más`,
};

export default function CalendarioMes({
  initialMonth,
  initialYear,
  compact = false,
  showExportButton = true,
  onCreateActividad,
  onEditActividad,
  onDeleteActividad,
}: CalendarioMesProps) {
  const now = new Date();
  const [mes, setMes] = useState(initialMonth ?? now.getMonth() + 1);
  const [anio, setAnio] = useState(initialYear ?? now.getFullYear());
  const [calendario, setCalendario] = useState<CalendarioMesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedActividad, setSelectedActividad] = useState<ActividadCalendario | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportSubtitulo, setExportSubtitulo] = useState('JÓVENES RENOVADOS EN SU PALABRA');
  const [exportVersiculo, setExportVersiculo] = useState('Todo lo que hagáis, hacedlo de corazón, como para el Señor. #RenovadosEnSuPalabra Colosenses 3:23');
  const [exportShowLegend, setExportShowLegend] = useState(true);
  const [calendarView, setCalendarView] = useState<View>(Views.MONTH);
  const [currentDate, setCurrentDate] = useState(new Date(anio, mes - 1, 1));
  const [selectedDay, setSelectedDay] = useState<number>(now.getDate());
  const [showListView, setShowListView] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(1);

  // Check if we're on mobile
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    loadCalendario();
  }, [mes, anio]);

  // Calculate preview scale when export dialog opens
  useEffect(() => {
    if (showExportDialog && previewContainerRef.current) {
      const calculateScale = () => {
        const container = previewContainerRef.current;
        if (!container) return;
        const containerWidth = container.clientWidth - 48; // minus padding
        const calendarWidth = 950;
        const scale = Math.min(1, containerWidth / calendarWidth);
        setPreviewScale(scale);
      };

      // Small delay to let the modal render
      setTimeout(calculateScale, 50);
      window.addEventListener('resize', calculateScale);
      return () => window.removeEventListener('resize', calculateScale);
    }
  }, [showExportDialog]);

  useEffect(() => {
    setCurrentDate(new Date(anio, mes - 1, 1));
    // Reset selected day if changing month
    const today = new Date();
    if (mes === today.getMonth() + 1 && anio === today.getFullYear()) {
      setSelectedDay(today.getDate());
    } else {
      setSelectedDay(1);
    }
  }, [mes, anio]);

  const loadCalendario = async () => {
    setLoading(true);
    try {
      const data = await calendarioApi.getCalendarioMes(mes, anio);
      setCalendario(data);
    } catch (error) {
      console.error('Error loading calendario:', error);
      toast.error('Error al cargar el calendario');
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = useCallback((newDate: Date) => {
    const newMonth = newDate.getMonth() + 1;
    const newYear = newDate.getFullYear();
    if (newMonth !== mes || newYear !== anio) {
      setMes(newMonth);
      setAnio(newYear);
    }
    setCurrentDate(newDate);
  }, [mes, anio]);

  // Direct function to go to today (bypasses react-big-calendar)
  const goToToday = useCallback(() => {
    const today = new Date();
    const newMonth = today.getMonth() + 1;
    const newYear = today.getFullYear();
    setMes(newMonth);
    setAnio(newYear);
    setCurrentDate(today);
  }, []);

  const goToPrevMonth = useCallback(() => {
    setMes(m => {
      if (m === 1) {
        setAnio(a => a - 1);
        return 12;
      }
      return m - 1;
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    setMes(m => {
      if (m === 12) {
        setAnio(a => a + 1);
        return 1;
      }
      return m + 1;
    });
  }, []);

  // Transform actividades to calendar events
  const events = useMemo((): CalendarEvent[] => {
    if (!calendario) return [];
    return calendario.actividades.map((actividad): CalendarEvent => {
      const datePart = actividad.fecha.substring(0, 10);
      const [year, month, day] = datePart.split('-').map(Number);
      let start: Date;
      let end: Date;
      if (actividad.hora) {
        const [hours, minutes] = actividad.hora.split(':').map(Number);
        start = new Date(year, month - 1, day, hours, minutes);
        if (actividad.horaFin) {
          const [endHours, endMinutes] = actividad.horaFin.split(':').map(Number);
          end = new Date(year, month - 1, day, endHours, endMinutes);
        } else {
          end = new Date(year, month - 1, day, hours + 1, minutes);
        }
      } else {
        start = new Date(year, month - 1, day, 0, 0, 0);
        end = new Date(year, month - 1, day, 23, 59, 59);
      }
      const displayTitle = actividad.esCumpleanos && actividad.usuarioCumpleanos
        ? `🎂 ${actividad.usuarioCumpleanos.nombre.split(' ')[0]}`
        : actividad.titulo;
      return {
        id: `${actividad.id}-${actividad.fecha}`,
        title: displayTitle,
        start,
        end,
        allDay: !actividad.hora,
        resource: actividad,
      };
    });
  }, [calendario]);

  // Get activities for selected day (mobile view)
  const selectedDayActivities = useMemo(() => {
    if (!calendario) return [];
    const dateStr = `${anio}-${String(mes).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
    return calendario.actividadesPorDia[dateStr] || [];
  }, [calendario, anio, mes, selectedDay]);

  // Generate calendar grid for mobile
  const generateMiniCalendar = () => {
    const firstDay = new Date(anio, mes - 1, 1);
    const lastDay = new Date(anio, mes, 0);
    const startDay = firstDay.getDay();
    const totalDays = lastDay.getDate();
    const days: (number | null)[] = [];

    for (let i = 0; i < startDay; i++) days.push(null);
    for (let i = 1; i <= totalDays; i++) days.push(i);

    return days;
  };

  const miniCalendarDays = generateMiniCalendar();

  const hasEventsOnDay = (day: number) => {
    if (!calendario) return false;
    const dateStr = `${anio}-${String(mes).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayActivities = calendario.actividadesPorDia[dateStr] || [];
    return dayActivities.length > 0;
  };

  const isToday = (day: number) => {
    const today = new Date();
    return day === today.getDate() && mes === today.getMonth() + 1 && anio === today.getFullYear();
  };

  const handleExport = async () => {
    if (!exportRef.current) return;
    setExporting(true);
    try {
      const element = exportRef.current;

      const dataUrl = await toPng(element, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        width: 950,
        height: element.offsetHeight,
        canvasWidth: 950 * 2,
        canvasHeight: element.offsetHeight * 2,
      });
      const link = document.createElement('a');
      link.download = `calendario-${MONTHS[mes - 1].toLowerCase()}-${anio}.png`;
      link.href = dataUrl;
      link.click();
      toast.success('Imagen descargada correctamente');
      setShowExportDialog(false);
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Error al exportar la imagen');
    } finally {
      setExporting(false);
    }
  };

  // Desktop event component
  const EventComponent = ({ event }: { event: CalendarEvent }) => {
    const actividad = event.resource;
    const IconComponent = LucideIcons[actividad.icono as keyof typeof LucideIcons] as React.ComponentType<{ className?: string }>;
    return (
      <div
        className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium truncate"
        style={{ backgroundColor: actividad.color, color: '#ffffff' }}
      >
        {IconComponent && <IconComponent className="w-3 h-3 shrink-0" />}
        <span className="truncate">{event.title}</span>
      </div>
    );
  };

  const eventPropGetter = (event: CalendarEvent) => ({
    style: {
      backgroundColor: event.resource.color,
      borderRadius: '4px',
      border: 'none',
      color: '#fff',
      padding: '1px 2px',
    },
  });

  const handleSelectSlot = useCallback((slotInfo: SlotInfo) => {
    if (onCreateActividad) {
      // Si el usuario selecciona un rango de días, pasar ambas fechas
      const endDate = slotInfo.end.getTime() !== slotInfo.start.getTime() ? slotInfo.end : undefined;
      onCreateActividad(slotInfo.start, endDate);
    }
  }, [onCreateActividad]);

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setSelectedActividad(event.resource);
  }, []);

  // Desktop toolbar component - receives props from react-big-calendar
  const DesktopToolbar = ({
    label,
    onNavigate
  }: {
    label: string;
    onNavigate: (action: 'PREV' | 'NEXT' | 'TODAY') => void;
  }) => (
    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5" />
          <h2 className="text-lg font-bold capitalize">{label}</h2>
        </div>
        <div className="flex items-center gap-1">
          {/* Calendar/List toggle */}
          <div className="flex items-center bg-white/10 rounded-lg p-0.5 mr-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowListView(false)}
              className={cn("text-white hover:bg-white/20 h-7 w-7", !showListView && "bg-white/30")}
              title="Vista Calendario"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowListView(true)}
              className={cn("text-white hover:bg-white/20 h-7 w-7", showListView && "bg-white/30")}
              title="Vista Lista"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          {showExportButton && (
            <Button variant="ghost" size="icon" onClick={() => setShowExportDialog(true)} className="text-white hover:bg-white/20 h-8 w-8" title="Exportar">
              <Download className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={goToToday} className="text-white hover:bg-white/20">
            Hoy
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onNavigate('PREV')} className="text-white hover:bg-white/20 h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onNavigate('NEXT')} className="text-white hover:bg-white/20 h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-1 px-4 pb-3 bg-white/10 rounded-lg p-1 mx-4 mb-3">
        {[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA].map((v) => (
          <Button
            key={v}
            variant="ghost"
            size="sm"
            onClick={() => { setCalendarView(v); setShowListView(false); }}
            className={cn("text-white hover:bg-white/20 h-7 px-3 text-xs", calendarView === v && !showListView && "bg-white/30")}
          >
            {v === Views.MONTH ? 'Mes' : v === Views.WEEK ? 'Semana' : v === Views.DAY ? 'Día' : 'Agenda'}
          </Button>
        ))}
      </div>
    </div>
  );

  // Desktop list view component
  const DesktopListView = () => {
    // Group activities by date
    const groupedActivities = useMemo(() => {
      const groups: Record<string, ActividadCalendario[]> = {};

      if (!calendario) return groups;

      // Group activities by date
      calendario.actividades.forEach((actividad) => {
        const dateStr = actividad.fecha.substring(0, 10);
        if (!groups[dateStr]) {
          groups[dateStr] = [];
        }
        groups[dateStr].push(actividad);
      });

      // Sort by date
      return Object.fromEntries(
        Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
      );
    }, [calendario]);

    return (
      <div className="flex flex-col h-full">
        {/* Custom header for list view */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5" />
              <h2 className="text-lg font-bold capitalize">{MONTHS[mes - 1]} {anio}</h2>
            </div>
            <div className="flex items-center gap-1">
              {/* Calendar/List toggle */}
              <div className="flex items-center bg-white/10 rounded-lg p-0.5 mr-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowListView(false)}
                  className={cn("text-white hover:bg-white/20 h-7 w-7", !showListView && "bg-white/30")}
                  title="Vista Calendario"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowListView(true)}
                  className={cn("text-white hover:bg-white/20 h-7 w-7", showListView && "bg-white/30")}
                  title="Vista Lista"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
              {showExportButton && (
                <Button variant="ghost" size="icon" onClick={() => setShowExportDialog(true)} className="text-white hover:bg-white/20 h-8 w-8" title="Exportar">
                  <Download className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => { setMes(now.getMonth() + 1); setAnio(now.getFullYear()); }} className="text-white hover:bg-white/20">
                Hoy
              </Button>
              <Button variant="ghost" size="icon" onClick={goToPrevMonth} className="text-white hover:bg-white/20 h-8 w-8">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={goToNextMonth} className="text-white hover:bg-white/20 h-8 w-8">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="px-4 pb-3">
            <p className="text-white/70 text-sm">
              {calendario?.totalActividades ?? 0} actividades
            </p>
          </div>
        </div>

        {/* List content */}
        <div className="flex-1 overflow-y-auto bg-white">
          {Object.keys(groupedActivities).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Calendar className="h-16 w-16 mb-4 opacity-30" />
              <p className="text-lg">No hay actividades este mes</p>
              {onCreateActividad && (
                <Button variant="link" onClick={() => onCreateActividad(new Date(anio, mes - 1, 1))}>
                  Agregar actividad
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {Object.entries(groupedActivities).map(([dateStr, activities]) => {
                const date = new Date(dateStr + 'T12:00:00');
                return (
                  <div key={dateStr} className="py-4">
                    {/* Date header */}
                    <div className="px-4 pb-2 sticky top-0 bg-white">
                      <p className="text-sm font-semibold text-muted-foreground">
                        {date.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </p>
                    </div>
                    {/* Activities for this date */}
                    <div className="space-y-2 px-4">
                      {activities.map((actividad) => {
                        const IconComponent = LucideIcons[actividad.icono as keyof typeof LucideIcons] as React.ComponentType<{ className?: string }>;
                        return (
                          <div
                            key={actividad.id}
                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer border"
                            onClick={() => setSelectedActividad(actividad)}
                          >
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                              style={{ backgroundColor: actividad.color + '20', color: actividad.color }}
                            >
                              {IconComponent && <IconComponent className="w-5 h-5" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{actividad.titulo}</p>
                              <p className="text-sm text-muted-foreground">
                                {actividad.hora && `${actividad.hora}`}
                                {actividad.horaFin && ` - ${actividad.horaFin}`}
                                {!actividad.hora && 'Todo el día'}
                              </p>
                            </div>
                            {actividad.esRecurrente && (
                              <Badge variant="secondary" className="text-xs shrink-0">🔄</Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Mobile view component (iPhone style)
  const MobileCalendarView = () => (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-2 py-3 rounded-t-lg">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-bold">{MONTHS[mes - 1]} {anio}</h2>
          <div className="flex items-center">
            {showExportButton && (
              <Button variant="ghost" size="icon" onClick={() => setShowExportDialog(true)} className="text-white hover:bg-white/20 h-7 w-7">
                <Download className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={goToPrevMonth} className="text-white hover:bg-white/20 h-7 w-7">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={goToNextMonth} className="text-white hover:bg-white/20 h-7 w-7">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Mini calendar grid */}
        <div className="grid grid-cols-7 w-full">
          {/* Day headers */}
          {DAYS_SHORT.map((d, i) => (
            <div key={i} className="text-center text-[10px] text-white/70 py-1">{d}</div>
          ))}
          {/* Days */}
          {miniCalendarDays.map((day, i) => (
            <div key={i} className="flex justify-center py-0.5">
              <button
                onClick={() => day && setSelectedDay(day)}
                disabled={!day}
                className={cn(
                  "w-7 h-7 flex items-center justify-center rounded-full text-xs relative transition-all",
                  !day && "invisible",
                  day && "hover:bg-white/20 active:bg-white/30",
                  day === selectedDay && "bg-white text-blue-600 font-bold",
                  day !== selectedDay && isToday(day!) && "ring-2 ring-white",
                )}
              >
                {day}
                {day && hasEventsOnDay(day) && day !== selectedDay && (
                  <div className="absolute bottom-0 w-1 h-1 rounded-full bg-orange-400" />
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Selected day header */}
      <div className="px-3 py-3 bg-slate-100 border-b flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">
            {new Date(anio, mes - 1, selectedDay).toLocaleDateString('es', { weekday: 'long' })}
          </p>
          <p className="text-lg font-bold">
            {selectedDay} de {MONTHS[mes - 1]}
          </p>
        </div>
        {onCreateActividad && (
          <Button size="sm" className="shrink-0" onClick={() => onCreateActividad(new Date(anio, mes - 1, selectedDay))}>
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Events list for selected day */}
      <div className="flex-1 overflow-y-auto bg-white">
        {selectedDayActivities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Calendar className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">No hay actividades este día</p>
            {onCreateActividad && (
              <Button variant="link" size="sm" onClick={() => onCreateActividad(new Date(anio, mes - 1, selectedDay))}>
                Agregar actividad
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y">
            {selectedDayActivities.map((actividad) => {
              const IconComponent = LucideIcons[actividad.icono as keyof typeof LucideIcons] as React.ComponentType<{ className?: string }>;
              return (
                <div
                  key={actividad.id}
                  className="flex items-center gap-3 p-4 hover:bg-slate-50 active:bg-slate-100 cursor-pointer"
                  onClick={() => setSelectedActividad(actividad)}
                >
                  <div
                    className="w-1 h-12 rounded-full shrink-0"
                    style={{ backgroundColor: actividad.color }}
                  />
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: actividad.color + '20', color: actividad.color }}
                  >
                    {IconComponent && <IconComponent className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{actividad.titulo}</p>
                    <p className="text-sm text-muted-foreground">
                      {actividad.hora && `${actividad.hora}`}
                      {actividad.horaFin && ` - ${actividad.horaFin}`}
                      {!actividad.hora && 'Todo el día'}
                    </p>
                  </div>
                  {actividad.esRecurrente && (
                    <Badge variant="secondary" className="text-xs shrink-0">🔄</Badge>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-slate-50 border-t">
        <p className="text-sm text-muted-foreground text-center">
          <span className="font-semibold text-foreground">{calendario?.totalActividades ?? 0}</span> actividades este mes
        </p>
      </div>
    </div>
  );

  if (loading) {
    return (
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4">
          <Skeleton className="h-6 w-32 bg-white/20" />
        </div>
        <CardContent className="p-4">
          <div className="grid grid-cols-7 gap-2 mb-4">
            {Array.from({ length: 35 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="overflow-hidden shadow-lg border-0 max-w-full">
        <CardContent className="p-0 overflow-hidden">
          {isMobile ? (
            <div className="h-[calc(100vh-200px)] min-h-[500px] overflow-hidden">
              <MobileCalendarView />
            </div>
          ) : showListView ? (
            <div className={compact ? "h-[550px]" : "h-[700px]"}>
              <DesktopListView />
            </div>
          ) : (
            <div className={compact ? "h-[550px]" : "h-[700px]"}>
              <ShadcnBigCalendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                view={calendarView}
                onView={setCalendarView}
                date={currentDate}
                onNavigate={handleNavigate}
                onSelectEvent={handleSelectEvent}
                onSelectSlot={handleSelectSlot}
                messages={messages}
                culture="es"
                components={{
                  event: EventComponent,
                  toolbar: DesktopToolbar,
                }}
                eventPropGetter={eventPropGetter}
                popup
                selectable={!!onCreateActividad}
                views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Detail Dialog */}
      <Dialog open={!!selectedActividad} onOpenChange={() => setSelectedActividad(null)}>
        <DialogContent className="w-[95vw] max-w-md">
          {selectedActividad && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{
                      backgroundColor: selectedActividad.color + '20',
                      color: selectedActividad.color,
                    }}
                  >
                    {(() => {
                      const IconComponent = LucideIcons[selectedActividad.icono as keyof typeof LucideIcons] as React.ComponentType<{ className?: string }>;
                      return IconComponent ? <IconComponent className="w-5 h-5" /> : null;
                    })()}
                  </div>
                  <DialogTitle className="text-left">{selectedActividad.titulo}</DialogTitle>
                </div>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {new Date(selectedActividad.fecha.split('T')[0] + 'T12:00:00').toLocaleDateString('es-PE', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                {selectedActividad.hora && (
                  <div className="flex items-center gap-3 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {selectedActividad.hora}
                      {selectedActividad.horaFin && ` - ${selectedActividad.horaFin}`}
                    </span>
                  </div>
                )}
                {selectedActividad.descripcion && (
                  <p className="text-sm text-muted-foreground bg-slate-50 p-3 rounded-lg">
                    {selectedActividad.descripcion}
                  </p>
                )}
                {selectedActividad.esCumpleanos && selectedActividad.usuarioCumpleanos && (
                  <div className="p-3 rounded-lg bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-100">
                    <p className="text-sm">
                      🎂 Celebramos el cumpleaños de{' '}
                      <strong>{selectedActividad.usuarioCumpleanos.nombre}</strong>
                    </p>
                  </div>
                )}
                {selectedActividad.esRecurrente && (
                  <Badge variant="outline" className="text-xs">🔄 Actividad recurrente</Badge>
                )}

                {/* Action buttons - only show if not a birthday and callbacks exist */}
                {!selectedActividad.esCumpleanos && (onEditActividad || onDeleteActividad) && (
                  <div className="flex gap-2 pt-4 border-t">
                    {onEditActividad && (
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          onEditActividad(selectedActividad);
                          setSelectedActividad(null);
                        }}
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                    )}
                    {onDeleteActividad && (
                      <Button
                        variant="outline"
                        className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          onDeleteActividad(selectedActividad, false);
                          setSelectedActividad(null);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
                      </Button>
                    )}
                  </div>
                )}
                {/* Delete series option for recurring activities */}
                {!selectedActividad.esCumpleanos && selectedActividad.esRecurrente && onDeleteActividad && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      onDeleteActividad(selectedActividad, true);
                      setSelectedActividad(null);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar toda la serie
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="w-[95vw] sm:max-w-[1400px] max-h-[95vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle>Exportar Calendario</DialogTitle>
          </DialogHeader>

          {/* Configuration Fields */}
          <div className="px-6 pb-4 shrink-0 space-y-3 border-b">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="export-subtitulo" className="text-sm">Subtítulo</Label>
                <Input
                  id="export-subtitulo"
                  value={exportSubtitulo}
                  onChange={(e) => setExportSubtitulo(e.target.value)}
                  placeholder="Ej: JÓVENES RENOVADOS EN SU PALABRA"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="export-versiculo" className="text-sm">Versículo / Texto del footer</Label>
                <Textarea
                  id="export-versiculo"
                  value={exportVersiculo}
                  onChange={(e) => setExportVersiculo(e.target.value)}
                  placeholder="Ej: Todo lo que hagáis, hacedlo de corazón..."
                  rows={2}
                  className="resize-none"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="export-legend"
                checked={exportShowLegend}
                onCheckedChange={(checked) => setExportShowLegend(checked === true)}
              />
              <Label htmlFor="export-legend" className="text-sm cursor-pointer">
                Mostrar leyenda de actividades
              </Label>
            </div>
          </div>

          {/* Preview */}
          <div ref={previewContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-100">
            <div className="flex justify-center">
              <div
                className="p-6 origin-top"
                style={{
                  transform: `scale(${previewScale})`,
                  width: '950px',
                  minWidth: '950px',
                }}
              >
                <div ref={exportRef} style={{ width: '950px' }}>
                  {calendario && (
                    <CalendarioExportable
                      mes={mes}
                      anio={anio}
                      calendario={calendario}
                      subtitulo={exportSubtitulo}
                      versiculo={exportVersiculo}
                      showLegend={exportShowLegend}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t bg-background shrink-0">
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowExportDialog(false)}>Cancelar</Button>
              <Button onClick={handleExport} disabled={exporting}>
                {exporting ? 'Exportando...' : <><Download className="h-4 w-4 mr-2" />Descargar PNG</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
