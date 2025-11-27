export default function CornerDecorations() {
  return (
    <>
      {/* Top Left */}
      <svg
        className="corner-decoration top-left"
        viewBox="0 0 40 40"
        aria-hidden="true"
      >
        <path
          d="M0 20 L0 0 L20 0"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
        />
      </svg>

      {/* Top Right */}
      <svg
        className="corner-decoration top-right"
        viewBox="0 0 40 40"
        aria-hidden="true"
      >
        <path
          d="M40 20 L40 0 L20 0"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
        />
      </svg>

      {/* Bottom Left */}
      <svg
        className="corner-decoration bottom-left"
        viewBox="0 0 40 40"
        aria-hidden="true"
      >
        <path
          d="M0 20 L0 40 L20 40"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
        />
      </svg>

      {/* Bottom Right */}
      <svg
        className="corner-decoration bottom-right"
        viewBox="0 0 40 40"
        aria-hidden="true"
      >
        <path
          d="M40 20 L40 40 L20 40"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
        />
      </svg>
    </>
  );
}
