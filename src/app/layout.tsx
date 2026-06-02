import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { MobileTabBar } from "@/components/MobileTabBar";
import { getCurrentUser } from "@/lib/auth";
import { getUnreadCount } from "@/lib/messaging";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Contractors Exchange",
  description:
    "The community marketplace for the construction industry - buy, bid, and exchange across every trade and location.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();
  const unread = user ? await getUnreadCount(user.id) : 0;
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-white pb-14 text-slate-900 sm:pb-0">
        <SiteHeader />
        {children}
        {user && <MobileTabBar unread={unread} />}
      </body>
    </html>
  );
}
