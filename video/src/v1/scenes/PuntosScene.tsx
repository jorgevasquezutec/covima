import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

const PointCard: React.FC<{
  icon: string;
  title: string;
  points: string;
  xp: string;
  color: string;
  bgColor: string;
  delay: number;
}> = ({ icon, title, points, xp, color, bgColor, delay }) => {
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
      <span className="text-6xl">{icon}</span>
      <h3 className="text-2xl font-bold" style={{ color }}>{title}</h3>
      <div className="flex gap-6">
        <div className="text-center">
          <p className="text-4xl font-black" style={{ color }}>{points}</p>
          <p className="text-sm font-medium text-gray-500">PUNTOS</p>
        </div>
        <div className="text-center">
          <p className="text-4xl font-black text-purple-600">{xp}</p>
          <p className="text-sm font-medium text-gray-500">XP</p>
        </div>
      </div>
    </div>
  );
};

export const PuntosScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProgress = spring({ frame, fps, config: { damping: 200 } });
  const titleOpacity = interpolate(titleProgress, [0, 1], [0, 1]);
  const titleY = interpolate(titleProgress, [0, 1], [40, 0]);

  const subProgress = spring({ frame: Math.max(0, frame - 20), fps, config: { damping: 200 } });
  const subOpacity = interpolate(subProgress, [0, 1], [0, 1]);

  // Tip banner (inline, no AbsoluteFill)
  const tipProgress = spring({ frame: Math.max(0, frame - Math.round(2.5 * fps)), fps, config: { damping: 200 } });
  const tipOpacity = interpolate(tipProgress, [0, 1], [0, 1]);
  const tipY = interpolate(tipProgress, [0, 1], [20, 0]);

  return (
    <AbsoluteFill className="bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col items-center justify-center">
      {/* Header */}
      <div className="text-center mb-10" style={{ opacity: titleOpacity, transform: `translateY(${titleY}px)` }}>
        <h2 className="text-6xl font-black text-gray-900">
          ¿Cómo gano puntos?
        </h2>
        <p className="text-2xl text-gray-500 mt-4 font-medium" style={{ opacity: subOpacity }}>
          Cada sábado que vienes al programa ganas puntos
        </p>
      </div>

      {/* Cards */}
      <div className="flex gap-8 mb-10">
        <PointCard icon="⏰" title="Temprano" points="5" xp="8" color="#16a34a" bgColor="#f0fdf4" delay={30} />
        <PointCard icon="✓" title="A tiempo" points="3" xp="5" color="#2563eb" bgColor="#eff6ff" delay={40} />
        <PointCard icon="⏳" title="Tarde" points="1" xp="2" color="#ea580c" bgColor="#fff7ed" delay={50} />
      </div>

      {/* Tip - now inline, not absolute */}
      <div
        className="bg-yellow-400 rounded-2xl px-10 py-5 shadow-lg max-w-2xl"
        style={{ opacity: tipOpacity, transform: `translateY(${tipY}px)` }}
      >
        <p className="text-2xl font-bold text-yellow-900 text-center">
          💡 Entre más temprano llegues, ¡más puntos ganas!
        </p>
      </div>
    </AbsoluteFill>
  );
};
