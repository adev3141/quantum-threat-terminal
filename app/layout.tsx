import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import Script from 'next/script'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });
const clarityProjectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID?.trim()
const clarityEnabled = Boolean(clarityProjectId)

export const metadata: Metadata = {
  metadataBase: new URL('https://xqbts.com'),
  title: {
    default: 'XQBTS | Quantum Threat Terminal',
    template: '%s | XQBTS',
  },
  description: 'Quantum Threat Terminal for Q-Day readiness, benchmark evidence tracking, post-quantum migration intelligence, and cryptographic risk monitoring.',
  keywords: [
    'quantum threat',
    'quantum threat intelligence',
    'quantum risk dashboard',
    'q-day countdown',
    'post-quantum cryptography',
    'pqc migration',
    'harvest now decrypt later',
    'HNDL',
    'quantum benchmark tracking',
    'quantum compilation website',
    'quantum computing security',
    'xqbts',
    'xqbts.com',
  ],
  applicationName: 'Quantum Threat Terminal',
  category: 'Cybersecurity',
  alternates: {
    canonical: '/',
  },
  authors: [{ name: '3DDev SMC PVT' }],
  creator: '3DDev SMC PVT',
  publisher: '3DDev SMC PVT',
  openGraph: {
    type: 'website',
    url: 'https://xqbts.com',
    title: 'XQBTS | Quantum Threat Terminal',
    description: 'Track benchmark-derived quantum readiness, cryptographic risk, and Q-Day projections in one terminal.',
    siteName: 'XQBTS',
    images: [
      {
        url: '/icon-dark-32x32.png',
        width: 512,
        height: 512,
        alt: 'XQBTS Quantum Threat Terminal',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'XQBTS | Quantum Threat Terminal',
    description: 'Benchmark-native quantum threat intelligence with Q-Day readiness projection and HNDL modeling.',
    images: ['/icon-dark-32x32.png'],
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    shortcut: '/icon.svg',
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const organizationLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'XQBTS',
    url: 'https://xqbts.com',
    logo: 'https://xqbts.com/icon.svg',
    sameAs: ['https://xqbts.com'],
    parentOrganization: {
      '@type': 'Organization',
      name: '3DDev SMC PVT',
    },
  }

  const websiteLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Quantum Threat Terminal',
    url: 'https://xqbts.com',
    description:
      'Quantum threat intelligence terminal for benchmark evidence, Q-Day readiness projection, and cryptographic risk monitoring.',
    publisher: {
      '@type': 'Organization',
      name: '3DDev SMC PVT',
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://xqbts.com/?q={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  }

  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
        <Script id="ld-org" type="application/ld+json" strategy="afterInteractive">
          {JSON.stringify(organizationLd)}
        </Script>
        <Script id="ld-website" type="application/ld+json" strategy="afterInteractive">
          {JSON.stringify(websiteLd)}
        </Script>
        {clarityEnabled && clarityProjectId ? (
          <Script id="microsoft-clarity" strategy="afterInteractive">
            {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${clarityProjectId}");`}
          </Script>
        ) : null}
        <Analytics />
      </body>
    </html>
  )
}
