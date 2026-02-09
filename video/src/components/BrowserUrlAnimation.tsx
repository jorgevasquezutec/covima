import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";

interface BrowserUrlAnimationProps {
  /** URL to display and "type" */
  url: string;
  /** Screenshot to show after "loading" */
  screenshot: string;
  /** Frame delay before animation starts */
  delay?: number;
}

export const BrowserUrlAnimation: React.FC<BrowserUrlAnimationProps> = ({
  url,
  screenshot,
  delay = 60,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phase 1: URL typing (frames delay to delay+60)
  const typingStart = delay;
  const typingDuration = 45; // ~1.5s to type
  const typingProgress = Math.min(1, Math.max(0, (frame - typingStart) / typingDuration));
  const charsToShow = Math.floor(typingProgress * url.length);
  const displayedUrl = url.substring(0, charsToShow);

  // Phase 2: Enter key press indicator (frame delay+50)
  const enterFrame = delay + 50;
  const showEnterIndicator = frame >= enterFrame && frame < enterFrame + 15;

  // Phase 3: Loading spinner (frames delay+55 to delay+85)
  const loadingStart = delay + 55;
  const loadingEnd = delay + 85;
  const isLoading = frame >= loadingStart && frame < loadingEnd;
  const loadingRotation = ((frame - loadingStart) * 15) % 360;

  // Phase 4: Screenshot appears (after loading)
  const screenshotStart = delay + 85;
  const screenshotProgress = spring({
    frame: Math.max(0, frame - screenshotStart),
    fps,
    config: { damping: 15, stiffness: 80 },
  });
  const screenshotOpacity = interpolate(screenshotProgress, [0, 1], [0, 1]);
  const screenshotScale = interpolate(screenshotProgress, [0, 1], [0.95, 1]);

  // Browser chrome appearance
  const browserProgress = spring({
    frame: Math.max(0, frame - delay + 30),
    fps,
    config: { damping: 12, stiffness: 60 },
  });
  const browserOpacity = interpolate(browserProgress, [0, 1], [0, 1]);
  const browserY = interpolate(browserProgress, [0, 1], [40, 0]);

  // Cursor blink
  const cursorVisible = Math.floor(frame / 15) % 2 === 0 && frame < enterFrame;

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Browser Window */}
      <div
        style={{
          width: 1400,
          height: 850,
          background: "#ffffff",
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 40px 100px rgba(0,0,0,0.5)",
          opacity: browserOpacity,
          transform: `translateY(${browserY}px)`,
        }}
      >
        {/* Browser Chrome / Title Bar */}
        <div
          style={{
            height: 48,
            background: "#f1f3f4",
            display: "flex",
            alignItems: "center",
            padding: "0 16px",
            borderBottom: "1px solid #e0e0e0",
          }}
        >
          {/* Traffic lights */}
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ff5f57" }} />
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#febc2e" }} />
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#28c840" }} />
          </div>

          {/* URL Bar */}
          <div
            style={{
              flex: 1,
              margin: "0 100px",
              height: 32,
              background: "#ffffff",
              borderRadius: 16,
              display: "flex",
              alignItems: "center",
              padding: "0 16px",
              border: "1px solid #ddd",
            }}
          >
            {/* Lock icon */}
            <span style={{ marginRight: 8, fontSize: 14, color: "#5f6368" }}>🔒</span>
            {/* URL text */}
            <span style={{ fontSize: 14, fontFamily: "system-ui", color: "#202124" }}>
              {displayedUrl}
              {cursorVisible && <span style={{ color: "#1a73e8" }}>|</span>}
            </span>
            {/* Enter indicator */}
            {showEnterIndicator && (
              <span
                style={{
                  marginLeft: 12,
                  padding: "2px 8px",
                  background: "#1a73e8",
                  color: "white",
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: "bold",
                }}
              >
                ↵ ENTER
              </span>
            )}
          </div>
        </div>

        {/* Browser Content Area */}
        <div
          style={{
            height: "calc(100% - 48px)",
            position: "relative",
            background: "#fff",
          }}
        >
          {/* Loading spinner */}
          {isLoading && (
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: `translate(-50%, -50%) rotate(${loadingRotation}deg)`,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  border: "4px solid #e0e0e0",
                  borderTopColor: "#1a73e8",
                  borderRadius: "50%",
                }}
              />
            </div>
          )}

          {/* Screenshot content */}
          <div
            style={{
              width: "100%",
              height: "100%",
              opacity: screenshotOpacity,
              transform: `scale(${screenshotScale})`,
              transformOrigin: "top center",
            }}
          >
            <Img
              src={staticFile(`screenshots/${screenshot}`)}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "top",
              }}
            />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
