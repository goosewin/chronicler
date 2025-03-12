"use client";

import { FileTextIcon, Folder, LayoutDashboard, Settings } from "lucide-react";
import Link from "next/link";

interface SidebarItem {
  title: string;
  href: string;
  icon: React.ElementType;
}

export default function Sidebar() {
  const sidebarItems: SidebarItem[] = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Projects",
      href: "/projects",
      icon: Folder,
    },
    {
      title: "Changelogs",
      href: "/changelogs",
      icon: FileTextIcon,
    },
    {
      title: "Settings",
      href: "/settings",
      icon: Settings,
    },
  ];

  return (
    <aside className="hidden border-r bg-muted/40 lg:block lg:w-64">
      <div className="flex h-full flex-col gap-2 p-4">
        {sidebarItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
          >
            <item.icon className="h-4 w-4" />
            <span>{item.title}</span>
          </Link>
        ))}
      </div>
    </aside>
  );
}
