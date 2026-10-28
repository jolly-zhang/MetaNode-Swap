// import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'viem';
import {sepolia} from 'wagmi/chains';
import { getDefaultConfig, type Wallet } from "@rainbow-me/rainbowkit";
import {
  coinbaseWallet,
  metaMaskWallet,
  rainbowWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { createConnector } from "wagmi";
import { injected } from "wagmi/connectors";
import type { EIP1193Provider } from "viem";

//全局声明window对象
declare global {
  interface Window {
    mywallet?: EIP1193Provider;
  }
}

const myWallet = (): Wallet => ({
  id: "mywallet",
  name: "My Wallet",
  iconUrl:
    "data:image/svg+xml," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28"><rect width="28" height="28" rx="6" fill="#111"/><path fill="#fff" d="M7 9h14v10H7z"/></svg>',
    ),
  iconBackground: "#111111",
  // RainbowKit 会丢掉 installed === false 且没有下载链接的钱包。
  // 插件可能在配置初始化之后才注入，所以这里始终展示，点连接时再读 window.mywallet。
  installed: true,
  createConnector: (walletDetails) =>
    createConnector((config) => ({
      ...injected({
        target: {
          id: "mywallet",
          name: "My Wallet",
          provider: () =>
            typeof window === "undefined" ? undefined : window.mywallet,
        },
      })(config),
      ...walletDetails,
    })),
});

export const config = getDefaultConfig({
  appName: "Meta Node Stake",
  ssr: true,
  projectId: "e3242412afd6123ce1dda1de23a8c016",
  chains: [sepolia],
  transports: {
    [sepolia.id]: http('https://sepolia.infura.io/v3/d8ed0bd1de8242d998a1405b6932ab33'),

  },
  wallets: [
    {
      groupName: "推荐",
      wallets: [
        myWallet,
        rainbowWallet,
        coinbaseWallet,
        metaMaskWallet,
        walletConnectWallet,
      ],
    },
  ],
});