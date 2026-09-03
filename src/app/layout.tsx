import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NEXTMSG - Never wonder what to say next",
  description: "AI that understands the conversation and writes the reply like you would.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-black text-white antialiased">
        {children}
      </body>
    </html>
  );
}
