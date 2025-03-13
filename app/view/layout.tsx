import Navbar from "@/components/layout/navbar";

export default function ViewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar isAdminView={false} />
      {children}
    </div>
  );
}
