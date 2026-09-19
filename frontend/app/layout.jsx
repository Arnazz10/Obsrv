import './globals.css';
import { TopNav } from '../components/layout/top-nav';

export const metadata = {
  title: 'Obsrv',
  description: 'AI-powered global observability platform built on Oracle Database 23ai Free'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <TopNav />
        <main className="mx-auto max-w-7xl px-5 py-8">{children}</main>
      </body>
    </html>
  );
}
