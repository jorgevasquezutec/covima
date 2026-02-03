import type { CalendarioMesResponse, ActividadCalendario } from '@/types';
import * as LucideIcons from 'lucide-react';
import { Instagram } from 'lucide-react';

interface CalendarioExportableProps {
  mes: number;
  anio: number;
  calendario: CalendarioMesResponse;
  subtitulo?: string;
  versiculo?: string;
  showLegend?: boolean;
}

const DAYS_OF_WEEK = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
];

const DEFAULT_SUBTITULO = 'JÓVENES RENOVADOS EN SU PALABRA';
const DEFAULT_VERSICULO = 'Todo lo que hagáis, hacedlo de corazón, como para el Señor. #RenovadosEnSuPalabra Colosenses 3:23';

export default function CalendarioExportable({
  mes,
  anio,
  calendario,
  subtitulo = DEFAULT_SUBTITULO,
  versiculo = DEFAULT_VERSICULO,
  showLegend = true,
}: CalendarioExportableProps) {
  // Generate calendar grid - only necessary weeks
  const generateCalendarDays = () => {
    const firstDayOfMonth = new Date(anio, mes - 1, 1);
    const lastDayOfMonth = new Date(anio, mes, 0);
    const startDay = firstDayOfMonth.getDay();
    const totalDays = lastDayOfMonth.getDate();

    const days: { date: number | null; dateStr: string | null; activities: ActividadCalendario[] }[] = [];

    // Add empty cells for days before the first of the month
    for (let i = 0; i < startDay; i++) {
      days.push({ date: null, dateStr: null, activities: [] });
    }

    // Add days of the month
    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${anio}-${String(mes).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const activities = calendario?.actividadesPorDia[dateStr] || [];
      days.push({ date: day, dateStr, activities });
    }

    // Fill remaining cells to complete the last week (row) only
    while (days.length % 7 !== 0) {
      days.push({ date: null, dateStr: null, activities: [] });
    }

    return days;
  };

  const calendarDays = generateCalendarDays();
  const numberOfWeeks = calendarDays.length / 7;

  // Get unique activities for legend (by title and color)
  const getLegendItems = () => {
    const seen = new Map<string, { titulo: string; color: string; icono: string; hora?: string; horaFin?: string }>();

    calendario.actividades.forEach((activity) => {
      const key = `${activity.titulo}-${activity.color}`;
      if (!seen.has(key) && !activity.esCumpleanos) {
        seen.set(key, {
          titulo: activity.titulo,
          color: activity.color,
          icono: activity.icono,
          hora: activity.hora || undefined,
          horaFin: activity.horaFin || undefined,
        });
      }
    });

    // Check if there are birthdays
    const hasBirthdays = calendario.actividades.some(a => a.esCumpleanos);
    if (hasBirthdays) {
      seen.set('cumpleanos', {
        titulo: 'Cumpleaños',
        color: '#EC4899',
        icono: 'Cake',
      });
    }

    return Array.from(seen.values());
  };

  const legendItems = getLegendItems();

  // Render activity card - styled like reference image
  const renderActivity = (activity: ActividadCalendario, index: number) => {
    const iconName = activity.icono as keyof typeof LucideIcons;
    const IconComponent = LucideIcons[iconName] as React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
    const bgColor = activity.color;

    // Get display text
    let displayTitle = activity.titulo;
    let displaySubtitle = '';

    if (activity.esCumpleanos && activity.usuarioCumpleanos) {
      displayTitle = 'Celebración de Cumpleaños';
      displaySubtitle = activity.usuarioCumpleanos.nombre.split(' ')[0];
    } else if (activity.hora) {
      displaySubtitle = activity.hora;
      if (activity.horaFin) {
        displaySubtitle += ` - ${activity.horaFin}`;
      }
    }

    return (
      <div
        key={`${activity.id}-${index}`}
        style={{
          backgroundColor: bgColor,
          color: '#ffffff',
          borderRadius: '4px',
          padding: '4px 6px',
          marginBottom: '2px',
          fontSize: '9px',
          lineHeight: '1.2',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
          {IconComponent && (
            <IconComponent
              className="shrink-0"
              style={{ width: '14px', height: '14px', marginTop: '1px' }}
            />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {/* {displayTitle.length > 20 ? displayTitle.substring(0, 18) + '...' : displayTitle} */}
              {displayTitle}
            </div>
            {displaySubtitle && (
              <div style={{ fontSize: '8px', opacity: 0.9 }}>
                {displaySubtitle}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        width: '950px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        backgroundColor: '#ffffff',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          overflow: 'hidden',
        }}
      >
        {/* Left section - Blue with date and title */}
        <div
          style={{
            flex: 1,
            backgroundColor: '#1e40af',
            color: '#ffffff',
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <span style={{ fontSize: '52px', fontWeight: 'bold', lineHeight: 1 }}>
            {String(mes).padStart(2, '0')}
          </span>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 'bold', letterSpacing: '1px' }}>
              {MONTHS[mes - 1]} {anio}
            </div>
            <div style={{ fontSize: '12px', fontWeight: '500', letterSpacing: '0.5px', opacity: 0.9 }}>
              {subtitulo}
            </div>
          </div>
        </div>

        {/* Right section - Orange with Instagram */}
        <div
          style={{
            backgroundColor: '#f97316',
            color: '#ffffff',
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            minWidth: '160px',
          }}
        >
          <Instagram style={{ width: '24px', height: '24px' }} />
          <span style={{ fontSize: '16px', fontWeight: '600' }}>@ja.covima</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div style={{ padding: '0' }}>
        {/* Days of week header */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
          }}
        >
          {DAYS_OF_WEEK.map((day) => (
            <div
              key={day}
              style={{
                textAlign: 'center',
                padding: '10px 4px',
                fontWeight: '700',
                fontSize: '13px',
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                borderRight: '1px solid #60a5fa',
              }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days - dynamic rows based on month */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gridTemplateRows: `repeat(${numberOfWeeks}, minmax(90px, auto))`,
          }}
        >
          {calendarDays.map((day, index) => (
            <div
              key={index}
              style={{
                minHeight: '90px',
                padding: '4px',
                border: '1px solid #e2e8f0',
                borderTop: 'none',
                backgroundColor: day.date ? '#ffffff' : '#f8fafc',
                verticalAlign: 'top',
              }}
            >
              {day.date && (
                <>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: '600',
                      marginBottom: '3px',
                      color: '#1e293b',
                    }}
                  >
                    {day.date}
                  </div>
                  <div>
                    {day.activities.map((activity, actIndex) =>
                      renderActivity(activity, actIndex)
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      {showLegend && legendItems.length > 0 && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: '600',
              color: '#475569',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Leyenda
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '6px 24px',
            }}
          >
            {legendItems.map((item, index) => {
              const iconName = item.icono as keyof typeof LucideIcons;
              const IconComponent = LucideIcons[iconName] as React.ComponentType<{ style?: React.CSSProperties }>;

              // Build time string
              let timeStr = '';
              if (item.hora) {
                timeStr = item.hora;
                if (item.horaFin) {
                  timeStr += ` - ${item.horaFin}`;
                }
              }

              return (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '4px 0',
                  }}
                >
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '4px',
                      backgroundColor: item.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      flexShrink: 0,
                    }}
                  >
                    {IconComponent && <IconComponent style={{ width: '12px', height: '12px' }} />}
                  </div>
                  <span style={{ fontSize: '10px', color: '#334155' }}>
                    {item.titulo}
                    {timeStr && <span style={{ color: '#64748b' }}> ({timeStr})</span>}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer with verse */}
      <div
        style={{
          backgroundColor: '#1e40af',
          color: '#ffffff',
          padding: '12px 20px',
          textAlign: 'center',
          fontSize: '12px',
          fontStyle: 'italic',
        }}
      >
        {versiculo}
      </div>
    </div>
  );
}
