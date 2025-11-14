import Header from "../components/Header";
import Footer from "../components/Footer";
import MatrixBackground from "../components/MatrixBackground";

export default function Information() {
  return (
    <div className="min-h-screen bg-black text-white">
      <MatrixBackground />
      <Header />
      <main className="p-8">
        <h2 className="text-3xl neon-text">Information</h2>
        <p>Placeholder content for Information page.</p>
      </main>
      <Footer />
    </div>
  );
}
