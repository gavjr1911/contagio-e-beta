import { Logo } from "@/components/ui/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      {/* Logo Beta */}
      <div className="mb-8">
        <div className="flex items-center justify-center">
          <Logo variant="orange" size="lg" />
        </div>
        <p className="text-center text-sm text-muted-foreground mt-2">
          /escalas
        </p>
      </div>

      {/* Content */}
      <div className="w-full max-w-md">
        {children}
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-xs text-muted-foreground">
        <p>Igreja Beta - Todos os direitos reservados</p>
      </div>
    </div>
  );
}
