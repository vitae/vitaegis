// pages/matrix-demo.js
import dynamic from "next/dynamic";
import GlassmorphicNav from "../components/GlassmorphicNav";

// Dynamic import with SSR disabled for Three.js components
const MatrixRainR3F = dynamic(() => import("../components/MatrixRainR3F"), {
  ssr: false,
});

export default function MatrixDemo() {
  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Advanced Matrix Rain Background */}
      <MatrixRainR3F />

      {/* Main Content */}
      <main
        style={{
          position: "relative",
          zIndex: 10,
          padding: "4rem 2rem",
          paddingBottom: "8rem", // Extra padding for bottom nav
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            maxWidth: "900px",
            textAlign: "center",
            animation: "fadeIn 1.5s ease-in-out",
          }}
        >
          <h1
            style={{
              fontSize: "4.5rem",
              fontFamily: "Futura, sans-serif",
              marginBottom: "1.5rem",
              background: "linear-gradient(135deg, #00ff00, #00cc00, #00ff00)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              textShadow: "0 0 40px rgba(0, 255, 0, 0.5)",
              animation: "glow 2s ease-in-out infinite alternate",
            }}
          >
            Welcome to the Matrix
          </h1>

          <p
            style={{
              fontSize: "1.5rem",
              opacity: 0.9,
              marginBottom: "2rem",
              color: "#00ff00",
              textShadow: "0 0 10px rgba(0, 255, 0, 0.8)",
            }}
          >
            Advanced Web3 Technology powered by React Three Fiber
          </p>

          <div
            style={{
              display: "grid",
              gap: "2rem",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              marginTop: "3rem",
            }}
          >
            {/* Feature Card 1 */}
            <div
              className="feature-card"
              style={{
                padding: "2.5rem",
                background: "rgba(0, 20, 0, 0.6)",
                backdropFilter: "blur(10px)",
                borderRadius: "16px",
                border: "1px solid rgba(0, 255, 0, 0.3)",
                boxShadow: "0 8px 32px 0 rgba(0, 255, 0, 0.2)",
                transition: "all 0.3s ease",
              }}
            >
              <h3
                style={{
                  color: "#00ff00",
                  fontSize: "1.5rem",
                  marginBottom: "1rem",
                  textShadow: "0 0 10px rgba(0, 255, 0, 0.8)",
                }}
              >
                ⚡ GPU Accelerated
              </h3>
              <p style={{ opacity: 0.8, lineHeight: "1.6" }}>
                Powered by Three.js and WebGL shaders for ultra-smooth 60fps
                particle rendering
              </p>
            </div>

            {/* Feature Card 2 */}
            <div
              className="feature-card"
              style={{
                padding: "2.5rem",
                background: "rgba(0, 20, 0, 0.6)",
                backdropFilter: "blur(10px)",
                borderRadius: "16px",
                border: "1px solid rgba(0, 255, 0, 0.3)",
                boxShadow: "0 8px 32px 0 rgba(0, 255, 0, 0.2)",
                transition: "all 0.3s ease",
              }}
            >
              <h3
                style={{
                  color: "#00ff00",
                  fontSize: "1.5rem",
                  marginBottom: "1rem",
                  textShadow: "0 0 10px rgba(0, 255, 0, 0.8)",
                }}
              >
                ✨ Post-Processing
              </h3>
              <p style={{ opacity: 0.8, lineHeight: "1.6" }}>
                Real-time bloom effects and vignette for authentic phosphorescent
                glow
              </p>
            </div>

            {/* Feature Card 3 */}
            <div
              className="feature-card"
              style={{
                padding: "2.5rem",
                background: "rgba(0, 20, 0, 0.6)",
                backdropFilter: "blur(10px)",
                borderRadius: "16px",
                border: "1px solid rgba(0, 255, 0, 0.3)",
                boxShadow: "0 8px 32px 0 rgba(0, 255, 0, 0.2)",
                transition: "all 0.3s ease",
              }}
            >
              <h3
                style={{
                  color: "#00ff00",
                  fontSize: "1.5rem",
                  marginBottom: "1rem",
                  textShadow: "0 0 10px rgba(0, 255, 0, 0.8)",
                }}
              >
                🌊 Sawtooth Waves
              </h3>
              <p style={{ opacity: 0.8, lineHeight: "1.6" }}>
                Authentic illumination waves create the falling rain effect without
                moving glyphs
              </p>
            </div>
          </div>

          {/* CTA Button */}
          <button
            style={{
              marginTop: "3rem",
              padding: "1.25rem 3rem",
              background: "rgba(0, 255, 0, 0.2)",
              backdropFilter: "blur(10px)",
              color: "#00ff00",
              fontSize: "1.3rem",
              fontWeight: "bold",
              borderRadius: "12px",
              border: "2px solid #00ff00",
              cursor: "pointer",
              boxShadow: "0 0 30px rgba(0, 255, 0, 0.5)",
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "rgba(0, 255, 0, 0.3)";
              e.target.style.transform = "scale(1.05) translateY(-2px)";
              e.target.style.boxShadow = "0 0 40px rgba(0, 255, 0, 0.8)";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "rgba(0, 255, 0, 0.2)";
              e.target.style.transform = "scale(1) translateY(0)";
              e.target.style.boxShadow = "0 0 30px rgba(0, 255, 0, 0.5)";
            }}
          >
            Enter the Digital Realm
          </button>
        </div>
      </main>

      {/* Glassmorphic Bottom Navigation */}
      <GlassmorphicNav />

      {/* Animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes glow {
          from {
            filter: drop-shadow(0 0 20px rgba(0, 255, 0, 0.5));
          }
          to {
            filter: drop-shadow(0 0 40px rgba(0, 255, 0, 0.9));
          }
        }

        .feature-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 12px 40px 0 rgba(0, 255, 0, 0.4) !important;
          border-color: rgba(0, 255, 0, 0.6) !important;
        }

        @media (max-width: 768px) {
          h1 {
            font-size: 3rem !important;
          }
          p {
            font-size: 1.2rem !important;
          }
        }

        @media (max-width: 480px) {
          h1 {
            font-size: 2rem !important;
          }
          .feature-card {
            padding: 1.5rem !important;
          }
        }
      `}</style>
    </div>
  );
}
