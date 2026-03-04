import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Calendar, Clock, Users, Link as LinkIcon, Loader2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Programa } from '@/types';
import api from '@/services/api';
import { parseLocalDate } from '@/lib/utils';

export default function ProgramaPublicPage() {
  const { codigo } = useParams<{ codigo: string }>();
  const [programa, setPrograma] = useState<Programa | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [carouselImages, setCarouselImages] = useState<{ url: string; nombre?: string }[]>([]);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const touchStartX = useRef(0);

  const closeCarousel = useCallback(() => setCarouselImages([]), []);

  const openCarousel = useCallback((images: { url: string; nombre?: string }[], startIndex: number) => {
    setCarouselImages(images);
    setCarouselIndex(startIndex);
  }, []);

  const goNext = useCallback(() => {
    setCarouselIndex(i => (i + 1) % carouselImages.length);
  }, [carouselImages.length]);

  const goPrev = useCallback(() => {
    setCarouselIndex(i => (i - 1 + carouselImages.length) % carouselImages.length);
  }, [carouselImages.length]);

  useEffect(() => {
    if (!codigo) return;
    api
      .get<Programa>(`/programas/public/${codigo}`)
      .then((res) => setPrograma(res.data))
      .catch(() => setError('Programa no encontrado'))
      .finally(() => setLoading(false));
  }, [codigo]);

  // Keyboard navigation for carousel
  useEffect(() => {
    if (carouselImages.length === 0) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'Escape') closeCarousel();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [carouselImages.length, goNext, goPrev, closeCarousel]);

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

  const getBaseUrl = () => {
    if (import.meta.env.VITE_API_URL) {
      return import.meta.env.VITE_API_URL.replace(/\/api$/, '');
    }
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      return `http://${window.location.hostname}:3000`;
    }
    return 'http://localhost:3000';
  };

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
      fotos: { url: string; nombre?: string }[];
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
      fotos: [],
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

  // Agregar fotos
  for (const foto of programa.fotos) {
    const p = parteMap.get(foto.parte.id);
    if (p) {
      p.fotos.push({ url: foto.url, nombre: foto.nombre });
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
        {partesOrdenadas.map((parte, i) => {
          const esBienvenida = parte.nombre.toLowerCase().includes('bienvenida');
          const visitas = programa.visitas || [];
          return (
            <div key={i}>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
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

                  {/* Fotos/Videos — thumbnails */}
                  {parte.fotos.length > 0 && (() => {
                    const imageFotos = parte.fotos.filter(f => !/\.(mp4|webm|mov)$/i.test(f.url));
                    const carouselItems = imageFotos.map(f => ({ url: `${getBaseUrl()}${f.url}`, nombre: f.nombre }));
                    return (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {parte.fotos.map((foto, j) => {
                        const fullUrl = `${getBaseUrl()}${foto.url}`;
                        const isVideo = /\.(mp4|webm|mov)$/i.test(foto.url);
                        return isVideo ? (
                          <video
                            key={j}
                            src={fullUrl}
                            controls
                            className="w-full rounded-lg border border-gray-200"
                          />
                        ) : (
                          <button
                            key={j}
                            onClick={() => {
                              const idx = carouselItems.findIndex(c => c.url === fullUrl);
                              openCarousel(carouselItems, idx >= 0 ? idx : 0);
                            }}
                            className="relative group"
                            title={foto.nombre || `Foto ${j + 1}`}
                          >
                            <img
                              src={fullUrl}
                              alt={foto.nombre || `Foto ${j + 1}`}
                              className="w-16 h-16 object-cover rounded-lg border border-gray-200 group-hover:border-blue-400 transition-colors"
                            />
                            {foto.nombre && (
                              <p className="text-[10px] text-gray-500 mt-0.5 truncate max-w-16">{foto.nombre}</p>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    );
                  })()}
                </div>
              </div>
              {esBienvenida && visitas.length > 0 && (
                <div className="mt-2 mx-1 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="font-semibold text-amber-800 text-sm mb-1.5">
                    Visitas ({visitas.length}):
                  </p>
                  <div className="space-y-0.5">
                    {visitas.map((v) => (
                      <p key={v.id} className="text-sm text-amber-700">
                        {v.nombre} — {v.procedencia}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

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

      {/* Carousel Lightbox */}
      {carouselImages.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center"
          onClick={closeCarousel}
          onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => {
            const diff = e.changedTouches[0].clientX - touchStartX.current;
            if (Math.abs(diff) > 50) {
              if (diff < 0) goNext(); else goPrev();
            }
          }}
        >
          {/* Close */}
          <button
            onClick={closeCarousel}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-2 z-10"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Counter */}
          {carouselImages.length > 1 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/70 text-sm z-10">
              {carouselIndex + 1} / {carouselImages.length}
            </div>
          )}

          {/* Image */}
          <div className="flex-1 flex items-center justify-center w-full px-12 sm:px-16" onClick={(e) => e.stopPropagation()}>
            <img
              src={carouselImages[carouselIndex].url}
              alt={carouselImages[carouselIndex].nombre || ''}
              className="max-w-full max-h-[85vh] rounded-lg object-contain select-none"
              draggable={false}
            />
          </div>

          {/* Caption */}
          {carouselImages[carouselIndex].nombre && (
            <p className="text-white/80 text-sm text-center pb-4 px-4">
              {carouselImages[carouselIndex].nombre}
            </p>
          )}

          {/* Nav arrows */}
          {carouselImages.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); goPrev(); }}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 text-white/60 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); goNext(); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-white/60 hover:text-white transition-colors"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            </>
          )}

          {/* Dots */}
          {carouselImages.length > 1 && carouselImages.length <= 10 && (
            <div className="flex gap-1.5 pb-4">
              {carouselImages.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => { e.stopPropagation(); setCarouselIndex(idx); }}
                  className={`w-2 h-2 rounded-full transition-colors ${idx === carouselIndex ? 'bg-white' : 'bg-white/30'}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
