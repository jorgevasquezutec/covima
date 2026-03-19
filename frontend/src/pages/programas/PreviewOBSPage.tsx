import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { programasApi } from '@/services/api';
import { downloadOBSSceneCollection, DEFAULT_OBS_THEME } from '@/lib/obs-scene-export';
import OBSThemeEditor from '@/components/OBSThemeEditor';
import type { OBSThemeWithOverrides, Programa } from '@/types';
import type { SceneData } from '@/components/OBSThemeEditor';
import type { OBSExportParte } from '@/lib/obs-scene-export';

function buildScenes(programa: Programa): SceneData[] {
  const sorted = [...programa.partes].sort((a, b) => a.orden - b.orden);

  return sorted.map((pp) => {
    const parteId = pp.parteId;
    const links = programa.links
      .filter((l) => l.parte.id === parteId && l.url)
      .sort((a, b) => a.orden - b.orden)
      .map((l) => ({
        nombre: l.nombre,
        url: l.url,
        mediaUrl: l.mediaItem?.url ?? null,
      }));

    const fotos = programa.fotos
      .filter((f) => f.parte.id === parteId && f.url)
      .sort((a, b) => a.orden - b.orden)
      .map((f) => ({ url: f.url, nombre: f.nombre }));

    const esBienvenida = pp.parte.nombre.toLowerCase().includes('bienvenida');
    const visitas =
      esBienvenida && programa.visitas && programa.visitas.length > 0
        ? programa.visitas.map((v) => `${v.nombre} — ${v.procedencia}`)
        : undefined;

    return {
      nombre: pp.parte.nombre,
      parteId: pp.parteId,
      visitas,
      links: links.length > 0 ? links : undefined,
      fotos: fotos.length > 0 ? fotos : undefined,
    };
  });
}

export default function PreviewOBSPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: programa, isLoading } = useQuery({
    queryKey: ['programa', id],
    queryFn: () => programasApi.getOne(parseInt(id!)),
    enabled: !!id,
  });

  const queryClient = useQueryClient();
  const [theme, setTheme] = useState<OBSThemeWithOverrides | null>(null);

  const obsTheme = theme ?? programa?.obsTheme ?? { ...DEFAULT_OBS_THEME };

  const handleThemeChange = useCallback((newTheme: OBSThemeWithOverrides) => {
    setTheme(newTheme);
  }, []);

  // Auto-save: persists theme to backend and updates cache
  const handleSave = useCallback(
    (t: OBSThemeWithOverrides) => {
      if (!programa) return;
      // Strip runtime-only fields before saving (e.g. _processedLogoUrl is a huge data URL)
      const { _processedLogoUrl, ...persistable } = t;
      programasApi.update(programa.id, { obsTheme: persistable }).then(() => {
        queryClient.setQueryData(['programa', id], (old: Programa | undefined) =>
          old ? { ...old, obsTheme: persistable } : old,
        );
      }).catch(() => {
        toast.error('Error al guardar tema OBS');
      });
    },
    [programa, queryClient, id],
  );

  const handleBack = useCallback(() => {
    navigate(`/programas/${id}/editar`);
  }, [id, navigate]);

  const handleExport = useCallback(() => {
    if (!programa) return;

    const partes: OBSExportParte[] = [...programa.partes]
      .sort((a, b) => a.orden - b.orden)
      .map((pp) => ({
        nombre: pp.parte.nombre,
        parteId: pp.parteId,
        participantes: [],
        links: programa.links
          .filter((l) => l.parte.id === pp.parteId)
          .map((l) => ({ nombre: l.nombre, url: l.url, mediaUrl: l.mediaItem?.url ?? null })),
        fotos: programa.fotos
          .filter((f) => f.parte.id === pp.parteId)
          .map((f) => ({ url: f.url, nombre: f.nombre })),
      }));

    downloadOBSSceneCollection({
      titulo: programa.titulo || 'Programa JA',
      fecha: programa.fecha.split('T')[0],
      partes,
      visitas: programa.visitas?.map((v) => ({ nombre: v.nombre, procedencia: v.procedencia })),
      theme: obsTheme,
    });
    toast.success('Archivo OBS exportado');
  }, [programa, obsTheme]);

  if (isLoading || !programa) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950">
        <div className="text-neutral-400 text-sm">Cargando programa...</div>
      </div>
    );
  }

  const scenes = buildScenes(programa);

  return (
    <OBSThemeEditor
      partes={scenes}
      theme={obsTheme}
      onChange={handleThemeChange}
      onSave={handleSave}
      onExport={handleExport}
      onBack={handleBack}
    />
  );
}
