import "../styles/globals.css";
import "@rainbow-me/rainbowkit/styles.css";
import Providers from "../components/Providers";
import Navbar from "../components/Navbar";
import MatrixRain from "../components/MatrixRain";
import CornerDecorations from "../components/CornerDecorations";

export const metadata = {
  title: "Vitaegis Vitality",
  description: "Cyberpunk Neon Green Wellness Platform - Health • Stealth • Wealth",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-black text-white antialiased">
        {/* Matrix Rain Background */}
        <MatrixRain
          opacity={0.9}
          fallSpeed={0.8}
          density={1}
          glowIntensity={1}
          primaryColor="#00ff6a"
        />

        {/* Corner Decorations */}
        <CornerDecorations />

        {/* Scanline Overlay */}
        <div className="scanlines" aria-hidden="true" />

        <Providers>
          <Navbar />
          <div className="relative z-10 pt-20">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
