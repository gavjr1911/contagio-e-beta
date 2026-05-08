import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { NoMinistryGuard } from "@/components/layout/no-ministry-guard";

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
    <div className="min-h-screen bg-background">
      {/* Sidebar (desktop) */}
      <Sidebar />

      {/* Main Content */}
      <div className="md:pl-64">
        {/* Header (inclui o botão hamburger no mobile) */}
        <Header />

        {/* Page Content */}
        <main className="p-4 md:p-6">
          <NoMinistryGuard>{children}</NoMinistryGuard>
        </main>
      </div>
    </div>
  );
}
