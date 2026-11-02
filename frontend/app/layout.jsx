import './globals.css';
import { AppShell } from '../components/layout/app-shell';

export const metadata = {
  title: 'Obsrv | Operations Console',
  description: 'Operational visibility, incident alerts, and service communications'
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
