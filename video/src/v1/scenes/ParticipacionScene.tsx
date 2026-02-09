import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

const ActivityItem: React.FC<{
  icon: string;
  label: string;
  delay: number;
}> = ({ icon, label, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({ frame: Math.max(0, frame - delay), fps, config: { damping: 15, stiffness: 120 } });
  const x = interpolate(progress, [0, 1], [-60, 0]);
  const opacity = interpolate(progress, [0, 1], [0, 1]);

  return (
    <div
      className="flex items-center gap-5 bg-white rounded-2xl px-8 py-5 shadow-md border border-gray-100"
      style={{ transform: `translateX(${x}px)`, opacity }}
    >
      <span className="text-4xl">{icon}</span>
      <p className="text-2xl font-semibold text-gray-800">{label}</p>
      <div className="ml-auto bg-green-100 rounded-xl px-4 py-2">
        <p className="text-lg font-bold text-green-700">+Puntos</p>
      </div>
    </div>
  );
};

export const ParticipacionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProgress = spring({ frame, fps, config: { damping: 200 } });
  const titleOpacity = interpolate(titleProgress, [0, 1], [0, 1]);
  const titleY = interpolate(titleProgress, [0, 1], [40, 0]);

  return (
    <AbsoluteFill className="bg-gradient-to-br from-purple-50 to-indigo-50 flex flex-col items-center justify-center px-32">
      {/* Header */}
      <div className="text-center mb-12" style={{ opacity: titleOpacity, transform: `translateY(${titleY}px)` }}>
        <h2 className="text-6xl font-black text-gray-900">
          Participa y gana más
        </h2>
        <p className="text-2xl text-gray-500 mt-4 font-medium">
          Cada participación en el programa suma puntos extra
        </p>
      </div>

      {/* Activities */}
      <div className="flex flex-col gap-4 w-full max-w-3xl">
        <ActivityItem icon="🎤" label="Dirigir el programa" delay={20} />
        <ActivityItem icon="📖" label="Presentar el tema" delay={30} />
        <ActivityItem icon="🎵" label="Cantar un especial" delay={40} />
        <ActivityItem icon="💬" label="Dar testimonio" delay={50} />
        <ActivityItem icon="🌟" label="Eventos especiales" delay={60} />
      </div>
    </AbsoluteFill>
  );
};
