import '../styles/globals.css';

export const metadata = {
  title: 'Patagios - Matrix Web3 Interface',
  description: 'A Web3 platform with Matrix Digital Rain aesthetic',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="font-futura">
        {children}
      </body>
    </html>
  );
}
