"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { Label } from "@radix-ui/react-label";
import { Switch } from "@/components/ui/switch";
import { ConnectButton } from "@mysten/dapp-kit";

export default function Header() {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  return (
    <div className="flex items-center justify-between w-full p-4">
      <div className="flex items-center w-1/2 ml-4">
        <Link href="/">
          <h1 className="text-2xl font-bold">Guava</h1>
        </Link>
      </div>
      <div className="flex items-center justify-end w-1/2 mr-4">
        <ConnectButton />
        <div className="flex items-center ml-4">
          <Switch
            id="theme-switch"
            checked={theme !== "light"}
            onCheckedChange={toggleTheme}
          />
          <Label htmlFor="theme-switch" className="ml-2">
            {theme === "light" ? "Light" : "Dark"} Mode
          </Label>
        </div>
      </div>
    </div>
  );
}
