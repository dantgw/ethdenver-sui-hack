import { ConnectButton } from "@mysten/dapp-kit";

const NavBar = () => {
  return (
    <nav className="sticky top-0 z-50 w-full flex flex-row border-b shadow-sm justify-center bg-black">
      <div className="flex flex-row items-center justify-between w-full max-w-[960px]">
        <span className="text-2xl font-bold">dApp Starter Template</span>
        <ConnectButton />
      </div>
    </nav>
  );
};

export default NavBar;
