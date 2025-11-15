// pages/index.js
import MatrixBackground from "../components/MatrixBackground";

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <MatrixBackground />

      <main
        style={{
          position: "relative",
          zIndex: 10,
          padding: "4rem 2rem",
          textAlign: "center",
        }}
      >
        <header style={{ marginBottom: "4rem" }}>
          <h1 style={{ fontSize: "4rem", fontFamily: "Futura, sans-serif" }}>
            Enter the{" "}
            <span style={{ color: "#00ff00" }}>
              Matrix
            </span>{" "}
            of Web3
          </h1>

          <p
            style={{
              fontSize: "1.25rem",
              opacity: 0.8,
              maxWidth: "700px",
              margin: "0 auto",
            }}
          >
            Decentralized infrastructure powered by blockchain technology.
            Ultra-fast, secure, and built for the next evolution of the web.
          </p>

          <div style={{ marginTop: "2rem" }}>
            <button
              style={{
                padding: "1rem 2rem",
                background: "#00ff00",
                color: "#000",
                fontSize: "1.2rem",
                fontWeight: "bold",
                borderRadius: "8px",
                cursor: "pointer",
                boxShadow: "0 0 20px #00ff00aa",
                transition: "transform 0.2s",
              }}
              onMouseEnter={(e) => (e.target.style.transform = "scale(1.08)")}
              onMouseLeave={(e) => (e.target.style.transform = "scale(1)")}
            >
              Enter Web3
            </button>
          </div>
        </header>

        {/* Feature Grid */}
        <section
          style={{
            display: "grid",
            gap: "2rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            maxWidth: "1000px",
            margin: "0 auto",
          }}
        >
          <div
            style={{
              padding: "2rem",
              background: "#111",
              borderRadius: "12px",
              border: "1px solid #00ff00",
              boxShadow: "0 0 15px #00ff0044",
            }}
          >
            <h3 style={{ color: "#00ff00", marginBottom: "1rem" }}>
              Crypto Payments
            </h3>
            <p style={{ opacity: 0.7 }}>
              Accept ETH, SOL, USDC, and any EVM-compatible token.
            </p>
          </div>

          <div
            style={{
              padding: "2rem",
              background: "#111",
              borderRadius: "12px",
              border: "1px solid #00ff00",
              boxShadow: "0 0 15px #00ff0044",
            }}
          >
            <h3 style={{ color: "#00ff00", marginBottom: "1rem" }}>
              Digital Products
            </h3>
            <p style={{ opacity: 0.7 }}>
              Sell files, access keys, or Web3 services instantly.
            </p>
          </div>

          <div
            style={{
              padding: "2rem",
              background: "#111",
              borderRadius: "12px",
              border: "1px solid #00ff00",
              boxShadow: "0 0 15px #00ff0044",
            }}
          >
            <h3 style={{ color: "#00ff00", marginBottom: "1rem" }}>
              Smart Contracts
            </h3>
            <p style={{ opacity: 0.7 }}>
              Fully automated and trustless workflows deployed to-chain.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
