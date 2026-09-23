export default function SuccessPage() {
  return (
    <div className="flex min-h-[calc(100dvh-var(--nav-top)-var(--nav-bottom))] flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-4xl font-bold text-green-400">Payment Successful!</h1>
      <p>Thank you for purchasing your yoga ticket. See you at the event!</p>
    </div>
  );
}
