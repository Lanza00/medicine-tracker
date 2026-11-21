import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import RegisterSW from "@/components/RegisterSW";
import DemoBanner from "@/components/DemoBanner";
import { isDemo } from "@/lib/demoMode";

export const metadata: Metadata = {
  title: isDemo() ? "Medicine Tracker (demo)" : "Medicine Tracker",
  description: "Track daily medicine for your pets.",
  appleWebApp: { capable: true, title: "Medicine Tracker", statusBarStyle: "default" },
  icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#4F7BF7",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans">
        <div className="relative mx-auto min-h-dvh max-w-md bg-sky shadow-2xl">
          <DemoBanner />
          <main className="px-4 pb-28 pt-6">{children}</main>
          <BottomNav />
        </div>
        {isDemo() ? null : <RegisterSW />}
      </body>
    </html>
  );
}
