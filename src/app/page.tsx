"use client";

import { useCurrentAccount } from "@mysten/dapp-kit";

export default function Home() {
  const currentAccount = useCurrentAccount();

  return (
    <div>
      {currentAccount && (
        <p>{currentAccount.address}</p>
      )}
    </div>
  );
}
