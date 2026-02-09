import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { ScreenshotFrame } from "../components/ScreenshotFrame";

const checkItems = [
  { text: "Ven cada sábado y crece en tu fe", icon: "📅", delay: 15 },
  { text: "Mantén tu constancia semana a semana", icon: "🔥", delay: 30 },
  { text: "Participa y sirve en el programa", icon: "🎤", delay: 45 },
  { text: "Sube de nivel en tu camino espiritual", icon: "⬆️", delay: 60 },
  { text: "Crece junto a tu comunidad JA", icon: "🤝", delay: 75 },
];

export const OutroScene: React.FC<{ screenshot?: string }> = ({ screenshot }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Title
  const titleProgress = spring({ frame, fps, config: { damping: 200 } });
  const titleOpacity = interpolate(titleProgress, [0, 1], [0, 1]);
  const titleScale = interpolate(titleProgress, [0, 1], [0.8, 1]);

  // CTA
  const ctaFrame = Math.max(0, frame - 100);
  const ctaProgress = spring({ frame: ctaFrame, fps, config: { damping: 8, stiffness: 150 } });
  const ctaScale = interpolate(ctaProgress, [0, 1], [0, 1]);

  return (
    <AbsoluteFill className="bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-800 flex flex-col items-center justify-center">
      {/* Decorative */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-[600px] h-[600px] rounded-full bg-blue-500/10 -top-40 -right-40" />
        <div className="absolute w-[400px] h-[400px] rounded-full bg-indigo-500/10 -bottom-20 -left-20" />
      </div>

      {/* Title */}
      <div
        className="text-center mb-10 z-10"
        style={{ opacity: titleOpacity, transform: `scale(${titleScale})` }}
      >
        <h2 className="text-6xl font-black text-white">Recuerda</h2>
      </div>

      {/* Checklist */}
      <div className="flex flex-col gap-4 z-10 mb-12">
        {checkItems.map((item, i) => {
          const progress = spring({
            frame: Math.max(0, frame - item.delay),
            fps,
            config: { damping: 15, stiffness: 120 },
          });
          const x = interpolate(progress, [0, 1], [-80, 0]);
          const opacity = interpolate(progress, [0, 1], [0, 1]);

          return (
            <div
              key={i}
              className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-2xl px-8 py-4 border border-white/20"
              style={{ transform: `translateX(${x}px)`, opacity }}
            >
              <span className="text-3xl">{item.icon}</span>
              <p className="text-2xl font-semibold text-white">{item.text}</p>
            </div>
          );
        })}
      </div>

      {/* CTA */}
      <div
        className="bg-yellow-400 rounded-2xl px-14 py-6 shadow-2xl z-10"
        style={{ transform: `scale(${ctaScale})` }}
      >
        <p className="text-3xl font-black text-yellow-900 text-center">
          ¡Te esperamos este sábado! 🙌
        </p>
        <p className="text-lg font-medium text-yellow-800 text-center mt-1">
          Tu próximo paso de fe te está esperando
        </p>
      </div>
      {screenshot && <ScreenshotFrame src={screenshot} delay={45} />}
    </AbsoluteFill>
  );
};
