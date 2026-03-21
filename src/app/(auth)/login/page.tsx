"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Loader2, Mail, Lock } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Email ou senha invalidos");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("Ocorreu um erro ao fazer login");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Card de Login */}
      <div className="bg-beta-navy/30 border border-beta-gray-blue/20 rounded-2xl p-8 backdrop-blur-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold text-beta-cream">
            Bem-vindo de volta
          </h1>
          <p className="text-beta-gray-blue mt-1">
            Entre com suas credenciais para continuar
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="text-sm font-medium text-beta-cream"
            >
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-beta-gray-blue" />
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 bg-beta-navy/50 border-beta-gray-blue/30 text-beta-cream placeholder:text-beta-gray-blue/60 focus:border-beta-terracotta focus:ring-beta-terracotta"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Senha */}
          <div className="space-y-2">
            <label
              htmlFor="password"
              className="text-sm font-medium text-beta-cream"
            >
              Senha
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-beta-gray-blue" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 bg-beta-navy/50 border-beta-gray-blue/30 text-beta-cream placeholder:text-beta-gray-blue/60 focus:border-beta-terracotta focus:ring-beta-terracotta"
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-beta-gray-blue hover:text-beta-cream transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {/* Erro */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p className="text-sm text-red-400 text-center">{error}</p>
            </div>
          )}

          {/* Esqueci minha senha */}
          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-sm text-beta-terracotta hover:text-beta-terracotta/80 transition-colors"
            >
              Esqueci minha senha
            </Link>
          </div>

          {/* Botao de Login */}
          <Button
            type="submit"
            className="w-full bg-beta-terracotta hover:bg-beta-terracotta/90 text-beta-cream font-semibold h-12"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Entrando...
              </>
            ) : (
              "Entrar"
            )}
          </Button>
        </form>
      </div>

      {/* Ajuda */}
      <p className="text-center text-sm text-beta-gray-blue">
        Problemas para acessar?{" "}
        <Link
          href="/contato"
          className="text-beta-terracotta hover:text-beta-terracotta/80 transition-colors"
        >
          Entre em contato
        </Link>
      </p>
    </div>
  );
}
