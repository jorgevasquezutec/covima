import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

interface ScreenshotFrameProps {
  src: string;
  /** Frame delay before the screenshot appears (default: 30 = ~1s) */
  delay?: number;
  /** Scale of the screenshot relative to the viewport (default: 0.6) */
  scale?: number;
  /** Vertical offset in pixels from center (default: 40, pushes down) */
  offsetY?: number;
}

export const ScreenshotFrame: React.FC<ScreenshotFrameProps> = ({
  src,
  delay = 30,
  scale = 0.6,
  offsetY = 40,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: Math.max(0, frame - delay),
    fps,
    config: { damping: 14, stiffness: 80 },
  });

  const imgScale = interpolate(progress, [0, 1], [0.8, 1]);
  const opacity = interpolate(progress, [0, 1], [0, 1]);
  const translateY = interpolate(progress, [0, 1], [30, 0]);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        paddingTop: offsetY,
      }}
    >
      <div
        style={{
          transform: `scale(${imgScale * scale}) translateY(${translateY}px)`,
          opacity,
          borderRadius: 20,
          overflow: "hidden",
          boxShadow: "0 25px 80px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.2)",
          border: "3px solid rgba(255,255,255,0.15)",
        }}
      >
        <Img
          src={staticFile(`screenshots/${src}`)}
          style={{
            width: 1920,
            height: 1080,
            display: "block",
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
