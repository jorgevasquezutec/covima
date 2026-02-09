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

  // Feature bullets appear
  const feature1Progress = spring({ frame: Math.max(0, frame - 55), fps, config: { damping: 200 } });
  const feature2Progress = spring({ frame: Math.max(0, frame - 70), fps, config: { damping: 200 } });
  const feature3Progress = spring({ frame: Math.max(0, frame - 85), fps, config: { damping: 200 } });

  // Decorative circles
  const circle1Scale = spring({ frame: Math.max(0, frame - 5), fps, config: { damping: 15 } });
  const circle2Scale = spring({ frame: Math.max(0, frame - 10), fps, config: { damping: 15 } });

  const features = [
    { icon: "🏆", text: "Gana puntos por tu compromiso", progress: feature1Progress },
    { icon: "📊", text: "Sube de nivel y compite con tu grupo", progress: feature2Progress },
    { icon: "🎯", text: "Cada acción cuenta y se registra", progress: feature3Progress },
  ];

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
          className="w-28 h-28 bg-white rounded-3xl flex items-center justify-center shadow-2xl"
          style={{ transform: `scale(${logoScale})` }}
        >
          <span className="text-4xl font-black text-blue-600">JA</span>
        </div>

        {/* Title */}
        <div style={{ opacity: titleOpacity, transform: `translateY(${titleY}px)` }}>
          <h1 className="text-7xl font-black text-white tracking-tight">
            COVIMA
          </h1>
        </div>

        {/* Subtitle - now explains what it is */}
        <div style={{ opacity: subtitleOpacity, transform: `translateY(${subtitleY}px)` }}>
          <p className="text-3xl text-blue-200 font-medium text-center">
            El sistema que <span className="text-yellow-300 font-bold">recompensa tu fidelidad</span>
          </p>
        </div>

        {/* Feature bullets */}
        <div className="flex flex-col gap-4 mt-6">
          {features.map((feature, i) => (
            <div
              key={i}
              className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-xl px-8 py-4 border border-white/20"
              style={{
                opacity: interpolate(feature.progress, [0, 1], [0, 1]),
                transform: `translateX(${interpolate(feature.progress, [0, 1], [i % 2 === 0 ? -40 : 40, 0])}px)`,
              }}
            >
              <span className="text-3xl">{feature.icon}</span>
              <span className="text-xl text-white font-medium">{feature.text}</span>
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
