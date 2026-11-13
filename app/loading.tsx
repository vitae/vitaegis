export default function Loading() {
  return (
    <div
      className="flex min-h-[60svh] w-full items-center justify-center"
      role="status"
      aria-label="Loading"
    >
      <span className="h-10 w-10 animate-spin rounded-full border-2 border-vitae-green/20 border-t-vitae-green shadow-neon-sm" />
    </div>
  );
}
