import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Calendar, Clock, Users, Link as LinkIcon, Loader2 } from 'lucide-react';
import type { Programa } from '@/types';
import api from '@/services/api';
import { parseLocalDate } from '@/lib/utils';

export default function ProgramaPublicPage() {
  const { codigo } = useParams<{ codigo: string }>();
  const [programa, setPrograma] = useState<Programa | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!codigo) return;
    api
      .get<Programa>(`/programas/public/${codigo}`)
      .then((res) => setPrograma(res.data))
      .catch(() => setError('Programa no encontrado'))
      .finally(() => setLoading(false));
  }, [codigo]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !programa) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-2xl mb-4">
            <Calendar className="w-8 h-8 text-gray-400" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Programa no encontrado</h1>
          <p className="text-gray-500">El código no es válido o el programa fue eliminado.</p>
        </div>
      </div>
    );
  }

  const fecha = parseLocalDate(programa.fecha);
  const fechaStr = fecha.toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Agrupar asignaciones por parte
  const parteMap = new Map<
    number,
    {
      nombre: string;
      orden: number;
      esFija: boolean;
      textoFijo?: string;
      asignados: string[];
      links: { nombre: string; url: string }[];
    }
  >();

  // Inicializar con partes del programa
  for (const pp of programa.partes) {
    parteMap.set(pp.parte.id, {
      nombre: pp.parte.nombre,
      orden: pp.orden,
      esFija: pp.parte.esFija,
      textoFijo: pp.parte.textoFijo,
      asignados: [],
      links: [],
    });
  }

  // Agregar asignaciones
  for (const asig of programa.asignaciones) {
    const p = parteMap.get(asig.parte.id);
    if (p) {
      const nombre = asig.usuario?.nombre || asig.nombreLibre || 'Sin asignar';
      p.asignados.push(nombre);
    }
  }

  // Agregar links
  for (const link of programa.links) {
    const p = parteMap.get(link.parte.id);
    if (p) {
      p.links.push({ nombre: link.nombre, url: link.url });
    }
  }

  const partesOrdenadas = Array.from(parteMap.values()).sort(
    (a, b) => a.orden - b.orden,
  );

  const formatHora = (h: string | null | undefined) => {
    if (!h) return null;
    // Si ya es formato "HH:mm", devolverlo directo
    if (/^\d{2}:\d{2}$/.test(h)) return h;
    const d = new Date(h);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  };

  const horaInicio = formatHora(programa.horaInicio);
  const horaFin = formatHora(programa.horaFin);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30">
              <span className="text-sm font-bold">JA</span>
            </div>
            <div>
              <h1 className="text-lg font-bold">Covima</h1>
              <p className="text-indigo-200 text-xs">Jóvenes Adventistas</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-2">{programa.titulo}</h2>

          <div className="flex flex-wrap gap-4 text-sm text-indigo-100">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <span className="capitalize">{fechaStr}</span>
            </span>
            {horaInicio && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {horaInicio}{horaFin ? ` - ${horaFin}` : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">
        {partesOrdenadas.map((parte, i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
          >
            <div className="px-4 py-3">
              {/* Nombre de la parte */}
              <h3 className="font-semibold text-gray-900 text-sm">{parte.nombre}</h3>

              {/* Texto fijo */}
              {parte.esFija && parte.textoFijo && (
                <p className="text-gray-500 text-sm mt-1">{parte.textoFijo}</p>
              )}

              {/* Asignados */}
              {parte.asignados.length > 0 && (
                <div className="flex items-center gap-1.5 mt-2 text-sm text-gray-600">
                  <Users className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>{parte.asignados.join(', ')}</span>
                </div>
              )}

              {/* Links */}
              {parte.links.length > 0 && (
                <div className="mt-2 space-y-1">
                  {parte.links.map((link, j) => (
                    <a
                      key={j}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      <LinkIcon className="w-3.5 h-3.5 shrink-0" />
                      {link.nombre}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {partesOrdenadas.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <p>No hay partes asignadas aún.</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="max-w-2xl mx-auto px-4 pb-8">
        <p className="text-center text-gray-400 text-xs">
          Código: {programa.codigo}
        </p>
      </div>
    </div>
  );
}
