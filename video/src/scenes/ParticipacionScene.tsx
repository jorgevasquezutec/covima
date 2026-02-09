import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { ScreenshotFrame } from "../components/ScreenshotFrame";

const SmallItem: React.FC<{
  icon: string;
  label: string;
  delay: number;
  fromRight?: boolean;
}> = ({ icon, label, delay, fromRight = false }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({ frame: Math.max(0, frame - delay), fps, config: { damping: 15, stiffness: 120 } });
  const x = interpolate(progress, [0, 1], [fromRight ? 40 : -40, 0]);
  const opacity = interpolate(progress, [0, 1], [0, 1]);

  return (
    <div
      className="flex items-center gap-3 bg-white rounded-xl px-5 py-3 shadow-sm border border-gray-100"
      style={{ transform: `translateX(${x}px)`, opacity }}
    >
      <span className="text-2xl">{icon}</span>
      <p className="text-lg font-semibold text-gray-800">{label}</p>
    </div>
  );
};

export const ParticipacionScene: React.FC<{ screenshot?: string }> = ({ screenshot }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProgress = spring({ frame, fps, config: { damping: 200 } });
  const titleOpacity = interpolate(titleProgress, [0, 1], [0, 1]);
  const titleY = interpolate(titleProgress, [0, 1], [40, 0]);

  // Section headers
  const section1Progress = spring({ frame: Math.max(0, frame - 15), fps, config: { damping: 200 } });
  const section2Progress = spring({ frame: Math.max(0, frame - 60), fps, config: { damping: 200 } });

  return (
    <AbsoluteFill className="bg-gradient-to-br from-purple-50 to-indigo-50 flex flex-col items-center justify-center px-20">
      {/* Header */}
      <div className="text-center mb-8" style={{ opacity: titleOpacity, transform: `translateY(${titleY}px)` }}>
        <h2 className="text-5xl font-black text-gray-900">
          Participa y gana más
        </h2>
      </div>

      {/* Two columns */}
      <div className="flex gap-12 w-full max-w-5xl">
        {/* Participación en el programa */}
        <div className="flex-1">
          <div
            className="flex items-center gap-3 mb-4"
            style={{ opacity: interpolate(section1Progress, [0, 1], [0, 1]) }}
          >
            <span className="text-3xl">🎯</span>
            <h3 className="text-2xl font-bold text-purple-700">En el Programa</h3>
          </div>
          <div className="flex flex-col gap-3">
            <SmallItem icon="🎤" label="Dirigir el programa" delay={20} />
            <SmallItem icon="📖" label="Presentar el tema" delay={28} />
            <SmallItem icon="🎵" label="Cantar un especial" delay={36} />
            <SmallItem icon="💬" label="Dar testimonio" delay={44} />
            <SmallItem icon="🙏" label="Oración" delay={52} />
          </div>
        </div>

        {/* Eventos especiales */}
        <div className="flex-1">
          <div
            className="flex items-center gap-3 mb-4"
            style={{ opacity: interpolate(section2Progress, [0, 1], [0, 1]) }}
          >
            <span className="text-3xl">🌟</span>
            <h3 className="text-2xl font-bold text-orange-600">Eventos Especiales</h3>
          </div>
          <div className="flex flex-col gap-3">
            <SmallItem icon="📅" label="Discípulo 13 (D13)" delay={65} fromRight />
            <SmallItem icon="🏥" label="Visita al asilo" delay={73} fromRight />
            <SmallItem icon="💝" label="Día de la amistad" delay={81} fromRight />
            <SmallItem icon="🙏" label="Ayunos" delay={89} fromRight />
            <SmallItem icon="📿" label="Semanas de oración" delay={97} fromRight />
          </div>
        </div>
      </div>

      {/* Tip */}
      <div
        className="mt-8 bg-green-100 rounded-xl px-8 py-4"
        style={{
          opacity: interpolate(spring({ frame: Math.max(0, frame - 110), fps, config: { damping: 200 } }), [0, 1], [0, 1])
        }}
      >
        <p className="text-xl font-bold text-green-700">¡Cada actividad suma puntos a tu progreso!</p>
      </div>
      {screenshot && <ScreenshotFrame src={screenshot} />}
    </AbsoluteFill>
  );
};
