import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo scale with spring
  const logoScale = spring({ frame, fps, config: { damping: 12, stiffness: 100 } });

  // Title slide up
  const titleProgress = spring({ frame: Math.max(0, frame - 15), fps, config: { damping: 200 } });
  const titleY = interpolate(titleProgress, [0, 1], [60, 0]);
  const titleOpacity = interpolate(titleProgress, [0, 1], [0, 1]);

  // Subtitle fade in
  const subtitleProgress = spring({ frame: Math.max(0, frame - 30), fps, config: { damping: 200 } });
  const subtitleOpacity = interpolate(subtitleProgress, [0, 1], [0, 1]);
  const subtitleY = interpolate(subtitleProgress, [0, 1], [30, 0]);

  // Question text
  const questionProgress = spring({ frame: Math.max(0, frame - 60), fps, config: { damping: 200 } });
  const questionOpacity = interpolate(questionProgress, [0, 1], [0, 1]);

  // Decorative circles
  const circle1Scale = spring({ frame: Math.max(0, frame - 5), fps, config: { damping: 15 } });
  const circle2Scale = spring({ frame: Math.max(0, frame - 10), fps, config: { damping: 15 } });

  return (
    <AbsoluteFill className="bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-800 flex items-center justify-center">
      {/* Decorative circles */}
      <div
        className="absolute w-96 h-96 rounded-full bg-blue-500/20 -top-20 -right-20"
        style={{ transform: `scale(${circle1Scale})` }}
      />
      <div
        className="absolute w-72 h-72 rounded-full bg-indigo-500/20 -bottom-16 -left-16"
        style={{ transform: `scale(${circle2Scale})` }}
      />

      {/* Content */}
      <div className="flex flex-col items-center gap-6 z-10">
        {/* Logo */}
        <div
          className="w-32 h-32 bg-white rounded-3xl flex items-center justify-center shadow-2xl"
          style={{ transform: `scale(${logoScale})` }}
        >
          <span className="text-6xl font-black text-blue-600">C</span>
        </div>

        {/* Title */}
        <div style={{ opacity: titleOpacity, transform: `translateY(${titleY}px)` }}>
          <h1 className="text-8xl font-black text-white tracking-tight">
            COVIMA
          </h1>
        </div>

        {/* Subtitle */}
        <div style={{ opacity: subtitleOpacity, transform: `translateY(${subtitleY}px)` }}>
          <p className="text-3xl text-blue-200 font-medium">
            Jóvenes Adventistas
          </p>
        </div>

        {/* Question */}
        <div
          className="mt-8 bg-white/10 backdrop-blur-sm rounded-2xl px-12 py-6 border border-white/20"
          style={{ opacity: questionOpacity }}
        >
          <p className="text-2xl text-white font-medium text-center">
            Tu compromiso con Dios y tu comunidad
            <br />
            <span className="text-yellow-300 font-bold">ahora tiene recompensa</span>
          </p>
        </div>
      </div>
    </AbsoluteFill>
  );
};
