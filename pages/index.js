import Header from "../components/Header";
import Footer from "../components/Footer";
import MatrixBackground from "../components/MatrixBackground";

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white">
      <MatrixBackground />
      <Header />
      <main className="p-8">
        <h2 className="text-3xl neon-text">Home</h2>
        <p>Placeholder content for Home page.</p>
      </main>
      <Footer />
    </div>
  );
}
