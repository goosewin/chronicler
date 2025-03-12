import Navbar from "@/components/layout/navbar";
import Sidebar from "@/components/layout/sidebar";
import type { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 container mx-auto p-6 md:p-8 max-w-7xl">
          {children}
        </main>
      </div>
    </div>
  );
}
