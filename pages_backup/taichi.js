import dynamic from "next/dynamic";

const MatrixBackground = dynamic(
  () => import("../components/MatrixBackground"),
  { ssr: false }
);

export default function TaiChi() {
  return (
    <div className="min-h-screen bg-black text-white relative">
      <MatrixBackground />

      <div className="relative z-10 p-10">
        <h1 className="text-4xl">Tai Chi Digital Flow</h1>
        <p className="text-xl mt-4 opacity-80">
          Harmonize breath, movement, and the Matrix field.
        </p>
      </div>
    </div>
  );
}
