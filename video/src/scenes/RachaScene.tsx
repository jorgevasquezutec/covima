import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { ScreenshotFrame } from "../components/ScreenshotFrame";

export const RachaScene: React.FC<{ screenshot?: string }> = ({ screenshot }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Title
  const titleProgress = spring({ frame, fps, config: { damping: 200 } });
  const titleOpacity = interpolate(titleProgress, [0, 1], [0, 1]);

  // Fire icon scale with bounce
  const fireScale = spring({ frame: Math.max(0, frame - 15), fps, config: { damping: 8, stiffness: 150 } });

  // Counter animation
  const counterFrame = Math.max(0, frame - 30);
  const counterProgress = spring({ frame: counterFrame, fps, config: { damping: 200 } });
  const targetNumber = 12;
  const displayNumber = Math.round(interpolate(counterProgress, [0, 1], [0, targetNumber]));

  // Weeks grid
  const gridProgress = spring({ frame: Math.max(0, frame - 50), fps, config: { damping: 200 } });
  const gridOpacity = interpolate(gridProgress, [0, 1], [0, 1]);

  // Tip text
  const tipProgress = spring({ frame: Math.max(0, frame - 80), fps, config: { damping: 200 } });
  const tipOpacity = interpolate(tipProgress, [0, 1], [0, 1]);
  const tipY = interpolate(tipProgress, [0, 1], [20, 0]);

  // Week cells - simulating a streak
  const weeks = Array.from({ length: 16 }, (_, i) => ({
    active: i < 12,
    current: i === 11,
  }));

  return (
    <AbsoluteFill className="bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 flex flex-col items-center justify-center">
      {/* Title */}
      <div className="text-center mb-8" style={{ opacity: titleOpacity }}>
        <h2 className="text-6xl font-black text-white">La Racha</h2>
      </div>

      {/* Fire + Counter */}
      <div className="flex items-center gap-8 mb-10">
        <div style={{ transform: `scale(${fireScale})` }}>
          <span className="text-[120px] leading-none">🔥</span>
        </div>
        <div className="text-center">
          <p className="text-[120px] font-black text-white leading-none">
            {displayNumber}
          </p>
          <p className="text-3xl font-bold text-white/80 mt-2">
            semanas seguidas
          </p>
        </div>
      </div>

      {/* Week Grid */}
      <div className="flex gap-3 mb-10" style={{ opacity: gridOpacity }}>
        {weeks.map((week, i) => {
          const cellDelay = 50 + i * 3;
          const cellProgress = spring({ frame: Math.max(0, frame - cellDelay), fps, config: { damping: 15 } });
          const cellScale = interpolate(cellProgress, [0, 1], [0, 1]);

          return (
            <div
              key={i}
              className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold ${
                week.current
                  ? "bg-white text-orange-600 ring-4 ring-white/50"
                  : week.active
                    ? "bg-white/30 text-white"
                    : "bg-black/10 text-white/30"
              }`}
              style={{ transform: `scale(${cellScale})` }}
            >
              {i + 1}
            </div>
          );
        })}
      </div>

      {/* Tip */}
      <div
        className="bg-white/20 backdrop-blur-sm rounded-2xl px-10 py-5 border border-white/30"
        style={{ opacity: tipOpacity, transform: `translateY(${tipY}px)` }}
      >
        <p className="text-2xl font-bold text-white text-center">
          Tu constancia refleja tu compromiso con Dios 🙏
        </p>
      </div>
      {screenshot && <ScreenshotFrame src={screenshot} />}
    </AbsoluteFill>
  );
};
