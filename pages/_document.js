import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta charSet="utf-8" />
        <meta name="theme-color" content="#000000" />
        <meta
          name="description"
          content="VITAEGIS - Enter the Matrix of Web3. Decentralized infrastructure powered by blockchain technology."
        />
        <meta name="keywords" content="web3, blockchain, crypto, decentralized, matrix" />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="VITAEGIS - Matrix of Web3" />
        <meta
          property="og:description"
          content="Decentralized infrastructure powered by blockchain technology"
        />

        {/* Preconnect for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
