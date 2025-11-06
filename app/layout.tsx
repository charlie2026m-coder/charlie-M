import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ReactQueryProvider } from "./providers";
import Header from "./_components/header/Header";
import Footer from "./_components/footer/Footer";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Charlie M",
  description: "Charlie M booking platform",
};

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });


export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased bg-light-bg flex flex-col min-h-screen`}>
        <ReactQueryProvider>
          <Header/>
          <main className="flex-1 container">{children}</main>
          <Footer/>
          <Toaster position="top-left" richColors/>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
