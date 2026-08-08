import type { Metadata } from "next";
import { Toaster } from 'sonner';
import { Inter, JetBrains_Mono } from "next/font/google";
import ChatWidget from '@/components/chat-widget';
import "./globals.css";
import { GoogleAnalytics } from '@next/third-parties/google';

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin", "vietnamese"],
});

export const metadata: Metadata = {
  title: "Sonder - Mạng xã hội 2 trong 1",
  description: "Mạng xã hội chia sẻ tài liệu, đề thi và slide bài giảng dành riêng cho sinh viên",
  icons: {
    icon: "/logo-tlu.png",
    shortcut: "/logo-tlu.png",
    apple: "/logo-tlu.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  
  return (
    <html
      lang="vi"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      {gaId && <GoogleAnalytics gaId={gaId} />}
      <body className={`${inter.className} min-h-full flex flex-col bg-[#f0f2f5]`}>
        {children}
        <ChatWidget />
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}