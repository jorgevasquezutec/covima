import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { DatePicker } from '@/components/ui/date-picker';
import { TimePicker } from '@/components/ui/time-picker';
import { calendarioApi } from '@/services/api';
import type {
  CreateActividadRequest,
  UpdateActividadRequest,
  ActividadCalendario,
} from '@/types';
import { toast } from 'sonner';
import {
  Loader2,
  Clock,
  Calendar,
  Church,
  Cross,
  Sun,
  Heart,
  Cake,
  Flame,
  Users,
  Music,
  Book,
  Star,
  Gift,
  PartyPopper,
  Megaphone,
  Trophy,
  Target,
  Mic,
  Video,
  Palette,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActividadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actividad?: ActividadCalendario | null;
  onSuccess: () => void;
  defaultDate?: string;
  defaultEndDate?: string;
  defaultHoraInicio?: string;
  defaultHoraFin?: string;
}

const DIAS_SEMANA = [
  { value: 0, short: 'D', label: 'Domingo' },
  { value: 1, short: 'L', label: 'Lunes' },
  { value: 2, short: 'M', label: 'Martes' },
  { value: 3, short: 'X', label: 'Miércoles' },
  { value: 4, short: 'J', label: 'Jueves' },
  { value: 5, short: 'V', label: 'Viernes' },
  { value: 6, short: 'S', label: 'Sábado' },
];

// Color palette
const COLORS = [
  '#3B82F6', // Blue
  '#14B8A6', // Teal
  '#22C55E', // Green
  '#F97316', // Orange
  '#EF4444', // Red
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#6366F1', // Indigo
  '#F59E0B', // Amber
  '#6B7280', // Gray
  '#0EA5E9', // Sky
  '#84CC16', // Lime
];

// Icons with their Lucide component and name
const ICONS = [
  { name: 'Calendar', icon: Calendar },
  { name: 'Church', icon: Church },
  { name: 'Cross', icon: Cross },
  { name: 'Sun', icon: Sun },
  { name: 'Heart', icon: Heart },
  { name: 'Cake', icon: Cake },
  { name: 'Flame', icon: Flame },
  { name: 'Users', icon: Users },
  { name: 'Music', icon: Music },
  { name: 'Book', icon: Book },
  { name: 'Star', icon: Star },
  { name: 'Gift', icon: Gift },
  { name: 'PartyPopper', icon: PartyPopper },
  { name: 'Megaphone', icon: Megaphone },
  { name: 'Trophy', icon: Trophy },
  { name: 'Target', icon: Target },
  { name: 'Mic', icon: Mic },
  { name: 'Video', icon: Video },
];

type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'weekdays' | 'custom';
type EndType = 'never' | 'date' | 'count';
type IntervalUnit = 'day' | 'week' | 'month' | 'year';

interface RecurrenceConfig {
  type: RecurrenceType;
  interval: number;
  intervalUnit: IntervalUnit;
  weekDays: number[];
  endType: EndType;
  endDate: string;
  endCount: number;
}

const getDefaultRecurrence = (): RecurrenceConfig => ({
  type: 'none',
  interval: 1,
  intervalUnit: 'week',
  weekDays: [],
  endType: 'never',
  endDate: '',
  endCount: 13,
});

export default function ActividadDialog({
  open,
  onOpenChange,
  actividad,
  onSuccess,
  defaultDate,
  defaultEndDate,
  defaultHoraInicio,
  defaultHoraFin,
}: ActividadDialogProps) {
  const isEditing = !!actividad && actividad.id > 0;

  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaInicio, setFechaInicio] = useState(defaultDate || new Date().toISOString().split('T')[0]);
  const [fechaFin, setFechaFin] = useState(defaultEndDate || defaultDate || new Date().toISOString().split('T')[0]);
  const [horaInicio, setHoraInicio] = useState(defaultHoraInicio || '');
  const [horaFin, setHoraFin] = useState(defaultHoraFin || '');
  const [todoElDia, setTodoElDia] = useState(!defaultHoraInicio);
  const [color, setColor] = useState('#3B82F6');
  const [icono, setIcono] = useState('Calendar');
  const [recurrence, setRecurrence] = useState<RecurrenceConfig>(getDefaultRecurrence());
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  // Get day of week from date
  const getDayOfWeek = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    return date.getDay();
  };

  // Format date for display
  const formatDateDisplay = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('es-PE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Get recurrence label for dropdown
  const getRecurrenceLabel = () => {
    const dayName = DIAS_SEMANA[getDayOfWeek(fechaInicio)]?.label || '';
    const date = new Date(fechaInicio + 'T12:00:00');
    const dayNum = date.getDate();
    const monthName = date.toLocaleDateString('es-PE', { month: 'long' });

    switch (recurrence.type) {
      case 'none': return 'No se repite';
      case 'daily': return 'Cada día';
      case 'weekly': return `Cada semana el ${dayName.toLowerCase()}`;
      case 'monthly': return `Cada mes el día ${dayNum}`;
      case 'yearly': return `Anualmente el ${dayNum} de ${monthName}`;
      case 'weekdays': return 'Todos los días laborables (lun-vie)';
      case 'custom': {
        const unit = recurrence.intervalUnit === 'day' ? 'día' :
                     recurrence.intervalUnit === 'week' ? 'semana' :
                     recurrence.intervalUnit === 'month' ? 'mes' : 'año';
        return `Cada ${recurrence.interval > 1 ? recurrence.interval + ' ' : ''}${unit}${recurrence.interval > 1 ? 's' : ''}`;
      }
      default: return 'No se repite';
    }
  };

  // Get icon component by name
  const getIconComponent = (iconName: string) => {
    const found = ICONS.find(i => i.name === iconName);
    return found ? found.icon : Calendar;
  };

  const IconComponent = getIconComponent(icono);

  useEffect(() => {
    if (actividad && actividad.id > 0) {
      setTitulo(actividad.titulo);
      setDescripcion(actividad.descripcion || '');
      setFechaInicio(actividad.fecha.split('T')[0]);
      setFechaFin(actividad.fecha.split('T')[0]);
      setHoraInicio(actividad.hora || '');
      setHoraFin(actividad.horaFin || '');
      setTodoElDia(!actividad.hora);
      setColor(actividad.color || '#3B82F6');
      setIcono(actividad.icono || 'Calendar');
      setRecurrence(getDefaultRecurrence());
    } else {
      setTitulo('');
      setDescripcion('');
      setFechaInicio(defaultDate || new Date().toISOString().split('T')[0]);
      setFechaFin(defaultEndDate || defaultDate || new Date().toISOString().split('T')[0]);
      setHoraInicio(defaultHoraInicio || '');
      setHoraFin(defaultHoraFin || '');
      setTodoElDia(!defaultHoraInicio);
      setColor('#3B82F6');
      setIcono('Calendar');

      // Set default weekday for custom recurrence
      const dayOfWeek = getDayOfWeek(defaultDate || new Date().toISOString().split('T')[0]);
      setRecurrence({
        ...getDefaultRecurrence(),
        weekDays: [dayOfWeek],
      });
    }
  }, [actividad, defaultDate, defaultEndDate, defaultHoraInicio, defaultHoraFin, open]);

  const handleRecurrenceSelect = (type: RecurrenceType) => {
    if (type === 'custom') {
      setShowCustomDialog(true);
    } else {
      const dayOfWeek = getDayOfWeek(fechaInicio);
      setRecurrence({
        ...recurrence,
        type,
        weekDays: type === 'weekly' ? [dayOfWeek] : type === 'weekdays' ? [1, 2, 3, 4, 5] : [],
      });
    }
  };

  const toggleWeekDay = (day: number) => {
    setRecurrence(prev => ({
      ...prev,
      weekDays: prev.weekDays.includes(day)
        ? prev.weekDays.filter(d => d !== day)
        : [...prev.weekDays, day].sort(),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) {
      toast.error('El título es requerido');
      return;
    }

    setSaving(true);

    try {
      // Convert recurrence config to API format
      let patronRecurrencia: 'NINGUNO' | 'SEMANAL' | 'QUINCENAL' | 'MENSUAL' | 'MENSUAL_DIA' = 'NINGUNO';
      let esRecurrente = false;

      if (recurrence.type !== 'none') {
        esRecurrente = true;
        if (recurrence.type === 'weekly' || recurrence.type === 'weekdays') {
          patronRecurrencia = 'SEMANAL';
        } else if (recurrence.type === 'monthly') {
          patronRecurrencia = 'MENSUAL';
        } else if (recurrence.type === 'daily') {
          patronRecurrencia = 'SEMANAL'; // Will create daily via interval
        } else if (recurrence.type === 'custom') {
          if (recurrence.intervalUnit === 'week') {
            patronRecurrencia = recurrence.interval === 2 ? 'QUINCENAL' : 'SEMANAL';
          } else if (recurrence.intervalUnit === 'month') {
            patronRecurrencia = 'MENSUAL';
          }
        }
      }

      const data: CreateActividadRequest | UpdateActividadRequest = {
        titulo,
        descripcion: descripcion || undefined,
        fecha: fechaInicio,
        hora: todoElDia ? undefined : horaInicio || undefined,
        horaFin: todoElDia ? undefined : horaFin || undefined,
        color,
        icono,
        esRecurrente,
        patronRecurrencia,
        fechaFinRecurrencia: recurrence.endType === 'date' && recurrence.endDate ? recurrence.endDate : undefined,
        diaSemana: recurrence.weekDays.length === 1 ? recurrence.weekDays[0] : undefined,
      };

      if (isEditing) {
        await calendarioApi.updateActividad(actividad.id, data);
        toast.success('Actividad actualizada');
      } else {
        // If multi-day event (fechaFin > fechaInicio), create activity for each day
        const startDate = new Date(fechaInicio + 'T12:00:00');
        const endDate = new Date(fechaFin + 'T12:00:00');

        if (endDate > startDate && recurrence.type === 'none') {
          // Create activity for each day in range
          const current = new Date(startDate);
          while (current <= endDate) {
            const dateStr = current.toISOString().split('T')[0];
            await calendarioApi.createActividad({
              ...data,
              fecha: dateStr,
            } as CreateActividadRequest);
            current.setDate(current.getDate() + 1);
          }
          const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          toast.success(`${days} actividades creadas`);
        } else {
          await calendarioApi.createActividad(data as CreateActividadRequest);
          toast.success('Actividad creada');
        }
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al guardar la actividad');
    } finally {
      setSaving(false);
    }
  };

  const isMultiDay = fechaFin !== fechaInicio;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-lg sm:text-xl">
              {isEditing ? 'Editar Actividad' : 'Nueva Actividad'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Título */}
            <div>
              <Input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Añade un título"
                className="text-lg border-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary"
                required
              />
            </div>

            {/* Color e Ícono */}
            <div className="flex items-center gap-3">
              {/* Color picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <div
                      className="w-5 h-5 rounded-full border"
                      style={{ backgroundColor: color }}
                    />
                    <Palette className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3" align="start">
                  <div className="grid grid-cols-6 gap-2">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={cn(
                          "w-8 h-8 rounded-full border-2 transition-transform hover:scale-110",
                          color === c ? "border-foreground scale-110" : "border-transparent"
                        )}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Icon picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <IconComponent className="h-5 w-5" style={{ color }} />
                    <span className="text-sm">{icono}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3" align="start">
                  <div className="grid grid-cols-6 gap-2">
                    {ICONS.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.name}
                          type="button"
                          onClick={() => setIcono(item.name)}
                          className={cn(
                            "w-9 h-9 rounded-md flex items-center justify-center transition-colors",
                            icono === item.name
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted"
                          )}
                          title={item.name}
                        >
                          <Icon className="h-5 w-5" />
                        </button>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Fechas */}
            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
              <Clock className="h-5 w-5 text-muted-foreground shrink-0 mt-2" />
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2">
                  <DatePicker
                    date={fechaInicio ? new Date(fechaInicio + 'T12:00:00') : undefined}
                    onSelect={(date) => {
                      if (date) {
                        const dateStr = date.toISOString().split('T')[0];
                        setFechaInicio(dateStr);
                        if (dateStr > fechaFin) {
                          setFechaFin(dateStr);
                        }
                        // Update weekday for recurrence
                        const dayOfWeek = date.getDay();
                        if (recurrence.type === 'weekly') {
                          setRecurrence(prev => ({ ...prev, weekDays: [dayOfWeek] }));
                        }
                      }
                    }}
                    placeholder="Inicio"
                    className="h-9 px-3 text-sm"
                  />
                  <span className="text-muted-foreground shrink-0">–</span>
                  <DatePicker
                    date={fechaFin ? new Date(fechaFin + 'T12:00:00') : undefined}
                    onSelect={(date) => {
                      if (date) {
                        setFechaFin(date.toISOString().split('T')[0]);
                      }
                    }}
                    placeholder="Fin"
                    minDate={fechaInicio ? new Date(fechaInicio + 'T12:00:00') : undefined}
                    className="h-9 px-3 text-sm"
                  />
                </div>

                {/* Todo el día checkbox */}
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="todoElDia"
                    checked={todoElDia}
                    onCheckedChange={(checked) => setTodoElDia(checked as boolean)}
                  />
                  <Label htmlFor="todoElDia" className="text-sm cursor-pointer">
                    Todo el día
                  </Label>
                </div>

                {/* Horas si no es todo el día */}
                {!todoElDia && (
                  <div className="flex items-center gap-2">
                    <TimePicker
                      value={horaInicio}
                      onChange={setHoraInicio}
                      className="h-9"
                    />
                    <span className="text-muted-foreground shrink-0">–</span>
                    <TimePicker
                      value={horaFin}
                      onChange={setHoraFin}
                      className="h-9"
                    />
                  </div>
                )}

                {/* Recurrencia */}
                <Select
                  value={recurrence.type}
                  onValueChange={(value) => handleRecurrenceSelect(value as RecurrenceType)}
                >
                  <SelectTrigger className="w-auto">
                    <SelectValue>{getRecurrenceLabel()}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No se repite</SelectItem>
                    <SelectItem value="daily">Cada día</SelectItem>
                    <SelectItem value="weekly">
                      Cada semana el {DIAS_SEMANA[getDayOfWeek(fechaInicio)]?.label.toLowerCase()}
                    </SelectItem>
                    <SelectItem value="monthly">
                      Cada mes el día {new Date(fechaInicio + 'T12:00:00').getDate()}
                    </SelectItem>
                    <SelectItem value="yearly">
                      Anualmente el {new Date(fechaInicio + 'T12:00:00').getDate()} de {new Date(fechaInicio + 'T12:00:00').toLocaleDateString('es-PE', { month: 'long' })}
                    </SelectItem>
                    <SelectItem value="weekdays">Todos los días laborables (lun-vie)</SelectItem>
                    <SelectItem value="custom">Personalizar...</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Descripción */}
            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
              <Calendar className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <Textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Añade descripción"
                rows={2}
                className="border-0 bg-transparent resize-none focus-visible:ring-0 p-0"
              />
            </div>

            {/* Info de rango */}
            {isMultiDay && recurrence.type === 'none' && (
              <p className="text-sm text-muted-foreground bg-blue-50 p-2 rounded">
                Se creará una actividad para cada día del {formatDateDisplay(fechaInicio).split(',')[1]} al {formatDateDisplay(fechaFin).split(',')[1]}
              </p>
            )}

            <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="w-full sm:w-auto">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Actualizar' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Custom Recurrence Dialog */}
      <Dialog open={showCustomDialog} onOpenChange={setShowCustomDialog}>
        <DialogContent className="w-[95vw] max-w-sm">
          <DialogHeader>
            <DialogTitle>Periodicidad personalizada</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Repetir cada X */}
            <div className="flex items-center gap-2">
              <span className="text-sm">Repetir cada</span>
              <Input
                type="number"
                min={1}
                max={99}
                value={recurrence.interval}
                onChange={(e) => setRecurrence(prev => ({ ...prev, interval: parseInt(e.target.value) || 1 }))}
                className="w-16 text-center"
              />
              <Select
                value={recurrence.intervalUnit}
                onValueChange={(value) => setRecurrence(prev => ({ ...prev, intervalUnit: value as IntervalUnit }))}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">día</SelectItem>
                  <SelectItem value="week">semana</SelectItem>
                  <SelectItem value="month">mes</SelectItem>
                  <SelectItem value="year">año</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Días de la semana (solo si es semanal) */}
            {recurrence.intervalUnit === 'week' && (
              <div className="space-y-2">
                <span className="text-sm">Se repite el</span>
                <div className="flex gap-1">
                  {DIAS_SEMANA.map((dia) => (
                    <button
                      key={dia.value}
                      type="button"
                      onClick={() => toggleWeekDay(dia.value)}
                      className={cn(
                        "w-9 h-9 rounded-full text-sm font-medium transition-colors",
                        recurrence.weekDays.includes(dia.value)
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/80"
                      )}
                    >
                      {dia.short}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Termina */}
            <div className="space-y-3">
              <span className="text-sm font-medium">Termina</span>
              <RadioGroup
                value={recurrence.endType}
                onValueChange={(value) => setRecurrence(prev => ({ ...prev, endType: value as EndType }))}
                className="space-y-2"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="never" id="end-never" />
                  <Label htmlFor="end-never">Nunca</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="date" id="end-date" />
                  <Label htmlFor="end-date">El</Label>
                  <Input
                    type="date"
                    value={recurrence.endDate}
                    onChange={(e) => setRecurrence(prev => ({ ...prev, endDate: e.target.value }))}
                    min={fechaInicio}
                    disabled={recurrence.endType !== 'date'}
                    className="w-auto"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="count" id="end-count" />
                  <Label htmlFor="end-count">Después de</Label>
                  <Input
                    type="number"
                    min={1}
                    max={999}
                    value={recurrence.endCount}
                    onChange={(e) => setRecurrence(prev => ({ ...prev, endCount: parseInt(e.target.value) || 1 }))}
                    disabled={recurrence.endType !== 'count'}
                    className="w-16 text-center"
                  />
                  <span className="text-sm">repeticiones</span>
                </div>
              </RadioGroup>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCustomDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={() => {
              setRecurrence(prev => ({ ...prev, type: 'custom' }));
              setShowCustomDialog(false);
            }}>
              Hecho
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
