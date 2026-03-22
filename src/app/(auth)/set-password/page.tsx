"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Eye, EyeOff, Loader2, Lock, Check, AlertCircle } from "lucide-react"

export default function SetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [isSuccess, setIsSuccess] = useState(false)
  const [tokenValid, setTokenValid] = useState(false)
  const [userName, setUserName] = useState("")

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Verificar token ao carregar
  useEffect(() => {
    async function verifyToken() {
      if (!token) {
        setIsLoading(false)
        setError("Token de convite nao fornecido")
        return
      }

      try {
        const response = await fetch(`/api/auth/verify-invite?token=${token}`)
        const result = await response.json()

        if (result.data?.valid) {
          setTokenValid(true)
          setUserName(result.data.name || "")
        } else if (result.data?.expired) {
          setError("O link de convite expirou. Solicite um novo convite ao seu lider.")
        } else {
          setError("Link de convite invalido ou ja utilizado.")
        }
      } catch {
        setError("Erro ao verificar convite. Tente novamente.")
      } finally {
        setIsLoading(false)
      }
    }

    verifyToken()
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Validacoes
    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres")
      return
    }

    if (password !== confirmPassword) {
      setError("As senhas nao conferem")
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password,
          confirmPassword,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setIsSuccess(true)
        // Redirecionar para login apos 2 segundos
        setTimeout(() => {
          router.push("/login")
        }, 2000)
      } else {
        setError(result.error || "Erro ao definir senha")
      }
    } catch {
      setError("Erro ao definir senha. Tente novamente.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Estado de carregamento
  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-2xl p-8 backdrop-blur-sm">
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Verificando convite...</p>
        </div>
      </div>
    )
  }

  // Token invalido
  if (!tokenValid && !isSuccess) {
    return (
      <div className="bg-card border border-border rounded-2xl p-8 backdrop-blur-sm">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="rounded-full bg-destructive/10 p-3 mb-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Convite Invalido
          </h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Link href="/login">
            <Button variant="outline">Ir para Login</Button>
          </Link>
        </div>
      </div>
    )
  }

  // Sucesso
  if (isSuccess) {
    return (
      <div className="bg-card border border-border rounded-2xl p-8 backdrop-blur-sm">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="rounded-full bg-green-500/10 p-3 mb-4">
            <Check className="h-8 w-8 text-green-500" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Senha Criada!
          </h2>
          <p className="text-muted-foreground mb-2">
            Sua senha foi definida com sucesso.
          </p>
          <p className="text-muted-foreground text-sm">
            Redirecionando para o login...
          </p>
        </div>
      </div>
    )
  }

  // Formulario
  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-2xl p-8 backdrop-blur-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold text-foreground">
            Criar sua senha
          </h1>
          <p className="text-muted-foreground mt-1">
            {userName ? `Ola ${userName}, ` : ""}defina uma senha para acessar o sistema
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Senha */}
          <div className="space-y-2">
            <label
              htmlFor="password"
              className="text-sm font-medium text-foreground"
            >
              Senha
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Minimo 8 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 bg-muted border-border text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:ring-primary"
                required
                disabled={isSubmitting}
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {/* Confirmar Senha */}
          <div className="space-y-2">
            <label
              htmlFor="confirmPassword"
              className="text-sm font-medium text-foreground"
            >
              Confirmar Senha
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Digite a senha novamente"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10 pr-10 bg-muted border-border text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:ring-primary"
                required
                disabled={isSubmitting}
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showConfirmPassword ? (
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

          {/* Botao de Submit */}
          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90 text-foreground font-semibold h-12"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Criando senha...
              </>
            ) : (
              "Criar senha"
            )}
          </Button>
        </form>
      </div>

      {/* Ajuda */}
      <p className="text-center text-sm text-muted-foreground">
        Ja possui uma conta?{" "}
        <Link
          href="/login"
          className="text-primary hover:text-primary/80 transition-colors"
        >
          Fazer login
        </Link>
      </p>
    </div>
  )
}
