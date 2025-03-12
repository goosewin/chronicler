import { Home, Layers } from "lucide-react";
import Link from "next/link";

export default function ViewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl flex h-16 items-center justify-between">
          <div className="flex items-center gap-2 w-full justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Layers className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">Chronicler</span>
            </Link>
            <Link href="/changelogs" className="flex items-center gap-2 ml-auto">
              <Home className="h-4 w-4 text-primary" />
              <span className="text-sm font-bold">View Changelogs</span>
            </Link>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
