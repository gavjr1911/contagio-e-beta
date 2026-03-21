import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-beta-black">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="lg:pl-64 transition-all duration-300">
        {/* Header */}
        <Header />

        {/* Page Content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
