import type { Metadata } from 'next';
import { Anton, Archivo, Barlow, Barlow_Condensed } from 'next/font/google';
import './globals.css';

const anton = Anton({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-anton',
  display: 'swap',
});

const archivo = Archivo({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-archivo',
  display: 'swap',
});

const barlow = Barlow({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-barlow',
  display: 'swap',
});

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-barlow-condensed',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Allenamenti',
  description: 'App per il tracciamento degli allenamenti in palestra',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={`${anton.variable} ${archivo.variable} ${barlow.variable} ${barlowCondensed.variable}`}>
      <body style={{ background:'var(--nk-white)', color:'var(--nk-black)', minHeight:'100vh', fontFamily:'var(--font-archivo), Helvetica, Arial, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
