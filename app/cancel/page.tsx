export default function CancelPage() {
  return (
    <div className="flex min-h-[calc(100svh-var(--nav-top)-var(--nav-bottom))] flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-4xl font-bold text-red-400">Payment Canceled</h1>
      <p>You have not been charged. You can try again.</p>
    </div>
  );
}
