import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function Head() {
  const links = [
    {
      name: "Swap",
      href: "/",
    },
    {
      name: "Pool",
      href: "/pool",
    },
  ];
  const [account, setAccount] = useState<string>("");
  const connectWallet = async () => {
    const provider = (window as any).mywallet;

    if (!provider) {
      alert("未检测到钱包插件：window.mywallet");
      return;
    }

    try {
      const accounts = await provider.request({
        method: "eth_requestAccounts",
        params: [],
      });

      const walletAddress = Array.isArray(accounts) ? accounts[0] : "";
      if (walletAddress) {
        setAccount(walletAddress);
      }
    } catch (error) {
      console.error("连接失败", error);
    }
  };
  const disconnectWallet = async () => {
    const provider = (window as any).mywallet;

    try {
      if (provider?.request) {
        await provider.request({
          method: "wallet_disconnect",
          params: [],
        });
      }
    } catch (error) {
      console.warn("wallet_disconnect 不支持，改为本地清理", error);
    }
    setAccount("");
  };
  const toggleWallet = async () => {
    if (account) {
      await disconnectWallet();
      return;
    }

    await connectWallet();
  };

  return (
    <div className="flex flex-row justify-between items-center p-4 border-b-1 border-b-[#e4eaf3]">
      <h1 className="text-1xl font-bold">MetNodeSwap</h1>
      <Button onClick={toggleWallet}>{account ? `已连接: ${account.slice(0, 6)}...${account.slice(-4)}` : "连接钱包"}</Button>
      <div className="flex flex-row gap-10">
        {links.map((link) => (
          <Link key={link.href} href={link.href}>
            {link.name}
          </Link>
        ))}
      </div>

      <ConnectButton />
    </div>
  );
}