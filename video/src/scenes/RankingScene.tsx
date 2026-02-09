import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { ScreenshotFrame } from "../components/ScreenshotFrame";

const podiumData = [
  { place: 2, name: "María López", points: 142, icon: "🥈", height: 200, color: "#94a3b8", delay: 25 },
  { place: 1, name: "Carlos Ruiz", points: 187, icon: "🥇", height: 260, color: "#fbbf24", delay: 15 },
  { place: 3, name: "Ana Torres", points: 128, icon: "🥉", height: 160, color: "#c2854a", delay: 35 },
];

export const RankingScene: React.FC<{ screenshot?: string }> = ({ screenshot }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Title
  const titleProgress = spring({ frame, fps, config: { damping: 200 } });
  const titleOpacity = interpolate(titleProgress, [0, 1], [0, 1]);
  const titleY = interpolate(titleProgress, [0, 1], [40, 0]);

  // Trophy bounce
  const trophyScale = spring({ frame: Math.max(0, frame - 10), fps, config: { damping: 8, stiffness: 150 } });

  // Extra rows
  const rowsProgress = spring({ frame: Math.max(0, frame - 70), fps, config: { damping: 200 } });
  const rowsOpacity = interpolate(rowsProgress, [0, 1], [0, 1]);

  // Period badge
  const periodProgress = spring({ frame: Math.max(0, frame - 90), fps, config: { damping: 200 } });
  const periodOpacity = interpolate(periodProgress, [0, 1], [0, 1]);

  return (
    <AbsoluteFill className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center">
      {/* Header */}
      <div className="text-center mb-10" style={{ opacity: titleOpacity, transform: `translateY(${titleY}px)` }}>
        <div style={{ transform: `scale(${trophyScale})`, display: "inline-block" }}>
          <span className="text-7xl">🏆</span>
        </div>
        <h2 className="text-6xl font-black text-white mt-4">El Ranking</h2>
      </div>

      {/* Podium */}
      <div className="flex items-end gap-6 mb-10">
        {podiumData.map((item) => {
          const progress = spring({
            frame: Math.max(0, frame - item.delay),
            fps,
            config: { damping: 12, stiffness: 80 },
          });
          const podiumHeight = interpolate(progress, [0, 1], [0, item.height]);
          const contentOpacity = interpolate(progress, [0, 1], [0, 1]);

          return (
            <div key={item.place} className="flex flex-col items-center gap-3">
              {/* Avatar + Name */}
              <div className="flex flex-col items-center" style={{ opacity: contentOpacity }}>
                <span className="text-5xl mb-2">{item.icon}</span>
                <div className="w-20 h-20 rounded-full bg-gray-600 flex items-center justify-center text-3xl">
                  👤
                </div>
                <p className="text-lg font-bold text-white mt-2">{item.name}</p>
                <p className="text-sm font-medium" style={{ color: item.color }}>
                  {item.points} pts
                </p>
              </div>
              {/* Podium bar */}
              <div
                className="w-44 rounded-t-2xl flex items-end justify-center pb-4"
                style={{
                  height: podiumHeight,
                  background: `linear-gradient(to top, ${item.color}40, ${item.color}20)`,
                  borderTop: `3px solid ${item.color}`,
                }}
              >
                <span className="text-5xl font-black text-white/80">{item.place}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Extra ranking rows */}
      <div className="flex flex-col gap-2 w-full max-w-xl" style={{ opacity: rowsOpacity }}>
        {[
          { pos: 4, name: "Pedro García", pts: 115 },
          { pos: 5, name: "Lucía Ríos", pts: 98 },
        ].map((row) => (
          <div key={row.pos} className="flex items-center bg-white/5 rounded-xl px-6 py-3 border border-white/10">
            <span className="text-lg font-bold text-gray-400 w-8">{row.pos}</span>
            <span className="text-lg text-white font-medium flex-1 ml-4">{row.name}</span>
            <span className="text-lg font-bold text-blue-400">{row.pts} pts</span>
          </div>
        ))}
      </div>

      {/* Period badge */}
      <div
        className="mt-6 bg-blue-600/30 rounded-full px-8 py-3 border border-blue-400/30"
        style={{ opacity: periodOpacity }}
      >
        <p className="text-lg text-blue-300 font-medium">
          Cada trimestre es una nueva oportunidad para crecer juntos
        </p>
      </div>
      {screenshot && <ScreenshotFrame src={screenshot} />}
    </AbsoluteFill>
  );
};
