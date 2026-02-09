import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

export const EstudiosBiblicosScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Title animation
  const titleProgress = spring({ frame, fps, config: { damping: 200 } });
  const titleOpacity = interpolate(titleProgress, [0, 1], [0, 1]);
  const titleY = interpolate(titleProgress, [0, 1], [40, 0]);

  // Bible icon
  const bibleScale = spring({ frame: Math.max(0, frame - 10), fps, config: { damping: 10, stiffness: 100 } });

  // Steps animation
  const step1Progress = spring({ frame: Math.max(0, frame - 25), fps, config: { damping: 15 } });
  const step2Progress = spring({ frame: Math.max(0, frame - 40), fps, config: { damping: 15 } });
  const step3Progress = spring({ frame: Math.max(0, frame - 55), fps, config: { damping: 15 } });

  const steps = [
    { icon: "👥", title: "Registra", desc: "Agrega tus estudiantes en la web", progress: step1Progress },
    { icon: "📊", title: "Da seguimiento", desc: "Registra cada estudio realizado", progress: step2Progress },
    { icon: "🏆", title: "Gana puntos", desc: "Por cada estudio que completes", progress: step3Progress },
  ];

  return (
    <AbsoluteFill className="bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 flex flex-col items-center justify-center">
      {/* Decorative elements */}
      <div className="absolute top-10 right-20 text-8xl opacity-10">📖</div>
      <div className="absolute bottom-20 left-10 text-7xl opacity-10">✝️</div>

      {/* Header */}
      <div className="text-center mb-10" style={{ opacity: titleOpacity, transform: `translateY(${titleY}px)` }}>
        <div style={{ transform: `scale(${bibleScale})` }} className="inline-block mb-4">
          <span className="text-8xl">📖</span>
        </div>
        <h2 className="text-6xl font-black text-white">Estudios Bíblicos</h2>
        <p className="text-2xl text-emerald-100 mt-3 font-medium">
          ¡Comparte tu fe y gana puntos!
        </p>
      </div>

      {/* Steps */}
      <div className="flex gap-8 mb-10">
        {steps.map((step, i) => {
          const scale = interpolate(step.progress, [0, 1], [0.5, 1]);
          const opacity = interpolate(step.progress, [0, 1], [0, 1]);
          const y = interpolate(step.progress, [0, 1], [30, 0]);

          return (
            <div
              key={i}
              className="bg-white/15 backdrop-blur-sm rounded-3xl p-8 flex flex-col items-center gap-4 w-72 border border-white/20"
              style={{ transform: `scale(${scale}) translateY(${y}px)`, opacity }}
            >
              <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-5xl">{step.icon}</span>
              </div>
              <h3 className="text-2xl font-bold text-white">{step.title}</h3>
              <p className="text-lg text-emerald-100 text-center">{step.desc}</p>
            </div>
          );
        })}
      </div>

    </AbsoluteFill>
  );
};
