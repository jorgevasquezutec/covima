import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";

const URL = "https://covima.jvasquez.me";

export const BrowserDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // === PHASE 1: Browser appears (frames 0-30) ===
  const browserProgress = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 60 },
  });
  const browserOpacity = interpolate(browserProgress, [0, 1], [0, 1]);
  const browserY = interpolate(browserProgress, [0, 1], [60, 0]);

  // === PHASE 2: URL typing (frames 30-90) ===
  const typingStart = 30;
  const typingDuration = 50;
  const typingProgress = Math.min(1, Math.max(0, (frame - typingStart) / typingDuration));
  const charsToShow = Math.floor(typingProgress * URL.length);
  const displayedUrl = URL.substring(0, charsToShow);
  const cursorVisible = Math.floor(frame / 12) % 2 === 0 && frame < 90;

  // === PHASE 3: Enter key (frames 85-100) ===
  const showEnter = frame >= 85 && frame < 105;

  // === PHASE 4: Loading (frames 95-130) ===
  const isLoading = frame >= 95 && frame < 130;
  const loadingRotation = ((frame - 95) * 12) % 360;

  // === PHASE 5: Dashboard appears (frames 130+) ===
  const dashboardStart = 130;
  const dashboardProgress = spring({
    frame: Math.max(0, frame - dashboardStart),
    fps,
    config: { damping: 15, stiffness: 80 },
  });
  const dashboardOpacity = interpolate(dashboardProgress, [0, 1], [0, 1]);
  const dashboardScale = interpolate(dashboardProgress, [0, 1], [0.95, 1]);

  // === PHASE 6: Transition to show mobile (frames 250+) ===
  const mobileTransitionStart = 250;
  const mobileProgress = spring({
    frame: Math.max(0, frame - mobileTransitionStart),
    fps,
    config: { damping: 14, stiffness: 50 },
  });

  // Both devices move up and scale down together
  const devicesY = interpolate(mobileProgress, [0, 1], [0, -40]);
  const browserFinalScale = interpolate(mobileProgress, [0, 1], [1, 0.85]);
  const browserFinalX = interpolate(mobileProgress, [0, 1], [0, -100]);

  // Mobile appears from right, overlapping slightly
  const mobileX = interpolate(mobileProgress, [0, 1], [300, 0]);
  const mobileOpacity = interpolate(mobileProgress, [0, 1], [0, 1]);
  const mobileScale = interpolate(mobileProgress, [0, 1], [0.8, 1]);

  // === PHASE 7: CTA appears (frames 350+) ===
  const ctaStart = 350;
  const ctaProgress = spring({
    frame: Math.max(0, frame - ctaStart),
    fps,
    config: { damping: 12, stiffness: 80 },
  });
  const ctaOpacity = interpolate(ctaProgress, [0, 1], [0, 1]);
  const ctaY = interpolate(ctaProgress, [0, 1], [20, 0]);

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%)",
      }}
    >
      {/* Devices Container - centered */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: `translate(-50%, -50%) translateY(${devicesY}px)`,
          display: "flex",
          alignItems: "center",
          gap: 30,
        }}
      >
        {/* Browser Window */}
        <div
          style={{
            width: 950,
            height: 620,
            background: "#ffffff",
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: "0 40px 80px rgba(0,0,0,0.4), 0 15px 30px rgba(0,0,0,0.2)",
            opacity: browserOpacity,
            transform: `translateY(${browserY}px) translateX(${browserFinalX}px) scale(${browserFinalScale})`,
            flexShrink: 0,
          }}
        >
          {/* Browser Chrome */}
          <div
            style={{
              height: 36,
              background: "#f1f3f4",
              display: "flex",
              alignItems: "center",
              padding: "0 12px",
              borderBottom: "1px solid #e0e0e0",
            }}
          >
            {/* Traffic lights */}
            <div style={{ display: "flex", gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57" }} />
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e" }} />
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840" }} />
            </div>

            {/* URL Bar */}
            <div
              style={{
                flex: 1,
                margin: "0 60px",
                height: 24,
                background: "#ffffff",
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                padding: "0 12px",
                border: "1px solid #ddd",
              }}
            >
              <span style={{ marginRight: 6, fontSize: 10, color: "#5f6368" }}>🔒</span>
              <span style={{ fontSize: 11, fontFamily: "system-ui", color: "#202124" }}>
                {displayedUrl}
                {cursorVisible && <span style={{ color: "#1a73e8" }}>|</span>}
              </span>
              {showEnter && (
                <span
                  style={{
                    marginLeft: "auto",
                    padding: "2px 8px",
                    background: "#1a73e8",
                    color: "white",
                    borderRadius: 3,
                    fontSize: 9,
                    fontWeight: "bold",
                  }}
                >
                  ↵ ENTER
                </span>
              )}
            </div>
          </div>

          {/* Browser Content */}
          <div style={{ height: "calc(100% - 36px)", position: "relative", background: "#fff" }}>
            {/* Loading spinner */}
            {isLoading && (
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: `translate(-50%, -50%) rotate(${loadingRotation}deg)`,
                  zIndex: 10,
                }}
              >
                <div
                  style={{
                    width: 30,
                    height: 30,
                    border: "3px solid #e0e0e0",
                    borderTopColor: "#1a73e8",
                    borderRadius: "50%",
                  }}
                />
              </div>
            )}

            {/* Dashboard screenshot */}
            <div
              style={{
                width: "100%",
                height: "100%",
                opacity: dashboardOpacity,
                transform: `scale(${dashboardScale})`,
                transformOrigin: "top center",
                background: "#f5f5f5",
              }}
            >
              <Img
                src={staticFile("screenshots/08-outro-dashboard.png")}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  objectPosition: "top",
                }}
              />
            </div>
          </div>
        </div>

        {/* Mobile Phone - overlaps browser slightly */}
        <div
          style={{
            width: 200,
            height: 420,
            borderRadius: 28,
            overflow: "hidden",
            boxShadow: "0 30px 60px rgba(0,0,0,0.4), 0 10px 20px rgba(0,0,0,0.2)",
            border: "6px solid #1a1a1a",
            background: "#000",
            opacity: mobileOpacity,
            transform: `translateX(${mobileX}px) scale(${mobileScale})`,
            marginLeft: -60, // Overlap with browser
            flexShrink: 0,
          }}
        >
          {/* Dynamic Island */}
          <div
            style={{
              position: "absolute",
              top: 8,
              left: "50%",
              transform: "translateX(-50%)",
              width: 70,
              height: 22,
              background: "#000",
              borderRadius: 12,
              zIndex: 10,
            }}
          />
          <Img
            src={staticFile("screenshots/mobile-dashboard.png")}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        </div>
      </div>

      {/* CTA Text - positioned below devices */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          left: "50%",
          transform: `translateX(-50%) translateY(${ctaY}px)`,
          opacity: ctaOpacity,
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontSize: 36,
            fontWeight: 800,
            color: "#fff",
            textShadow: "0 2px 20px rgba(0,0,0,0.3)",
            margin: 0,
          }}
        >
          ¡Visítanos en covima.jvasquez.me!
        </p>
        <p
          style={{
            fontSize: 18,
            fontWeight: 500,
            color: "rgba(255,255,255,0.7)",
            marginTop: 8,
          }}
        >
          Disponible en web y móvil
        </p>
      </div>
    </AbsoluteFill>
  );
};
