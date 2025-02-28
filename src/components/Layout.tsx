import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import NavBar from "./NavBar";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <div className="min-h-screen w-full  items-center flex flex-col bg-[#202020]">
      <NavBar />
      <div className="max-w-7xl mx-auto px-4">
        <main>{children}</main>
      </div>
    </div>
  );
}
