import "./globals.css";
import type { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <nav className="nav">
          <div className="nav-inner">
            <a className="brand" href="/">industrial-process-analytics</a>
            <a href="/">Dashboard</a>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
