import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";

interface SplitScreenWrapperProps {
  /** Main desktop screenshot */
  screenshot: string;
  /** Second desktop screenshot (shown overlapping with offset) */
  screenshot2?: string;
  /** Mobile screenshot (iPhone style) */
  mobileScreenshot?: string;
  /** Frame delay before transition starts */
  delay?: number;
  children: React.ReactNode;
}

export const SplitScreenWrapper: React.FC<SplitScreenWrapperProps> = ({
  screenshot,
  screenshot2,
  mobileScreenshot,
  delay = 120,
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: Math.max(0, frame - delay),
    fps,
    config: { damping: 12, stiffness: 50 },
  });

  // V1 content fades out
  const v1Opacity = interpolate(progress, [0, 0.5], [1, 0], { extrapolateRight: "clamp" });
  const v1Scale = interpolate(progress, [0, 1], [1, 0.95]);

  // Screenshots animation
  const shotOpacity = interpolate(progress, [0.2, 0.8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const shotY = interpolate(progress, [0.2, 1], [80, 0], { extrapolateLeft: "clamp" });

  // 3D perspective rotation for dramatic effect
  const rotateY = -12; // degrees
  const rotateX = 5;

  const hasTwoScreenshots = !!screenshot2;
  const hasMobile = !!mobileScreenshot;

  return (
    <AbsoluteFill>
      {/* Dark gradient background */}
      <AbsoluteFill
        style={{
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%)",
        }}
      />

      {/* V1 Content - fades out */}
      <AbsoluteFill
        style={{
          opacity: v1Opacity,
          transform: `scale(${v1Scale})`,
        }}
      >
        {children}
      </AbsoluteFill>

      {/* Screenshots with 3D perspective */}
      <AbsoluteFill
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: shotOpacity,
          transform: `translateY(${shotY}px)`,
          perspective: 2000,
        }}
      >
        {hasTwoScreenshots ? (
          // Two screenshots: back one and front one with offset
          <>
            {/* Back screenshot (slightly behind and to the left) */}
            <div
              style={{
                position: "absolute",
                width: 1920,
                height: 1080,
                transform: `
                  translateX(-350px)
                  translateZ(-100px)
                  rotateY(${rotateY}deg)
                  rotateX(${rotateX}deg)
                  scale(0.55)
                `,
                borderRadius: 16,
                overflow: "hidden",
                boxShadow: "0 50px 100px rgba(0,0,0,0.4)",
                border: "3px solid rgba(255,255,255,0.1)",
              }}
            >
              <Img
                src={staticFile(`screenshots/${screenshot}`)}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>

            {/* Front screenshot (in front and to the right) */}
            <div
              style={{
                position: "absolute",
                width: 1920,
                height: 1080,
                transform: `
                  translateX(350px)
                  translateZ(100px)
                  rotateY(${rotateY}deg)
                  rotateX(${rotateX}deg)
                  scale(0.55)
                `,
                borderRadius: 16,
                overflow: "hidden",
                boxShadow: "0 60px 120px rgba(0,0,0,0.5), 0 20px 40px rgba(0,0,0,0.3)",
                border: "3px solid rgba(255,255,255,0.15)",
              }}
            >
              <Img
                src={staticFile(`screenshots/${screenshot2}`)}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
          </>
        ) : hasMobile ? (
          // Desktop + Mobile layout
          <>
            {/* Desktop with 3D tilt */}
            <div
              style={{
                position: "absolute",
                width: 1920,
                height: 1080,
                transform: `
                  translateX(-120px)
                  rotateY(${rotateY}deg)
                  rotateX(${rotateX}deg)
                  scale(0.58)
                `,
                borderRadius: 16,
                overflow: "hidden",
                boxShadow: "0 60px 120px rgba(0,0,0,0.5), 0 20px 40px rgba(0,0,0,0.3)",
                border: "3px solid rgba(255,255,255,0.1)",
              }}
            >
              <Img
                src={staticFile(`screenshots/${screenshot}`)}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>

            {/* Mobile iPhone */}
            <div
              style={{
                position: "absolute",
                width: 390,
                height: 844,
                transform: `
                  translateX(520px)
                  translateY(20px)
                  rotateY(-8deg)
                  rotateX(3deg)
                  scale(0.52)
                `,
                borderRadius: 44,
                overflow: "hidden",
                boxShadow: "0 50px 100px rgba(0,0,0,0.5), 0 15px 35px rgba(0,0,0,0.3)",
                border: "10px solid #1a1a1a",
                background: "#000",
              }}
            >
              {/* Dynamic Island */}
              <div
                style={{
                  position: "absolute",
                  top: 14,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 126,
                  height: 37,
                  background: "#000",
                  borderRadius: 20,
                  zIndex: 10,
                }}
              />
              <Img
                src={staticFile(`screenshots/${mobileScreenshot}`)}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
          </>
        ) : (
          // Single screenshot with 3D perspective
          <div
            style={{
              width: 1920,
              height: 1080,
              transform: `
                rotateY(${rotateY}deg)
                rotateX(${rotateX}deg)
                scale(0.65)
              `,
              borderRadius: 16,
              overflow: "hidden",
              boxShadow: "0 60px 120px rgba(0,0,0,0.5), 0 20px 40px rgba(0,0,0,0.3)",
              border: "3px solid rgba(255,255,255,0.1)",
            }}
          >
            <Img
              src={staticFile(`screenshots/${screenshot}`)}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
