"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Input } from "@/components/ui/input";

export function DesignSystemDemo() {
  return (
    <div className="container mx-auto p-8 space-y-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-display font-bold mb-2">Design System - Igreja Beta</h1>
          <p className="text-muted-foreground">
            Sistema de cores profissional com dark/light mode
          </p>
        </div>
        <ThemeToggle />
      </div>

      {/* Brand Colors */}
      <section className="space-y-4">
        <h2 className="text-2xl font-display font-semibold">Brand Colors</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6 space-y-4">
            <div className="h-20 bg-beta-black rounded-lg" />
            <div>
              <p className="font-medium">Beta Black</p>
              <p className="text-sm text-muted-foreground">#1B1B1B</p>
            </div>
          </Card>
          <Card className="p-6 space-y-4">
            <div className="h-20 bg-beta-terracotta rounded-lg" />
            <div>
              <p className="font-medium">Beta Terracotta</p>
              <p className="text-sm text-muted-foreground">#BF531A</p>
            </div>
          </Card>
          <Card className="p-6 space-y-4">
            <div className="h-20 bg-beta-cream rounded-lg" />
            <div>
              <p className="font-medium">Beta Cream</p>
              <p className="text-sm text-muted-foreground">#F5E7D7</p>
            </div>
          </Card>
        </div>
      </section>

      {/* Semantic Colors */}
      <section className="space-y-4">
        <h2 className="text-2xl font-display font-semibold">Semantic Colors</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-6 space-y-4">
            <div className="h-20 bg-primary rounded-lg" />
            <div>
              <p className="font-medium">Primary</p>
              <p className="text-sm text-muted-foreground">Ações principais</p>
            </div>
          </Card>
          <Card className="p-6 space-y-4">
            <div className="h-20 bg-destructive rounded-lg" />
            <div>
              <p className="font-medium">Destructive</p>
              <p className="text-sm text-muted-foreground">Ações destrutivas</p>
            </div>
          </Card>
          <Card className="p-6 space-y-4">
            <div className="h-20 bg-success rounded-lg" />
            <div>
              <p className="font-medium">Success</p>
              <p className="text-sm text-muted-foreground">Estados de sucesso</p>
            </div>
          </Card>
          <Card className="p-6 space-y-4">
            <div className="h-20 bg-warning rounded-lg" />
            <div>
              <p className="font-medium">Warning</p>
              <p className="text-sm text-muted-foreground">Avisos importantes</p>
            </div>
          </Card>
        </div>
      </section>

      {/* Buttons */}
      <section className="space-y-4">
        <h2 className="text-2xl font-display font-semibold">Buttons</h2>
        <Card className="p-6">
          <div className="flex flex-wrap gap-4">
            <Button variant="default">Primary Button</Button>
            <Button variant="secondary">Secondary Button</Button>
            <Button variant="outline">Outline Button</Button>
            <Button variant="ghost">Ghost Button</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="success">Success</Button>
            <Button variant="warning">Warning</Button>
            <Button variant="link">Link Button</Button>
          </div>
          <div className="mt-4 flex flex-wrap gap-4">
            <Button size="sm">Small</Button>
            <Button size="default">Default</Button>
            <Button size="lg">Large</Button>
          </div>
          <div className="mt-4 flex flex-wrap gap-4">
            <Button disabled>Disabled</Button>
            <Button variant="secondary" disabled>Disabled Secondary</Button>
          </div>
        </Card>
      </section>

      {/* Inputs */}
      <section className="space-y-4">
        <h2 className="text-2xl font-display font-semibold">Form Elements</h2>
        <Card className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Default Input</label>
              <Input placeholder="Digite algo..." />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Disabled Input</label>
              <Input placeholder="Disabled" disabled />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Text Area</label>
            <textarea
              className="w-full bg-input border border-input-border rounded-button p-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
              placeholder="Digite uma mensagem..."
              rows={4}
            />
          </div>
        </Card>
      </section>

      {/* Cards */}
      <section className="space-y-4">
        <h2 className="text-2xl font-display font-semibold">Cards</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6 space-y-4">
            <h3 className="text-lg font-semibold">Card Title</h3>
            <p className="text-muted-foreground">
              Este é um exemplo de card com o novo design system. Observe as bordas,
              sombras e transições suaves.
            </p>
            <Button className="w-full">Ação</Button>
          </Card>
          <Card className="p-6 space-y-4 hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-semibold">Hover Effect</h3>
            <p className="text-muted-foreground">
              Passe o mouse sobre este card para ver o efeito de elevação.
            </p>
            <Button variant="secondary" className="w-full">Explorar</Button>
          </Card>
          <Card className="p-6 space-y-4 border-primary">
            <h3 className="text-lg font-semibold text-primary">Destacado</h3>
            <p className="text-muted-foreground">
              Card com borda colorida para destacar conteúdo importante.
            </p>
            <Button variant="outline" className="w-full">Ver mais</Button>
          </Card>
        </div>
      </section>

      {/* Typography */}
      <section className="space-y-4">
        <h2 className="text-2xl font-display font-semibold">Typography</h2>
        <Card className="p-6 space-y-6">
          <div>
            <h1 className="text-4xl font-display font-bold mb-2">Heading 1</h1>
            <p className="text-sm text-muted-foreground">48px / DM Sans / Bold</p>
          </div>
          <div>
            <h2 className="text-3xl font-display font-semibold mb-2">Heading 2</h2>
            <p className="text-sm text-muted-foreground">30px / DM Sans / Semibold</p>
          </div>
          <div>
            <h3 className="text-2xl font-display font-semibold mb-2">Heading 3</h3>
            <p className="text-sm text-muted-foreground">24px / DM Sans / Semibold</p>
          </div>
          <div>
            <p className="text-base mb-2">
              Body text - Este é um exemplo de texto de parágrafo usando a fonte Inter.
              A linha tem altura de 1.5 para melhor legibilidade.
            </p>
            <p className="text-sm text-muted-foreground">16px / Inter / Regular</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Small text - Texto secundário com cor mais suave.
            </p>
            <p className="text-sm text-muted-foreground">14px / Inter / Regular</p>
          </div>
        </Card>
      </section>

      {/* Accessibility Info */}
      <section className="space-y-4">
        <h2 className="text-2xl font-display font-semibold">Accessibility</h2>
        <Card className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-3">WCAG AA Compliance</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-success mt-0.5">✓</span>
                  <span>Contraste mínimo de 4.5:1 para texto normal</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success mt-0.5">✓</span>
                  <span>Contraste de 3:1 para elementos grandes</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success mt-0.5">✓</span>
                  <span>Focus indicators visíveis em todos elementos</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success mt-0.5">✓</span>
                  <span>Cores não são o único meio de informação</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Dark Mode Optimizations</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-success mt-0.5">✓</span>
                  <span>Background #0F0F0F (não preto puro)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success mt-0.5">✓</span>
                  <span>Cores dessaturadas em 20 pontos</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success mt-0.5">✓</span>
                  <span>Transições suaves de 200ms</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success mt-0.5">✓</span>
                  <span>Sombras ajustadas para maior profundidade</span>
                </li>
              </ul>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
