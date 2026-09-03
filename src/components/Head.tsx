import Link from "next/link";
import { ConnectButton } from '@rainbow-me/rainbowkit';


export default function Head(){
  const links = [
    {
      name:'Swap',
      href:'/'
    },
    {
      name:'Pool',
      href:'/pool'
    },
  ]
  return (
    <div className="flex flex-row justify-between items-center p-4 border-b-1 border-b-[#e4eaf3]">
      <h1 className="text-1xl font-bold">MetNodeSwap</h1>
      <div className="flex flex-row gap-10">
        {links.map((link)=>(
          <Link key={link.href} href={link.href}>{link.name}</Link>
        ))}
      </div>
      <ConnectButton />
    </div>
  );
}