import type { Metadata } from "next";
import "@mysten/dapp-kit/dist/index.css";
import { Toaster } from "@/components/ui/toaster"
import { Separator } from "@/components/ui/separator";

import "./globals.css";
import Context from "./context";
import Header from "@/components/header";

export const metadata: Metadata = {
  title: "Imaigine",
  description: "Imaigine",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Context>
          <div className="min-h-[8vh] flex flex-col justify-center items-center">
            <Header />
          </div>
          <Separator />
          <main className="flex min-h-[92vh]">
            {children}
          </main>
          <Toaster />
        </Context>
      </body>
    </html>
  );
}
