import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { ScreenshotFrame } from "../components/ScreenshotFrame";

export const EspiritualScene: React.FC<{ screenshot?: string }> = ({ screenshot }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Cross/bible icon
  const iconScale = spring({ frame: Math.max(0, frame - 5), fps, config: { damping: 10, stiffness: 80 } });

  // Title
  const titleProgress = spring({ frame: Math.max(0, frame - 20), fps, config: { damping: 200 } });
  const titleOpacity = interpolate(titleProgress, [0, 1], [0, 1]);
  const titleY = interpolate(titleProgress, [0, 1], [30, 0]);

  // Verse
  const verseProgress = spring({ frame: Math.max(0, frame - 45), fps, config: { damping: 200 } });
  const verseOpacity = interpolate(verseProgress, [0, 1], [0, 1]);
  const verseScale = interpolate(verseProgress, [0, 1], [0.95, 1]);

  // Message
  const msgProgress = spring({ frame: Math.max(0, frame - 75), fps, config: { damping: 200 } });
  const msgOpacity = interpolate(msgProgress, [0, 1], [0, 1]);
  const msgY = interpolate(msgProgress, [0, 1], [20, 0]);

  // Glow pulse using frame (no CSS animation)
  const glowOpacity = interpolate(
    Math.sin(frame / 15),
    [-1, 1],
    [0.3, 0.6],
  );

  return (
    <AbsoluteFill className="bg-gradient-to-br from-sky-800 via-sky-700 to-blue-900 flex flex-col items-center justify-center">
      {/* Light glow */}
      <div
        className="absolute w-[500px] h-[500px] rounded-full bg-yellow-200 blur-3xl top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ opacity: glowOpacity }}
      />

      {/* Stars / dots decorative */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(12)].map((_, i) => {
          const starProgress = spring({
            frame: Math.max(0, frame - i * 5),
            fps,
            config: { damping: 200 },
          });
          const starOpacity = interpolate(starProgress, [0, 1], [0, 0.4]);
          const positions = [
            { top: "10%", left: "15%" }, { top: "20%", right: "20%" },
            { top: "30%", left: "10%" }, { top: "15%", right: "35%" },
            { top: "70%", left: "20%" }, { top: "75%", right: "15%" },
            { top: "85%", left: "30%" }, { top: "60%", right: "10%" },
            { top: "40%", left: "5%" }, { top: "50%", right: "8%" },
            { top: "5%", left: "50%" }, { top: "90%", right: "40%" },
          ];
          return (
            <div
              key={i}
              className="absolute w-2 h-2 bg-yellow-200 rounded-full"
              style={{ ...positions[i], opacity: starOpacity }}
            />
          );
        })}
      </div>

      {/* Icon */}
      <div className="z-10 mb-6" style={{ transform: `scale(${iconScale})` }}>
        <span className="text-[100px] leading-none">✝️</span>
      </div>

      {/* Title */}
      <div className="z-10 text-center mb-8" style={{ opacity: titleOpacity, transform: `translateY(${titleY}px)` }}>
        <h2 className="text-5xl font-black text-white">
          Más que puntos...
        </h2>
        <p className="text-3xl text-sky-200 mt-3 font-medium">
          es tu camino de fe
        </p>
      </div>

      {/* Bible Verse */}
      <div
        className="z-10 bg-white/10 backdrop-blur-sm rounded-3xl px-14 py-8 border border-white/20 max-w-3xl mb-8"
        style={{ opacity: verseOpacity, transform: `scale(${verseScale})` }}
      >
        <p className="text-3xl text-white font-medium text-center italic leading-relaxed">
          "No nos cansemos de hacer el bien, porque a su
          <br />
          debido tiempo cosecharemos si no nos damos por vencidos."
        </p>
        <p className="text-xl text-yellow-300 font-bold text-center mt-4">
          — Gálatas 6:9
        </p>
      </div>

      {/* Message */}
      <div className="z-10 max-w-2xl" style={{ opacity: msgOpacity, transform: `translateY(${msgY}px)` }}>
        <p className="text-2xl text-sky-100 text-center leading-relaxed">
          Cada punto refleja tu compromiso con Dios y tu comunidad.
          <br />
          Tu constancia inspira a otros a crecer juntos.
        </p>
      </div>
      {screenshot && <ScreenshotFrame src={screenshot} />}
    </AbsoluteFill>
  );
};
