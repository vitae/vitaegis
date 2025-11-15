// components/GlassmorphicNav.js
import Link from "next/link";

export default function GlassmorphicNav() {
  const navItems = [
    { href: "/", label: "Home", icon: "🏠" },
    { href: "/meditation", label: "Meditate", icon: "🧘" },
    { href: "/yoga", label: "Yoga", icon: "🕉️" },
    { href: "/taichi", label: "Tai Chi", icon: "☯️" },
    { href: "/products", label: "Products", icon: "🛍️" },
    { href: "/live", label: "Live", icon: "📡" },
    { href: "/information", label: "Info", icon: "📚" },
    { href: "/contact", label: "Contact", icon: "💬" },
  ];

  return (
    <>
      <nav
        className="glassmorphic-nav"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          padding: "1rem 2rem",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          background: "rgba(0, 0, 0, 0.4)",
          borderTop: "1px solid rgba(0, 255, 0, 0.3)",
          boxShadow:
            "0 -8px 32px 0 rgba(0, 255, 0, 0.15), inset 0 1px 0 0 rgba(0, 255, 0, 0.2)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            alignItems: "center",
            maxWidth: "1400px",
            margin: "0 auto",
            gap: "0.5rem",
          }}
        >
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="glass-nav-item"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.25rem",
                padding: "0.5rem 1rem",
                borderRadius: "12px",
                color: "#00ff00",
                textDecoration: "none",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                fontSize: "0.875rem",
                fontWeight: "500",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <span style={{ fontSize: "1.5rem" }}>{item.icon}</span>
              <span className="nav-label" style={{ whiteSpace: "nowrap" }}>
                {item.label}
              </span>
            </Link>
          ))}
        </div>

        {/* Animated scan line effect */}
        <div
          className="scan-line"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "1px",
            background:
              "linear-gradient(90deg, transparent, #00ff00, transparent)",
          }}
        />
      </nav>

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes scan {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }

          @keyframes shimmer {
            0% { left: -100%; }
            100% { left: 100%; }
          }

          .scan-line {
            animation: scan 3s linear infinite;
          }

          .glass-nav-item:hover {
            background: rgba(0, 255, 0, 0.1);
            transform: translateY(-2px);
            box-shadow: 0 4px 20px rgba(0, 255, 0, 0.3);
          }

          .glass-nav-item::before {
            content: "";
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(
              90deg,
              transparent,
              rgba(0, 255, 0, 0.2),
              transparent
            );
            transition: left 0.5s;
          }

          .glass-nav-item:hover::before {
            left: 100%;
          }

          @media (max-width: 768px) {
            .glassmorphic-nav {
              padding: 0.75rem 0.5rem !important;
            }

            .glass-nav-item {
              padding: 0.25rem 0.5rem !important;
              font-size: 0.75rem !important;
            }

            .glass-nav-item span:first-child {
              font-size: 1.25rem !important;
            }
          }

          @media (max-width: 480px) {
            .glass-nav-item .nav-label {
              display: none;
            }
          }
        `
      }} />
    </>
  );
}
