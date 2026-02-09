import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Question mark animation
  const questionScale = spring({ frame, fps, config: { damping: 8, stiffness: 80 } });

  // Main question text
  const questionProgress = spring({ frame: Math.max(0, frame - 20), fps, config: { damping: 200 } });
  const questionOpacity = interpolate(questionProgress, [0, 1], [0, 1]);
  const questionY = interpolate(questionProgress, [0, 1], [40, 0]);

  // Sub-questions appear one by one
  const sub1Progress = spring({ frame: Math.max(0, frame - 50), fps, config: { damping: 200 } });
  const sub2Progress = spring({ frame: Math.max(0, frame - 70), fps, config: { damping: 200 } });
  const sub3Progress = spring({ frame: Math.max(0, frame - 90), fps, config: { damping: 200 } });

  // Pulse effect on question mark
  const pulse = Math.sin(frame * 0.15) * 0.05 + 1;

  return (
    <AbsoluteFill className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => {
          const x = (i * 137) % 100;
          const y = ((i * 73) % 100);
          const delay = i * 5;
          const particleProgress = spring({ frame: Math.max(0, frame - delay), fps, config: { damping: 30 } });
          return (
            <div
              key={i}
              className="absolute w-2 h-2 bg-blue-500/20 rounded-full"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                opacity: interpolate(particleProgress, [0, 1], [0, 0.5]),
                transform: `scale(${interpolate(particleProgress, [0, 1], [0, 1 + Math.random()])})`,
              }}
            />
          );
        })}
      </div>

      {/* Content */}
      <div className="flex flex-col items-center gap-8 z-10 px-16">
        {/* Big question mark */}
        <div
          className="text-9xl font-black text-blue-500/30"
          style={{ transform: `scale(${questionScale * pulse})` }}
        >
          ?
        </div>

        {/* Main question */}
        <div
          className="text-center"
          style={{ opacity: questionOpacity, transform: `translateY(${questionY}px)` }}
        >
          <h1 className="text-6xl font-black text-white leading-tight">
            ¿Vienes cada sábado
            <br />
            <span className="text-blue-400">y aún no te involucras?</span>
          </h1>
        </div>

        {/* Sub-questions */}
        <div className="flex flex-col items-center gap-4 mt-8">
          <div
            className="flex items-center gap-3 bg-white/5 backdrop-blur-sm rounded-xl px-6 py-3 border border-white/10"
            style={{
              opacity: interpolate(sub1Progress, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(sub1Progress, [0, 1], [-30, 0])}px)`,
            }}
          >
            <span className="text-2xl">🌱</span>
            <span className="text-xl text-white/80">¿Quieres crecer espiritualmente?</span>
          </div>

          <div
            className="flex items-center gap-3 bg-white/5 backdrop-blur-sm rounded-xl px-6 py-3 border border-white/10"
            style={{
              opacity: interpolate(sub2Progress, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(sub2Progress, [0, 1], [30, 0])}px)`,
            }}
          >
            <span className="text-2xl">📊</span>
            <span className="text-xl text-white/80">¿Te gustaría medir tu progreso?</span>
          </div>

          <div
            className="flex items-center gap-3 bg-white/5 backdrop-blur-sm rounded-xl px-6 py-3 border border-white/10"
            style={{
              opacity: interpolate(sub3Progress, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(sub3Progress, [0, 1], [-30, 0])}px)`,
            }}
          >
            <span className="text-2xl">🎯</span>
            <span className="text-xl text-white/80">¡Tenemos algo para ti!</span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
