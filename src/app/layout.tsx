import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import PWARegister from "./PWARegister";

export const metadata: Metadata = {
  title: "TGROC Member Portal",
  description: "Member portal for TGROC – Tamils of Greater Rochester",
  icons: {
    icon: "/logo.jpg",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  return (
    <html lang="en">
      <body className="antialiased bg-gray-50 min-h-screen font-sans">
        <PWARegister />
        <Providers session={session}>{children}</Providers>
      </body>
    </html>
  );
}
