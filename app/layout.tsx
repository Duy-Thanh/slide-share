import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import ChatWidget from '@/components/chat-widget';
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin", "vietnamese"],
});

export const metadata: Metadata = {
  title: "Sonder - Mạng xã hội chia sẻ tài liệu",
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
  return (
    <html
      lang="vi"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className={`${inter.className} min-h-full flex flex-col`}>
        {children}
        {/* ChatWidget tự quản lý auth status & tự lắng nghe event chat */}
        <ChatWidget />
      </body>
    </html>
  );
}