import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
 
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});
 
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
});
 
export const metadata: Metadata = {
  title: {
    default: 'PrivateAuction | Sealed-Bid Auctions on Solana',
    template: '%s | PrivateAuction',
  },
  description:
    'The most private auction platform on Solana. Sealed-bid auctions with ZK proofs, second-price mechanism, and complete bid privacy.',
  keywords: [
    'auction',
    'solana',
    'nft',
    'sealed-bid',
    'private',
    'zk-proofs',
    'blockchain',
    'crypto',
  ],
  authors: [{ name: 'PrivateAuction Team' }],
  creator: 'PrivateAuction',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || 'https://privateauction.xyz'
  ),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'PrivateAuction',
    title: 'PrivateAuction | Sealed-Bid Auctions on Solana',
    description:
      'The most private auction platform on Solana. Sealed-bid auctions with ZK proofs.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'PrivateAuction',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PrivateAuction | Sealed-Bid Auctions on Solana',
    description:
      'The most private auction platform on Solana. Sealed-bid auctions with ZK proofs.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
};
 
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background-primary font-sans antialiased">
        <Providers>
          <div className="relative flex min-h-screen flex-col">
            {/* Background effects */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
              {/* Gradient orbs */}
              <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary-500/20 blur-3xl" />
              <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-accent-cyan/10 blur-3xl" />
              {/* Grid pattern */}
              <div className="absolute inset-0 bg-grid opacity-20" />
            </div>
 
            {/* Main content */}
            <main className="relative flex-1">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
 