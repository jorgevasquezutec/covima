import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

const levels = [
  { name: "Explorador", icon: "🌱", xp: 0, color: "#22c55e", unlocked: true },
  { name: "Discípulo", icon: "📖", xp: 100, color: "#3b82f6", unlocked: true },
  { name: "Guerrero", icon: "⚔️", xp: 300, color: "#8b5cf6", unlocked: true },
  { name: "Líder", icon: "👑", xp: 600, color: "#f59e0b", unlocked: false },
  { name: "Leyenda", icon: "🏆", xp: 1000, color: "#ef4444", unlocked: false },
];

export const NivelesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Title
  const titleProgress = spring({ frame, fps, config: { damping: 200 } });
  const titleOpacity = interpolate(titleProgress, [0, 1], [0, 1]);
  const titleY = interpolate(titleProgress, [0, 1], [40, 0]);

  // XP Bar animation
  const barFrame = Math.max(0, frame - 40);
  const barProgress = spring({ frame: barFrame, fps, config: { damping: 200 } });
  const barWidth = interpolate(barProgress, [0, 1], [0, 65]); // 65% of bar

  // Current XP counter
  const xpDisplay = Math.round(interpolate(barProgress, [0, 1], [0, 195]));

  return (
    <AbsoluteFill className="bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 flex flex-col items-center justify-center px-24">
      {/* Header */}
      <div className="text-center mb-12" style={{ opacity: titleOpacity, transform: `translateY(${titleY}px)` }}>
        <h2 className="text-6xl font-black text-white">Niveles y XP</h2>
        <p className="text-2xl text-purple-200 mt-3 font-medium">
          Acumula XP para subir de nivel
        </p>
      </div>

      {/* Level Path */}
      <div className="flex items-center gap-6 mb-12">
        {levels.map((level, i) => {
          const delay = 15 + i * 12;
          const progress = spring({ frame: Math.max(0, frame - delay), fps, config: { damping: 12, stiffness: 120 } });
          const scale = interpolate(progress, [0, 1], [0, 1]);
          const opacity = interpolate(progress, [0, 1], [0, 1]);

          return (
            <div key={i} className="flex items-center gap-6">
              <div
                className="flex flex-col items-center gap-2"
                style={{ transform: `scale(${scale})`, opacity }}
              >
                <div
                  className={`w-24 h-24 rounded-2xl flex items-center justify-center text-5xl shadow-lg ${
                    level.unlocked ? "bg-white" : "bg-white/20 backdrop-blur-sm"
                  }`}
                >
                  {level.unlocked ? level.icon : "🔒"}
                </div>
                <p className={`text-sm font-bold ${level.unlocked ? "text-white" : "text-white/40"}`}>
                  {level.name}
                </p>
                <p className="text-xs text-white/50">{level.xp} XP</p>
              </div>
              {i < levels.length - 1 && (
                <div className="w-10 h-1 bg-white/20 rounded-full">
                  <div
                    className="h-full rounded-full"
                    style={{
                      backgroundColor: level.unlocked ? level.color : "transparent",
                      width: level.unlocked ? "100%" : "0%",
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* XP Progress Bar */}
      <div className="w-full max-w-2xl">
        <div className="flex justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-3xl">⚔️</span>
            <span className="text-xl font-bold text-white">Guerrero</span>
          </div>
          <span className="text-xl font-bold text-white">
            {xpDisplay} / 300 XP
          </span>
        </div>
        <div className="w-full h-8 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-400 to-pink-400 rounded-full"
            style={{ width: `${barWidth}%` }}
          />
        </div>
        <p className="text-center text-purple-200 mt-3 text-lg font-medium">
          ¡Te faltan {300 - xpDisplay} XP para ser Líder! 👑
        </p>
      </div>
    </AbsoluteFill>
  );
};
