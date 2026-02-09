import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { ScreenshotFrame } from "../components/ScreenshotFrame";

const AttendanceCard: React.FC<{
  icon: string;
  title: string;
  desc: string;
  color: string;
  bgColor: string;
  delay: number;
}> = ({ icon, title, desc, color, bgColor, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({ frame: Math.max(0, frame - delay), fps, config: { damping: 15, stiffness: 120 } });
  const scale = interpolate(progress, [0, 1], [0.5, 1]);
  const opacity = interpolate(progress, [0, 1], [0, 1]);
  const y = interpolate(progress, [0, 1], [40, 0]);

  return (
    <div
      className="rounded-3xl p-8 flex flex-col items-center gap-4 w-80 shadow-xl"
      style={{
        backgroundColor: bgColor,
        transform: `scale(${scale}) translateY(${y}px)`,
        opacity,
      }}
    >
      <span className="text-7xl">{icon}</span>
      <h3 className="text-2xl font-bold" style={{ color }}>{title}</h3>
      <p className="text-lg text-gray-600 text-center">{desc}</p>
      <div className="bg-white/50 rounded-xl px-4 py-2">
        <p className="text-lg font-bold" style={{ color }}>+Puntos por asistir</p>
      </div>
    </div>
  );
};

export const PuntosScene: React.FC<{ screenshot?: string }> = ({ screenshot }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProgress = spring({ frame, fps, config: { damping: 200 } });
  const titleOpacity = interpolate(titleProgress, [0, 1], [0, 1]);
  const titleY = interpolate(titleProgress, [0, 1], [40, 0]);

  const subProgress = spring({ frame: Math.max(0, frame - 20), fps, config: { damping: 200 } });
  const subOpacity = interpolate(subProgress, [0, 1], [0, 1]);

  // Tip banner
  const tipProgress = spring({ frame: Math.max(0, frame - Math.round(2.5 * fps)), fps, config: { damping: 200 } });
  const tipOpacity = interpolate(tipProgress, [0, 1], [0, 1]);
  const tipY = interpolate(tipProgress, [0, 1], [20, 0]);

  return (
    <AbsoluteFill className="bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center">
      {/* Header */}
      <div className="text-center mb-10" style={{ opacity: titleOpacity, transform: `translateY(${titleY}px)` }}>
        <h2 className="text-6xl font-black text-gray-900">
          Gana puntos asistiendo
        </h2>
        <p className="text-2xl text-gray-500 mt-4 font-medium" style={{ opacity: subOpacity }}>
          Cada asistencia suma a tu progreso
        </p>
      </div>

      {/* Cards - 3 tipos de asistencia */}
      <div className="flex gap-8 mb-10">
        <AttendanceCard
          icon="⛪"
          title="Programa de Jóvenes"
          desc="Sábados por la tarde"
          color="#2563eb"
          bgColor="#eff6ff"
          delay={25}
        />
        <AttendanceCard
          icon="👥"
          title="Grupo Pequeño"
          desc="Reuniones semanales"
          color="#7c3aed"
          bgColor="#f5f3ff"
          delay={35}
        />
        <AttendanceCard
          icon="📖"
          title="Escuela Sabática"
          desc="Estudio de la lección"
          color="#0891b2"
          bgColor="#ecfeff"
          delay={45}
        />
      </div>

      {/* Tip */}
      <div
        className="bg-yellow-400 rounded-2xl px-10 py-5 shadow-lg max-w-2xl"
        style={{ opacity: tipOpacity, transform: `translateY(${tipY}px)` }}
      >
        <p className="text-2xl font-bold text-yellow-900 text-center">
          💡 ¡Entre más temprano llegues, más puntos ganas!
        </p>
      </div>
      {screenshot && <ScreenshotFrame src={screenshot} />}
    </AbsoluteFill>
  );
};
