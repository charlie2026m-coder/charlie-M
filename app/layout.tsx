import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

export const metadata: Metadata = {
  title: "Charlie M Hotel - Smart Hotel in Berlin Mitte",
  description: "Charlie M Hotel - smart hotel in Berlin Mitte with automated check-in.",
};

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

const plusJakartaSans = Plus_Jakarta_Sans({ 
  variable: "--font-plus-jakarta-sans", 
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"]
});

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale?: string }>;
};

export default async function RootLayout({ children, params }: Props) {
  // Get locale from params if available, default to 'en'
  const resolvedParams = await params;
  const locale = resolvedParams?.locale || 'en';
  
  return (
    <html lang={locale}>
      <body className={`${inter.variable} ${plusJakartaSans.variable} antialiased bg-light-bg flex flex-col min-h-screen relative`}>
        {children}
      </body>
    </html>
  );
}
