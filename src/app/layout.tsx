import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const metadata: Metadata = {
  title: "TGROC Member Portal",
  description: "Member portal for TGROC – Telugu cultural organization",
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
        <Providers session={session}>{children}</Providers>
      </body>
    </html>
  );
}
