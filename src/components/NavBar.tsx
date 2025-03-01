import { ConnectButton } from "@mysten/dapp-kit";
import { useEffect, useState } from "react";

const NavBar = () => {
  const [pathname, setPathname] = useState(window.location.pathname);

  useEffect(() => {
    const updatePath = () => {
      setPathname(window.location.pathname);
    };

    window.addEventListener("popstate", updatePath);
    return () => window.removeEventListener("popstate", updatePath);
  }, []);

  const navItems = [
    { label: "Store", path: "/" },
    // { label: "Support", path: "/support" },
    { label: "Upload", path: "/upload" },
  ];

  return (
    <nav className="sticky top-0 h-20 z-50 w-full flex flex-row border-b shadow-sm justify-center items-center bg-[#1E1E1E] ">
      <div className="flex flex-row h-full items-center justify-between w-full max-w-[960px]">
        <img src="/images/degs2_128.png" className="h-16" />
        {/* <span className="text-2xl font-bold">dApp Starter Template</span> */}
        <span className="flex flex-row gap-x-8">
          {navItems.map((item) => (
            <a
              key={item.path}
              href={item.path}
              className={`${
                pathname === item.path ||
                (item.path === "/" && pathname === "/home")
                  ? "font-bold underline text-[#00BFFF]"
                  : ""
              }`}
            >
              {item.label}
            </a>
          ))}
        </span>
        <ConnectButton
          connectText="Login"
          style={{
            backgroundColor: "#8A2BE2",
            color: "white",
            padding: "8px 16px",
            borderRadius: "8px",
            height: "32px",
            cursor: "pointer",
          }}
        />
      </div>
    </nav>
  );
};

export default NavBar;
