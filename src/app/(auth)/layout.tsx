import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-beta-black px-4">
      {/* Logo Beta */}
      <div className="mb-8">
        <div className="flex items-center justify-center">
          <span className="font-display text-4xl font-light tracking-tight text-beta-cream">
            Be<span className="relative">t<span className="absolute -top-1 left-1/2 -translate-x-1/2 w-0.5 h-3 bg-beta-cream" /></span>a
          </span>
        </div>
        <p className="text-center text-sm text-beta-gray-blue mt-2">
          /escalas
        </p>
      </div>

      {/* Content */}
      <div className="w-full max-w-md">
        {children}
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-xs text-beta-gray-blue">
        <p>Igreja Beta - Todos os direitos reservados</p>
      </div>
    </div>
  );
}
