import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { MobileTabBar } from "@/components/MobileTabBar";
import { getCurrentUser } from "@/lib/auth";
import { getUnreadCount } from "@/lib/messaging";
import { getActingContext } from "@/lib/identity";

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
  // On the admin subdomain the AdminShell provides all chrome, so the public
  // header / mobile tab bar are hidden (the proxy ensures only /admin renders here).
  const onAdminHost = ((await headers()).get("host") ?? "").startsWith("admin.");

  const user = await getCurrentUser();
  let unread = 0;
  if (user && !onAdminHost) {
    const ctx = await getActingContext(user.id);
    const party =
      ctx.type === "company"
        ? { type: "company" as const, id: ctx.company.id }
        : { type: "user" as const, id: user.id };
    unread = await getUnreadCount(party);
  }
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body
        className={`flex min-h-full flex-col bg-white text-slate-900 ${
          onAdminHost ? "" : "pb-14 sm:pb-0"
        }`}
      >
        {!onAdminHost && <SiteHeader />}
        {children}
        {user && !onAdminHost && <MobileTabBar unread={unread} />}
      </body>
    </html>
  );
}
