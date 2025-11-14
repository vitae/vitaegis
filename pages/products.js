import Header from "../components/Header";
import Footer from "../components/Footer";
import MatrixBackground from "../components/MatrixBackground";

export default function Products() {
  return (
    <div className="min-h-screen bg-black text-white">
      <MatrixBackground />
      <Header />
      <main className="p-8">
        <h2 className="text-3xl neon-text">Products</h2>
        <p>Placeholder content for Products page.</p>
      </main>
      <Footer />
    </div>
  );
}
