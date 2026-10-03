import './globals.css';
import { AppShell } from '../components/layout/app-shell';

export const metadata = {
  title: 'Obsrv',
  description: 'AI-powered global observability platform built on Oracle Database 23ai Free'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
