import './globals.css';
import { Geist, Geist_Mono } from 'next/font/google';

const sans = Geist({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

export const metadata = {
  title: { default: 'Obsrv · Log observability on Oracle 23ai', template: '%s · Obsrv' },
  description: 'Collect JSON logs from every region, spot anomalies, and find related incidents by meaning — all inside one Oracle Database 23ai.',
  icons: { icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%23c6f24e'/%3E%3Ccircle cx='16' cy='16' r='5' fill='none' stroke='%2310130a' stroke-width='3'/%3E%3C/svg%3E" }
};

export const viewport = { themeColor: '#0a0b0d' };

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
