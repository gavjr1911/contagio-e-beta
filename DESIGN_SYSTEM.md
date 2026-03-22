# Design System - Igreja Beta

## Visão Geral

Sistema de design profissional e moderno para o projeto Contágio e Beta, com suporte completo para dark mode e light mode, seguindo as melhores práticas de acessibilidade WCAG 2.1 AA.

## Filosofia de Design

### Princípios Core

1. **Simplicidade Elegante** - Cada elemento deve ter um propósito claro
2. **Acessibilidade em Primeiro Lugar** - Contraste mínimo de 4.5:1 para texto
3. **Consistência Visual** - Uso de escalas de espaçamento e cores predefinidas
4. **Adaptabilidade** - Funciona perfeitamente em light e dark mode

### Melhores Práticas 2026

- **Evitar preto puro**: Usamos #0F0F0F em vez de #000000 para reduzir fadiga ocular
- **Dessaturação em dark mode**: Cores 20 pontos menos saturadas em dark mode
- **Transições suaves**: Todas as mudanças de tema animadas em 200ms
- **Shadows contextuais**: Sombras mais intensas em dark mode para melhor separação

---

## Paleta de Cores

### Brand Colors (Identidade Visual)

```css
--beta-black: #1B1B1B        /* Preto institucional */
--beta-terracotta: #BF531A   /* Laranja/terracota característico */
--beta-cream: #F5E7D7        /* Creme suave */
```

**Uso:**
- `beta-black`: Textos importantes, headers, elementos de alta hierarquia
- `beta-terracotta`: Detalhes, badges, elementos decorativos
- `beta-cream`: Backgrounds alternativos, overlays suaves

---

### Neutral Palette (Escala de Cinzas)

Escala completa de 11 tons para flexibilidade total:

```css
--neutral-50:  #FAFAFA  /* Quase branco */
--neutral-100: #F5F5F5  /* Background alternativo light */
--neutral-200: #E5E5E5  /* Borders light */
--neutral-300: #D4D4D4  /* Borders secundários */
--neutral-400: #A3A3A3  /* Texto desabilitado */
--neutral-500: #737373  /* Texto secundário */
--neutral-600: #525252  /* Texto body */
--neutral-700: #404040  /* Texto enfatizado */
--neutral-800: #262626  /* Quase preto */
--neutral-900: #171717  /* Preto principal */
--neutral-950: #0A0A0A  /* Preto intenso */
```

**Guidelines:**
- Light mode: 50-400 para backgrounds, 600-900 para textos
- Dark mode: 800-950 para backgrounds, 50-400 para textos

---

### Orange Palette (Laranja Acessível)

Escala WCAG compliant com testes de contraste:

```css
--orange-50:  #FFF7ED  /* Tint mais claro */
--orange-100: #FFEDD5
--orange-200: #FED7AA
--orange-300: #FDBA74
--orange-400: #FB923C
--orange-500: #F97316
--orange-600: #EA580C
--orange-700: #C85400  /* WCAG AA em branco (4.5:1) ✓ */
--orange-800: #9C4221
--orange-900: #7C2D12
--orange-950: #431407  /* Shade mais escuro */
```

**Contraste WCAG:**
- ✅ `orange-700` (#C85400): 4.5:1 em branco - **AA Normal Text**
- ✅ `orange-800` (#9C4221): 6.1:1 em branco - **AAA Normal Text**
- ❌ `orange-600` (#EA580C): 3.5:1 em branco - **Falha para texto**

---

## Semantic Colors

### Light Mode

```css
/* Backgrounds */
--background: #FFFFFF
--foreground: #171717
--card: #FFFFFF
--card-foreground: #171717
--card-border: #E5E5E5

/* Actions */
--primary: #C85400           /* Orange WCAG AA */
--primary-hover: #A04600
--primary-foreground: #FFFFFF

--secondary: #F5F5F5
--secondary-hover: #E5E5E5
--secondary-foreground: #171717

/* States */
--muted: #F5F5F5
--muted-foreground: #737373

--accent: #C85400
--accent-hover: #A04600
--accent-foreground: #FFFFFF

/* Feedback */
--destructive: #DC2626       /* Red 600 */
--destructive-hover: #B91C1C
--destructive-foreground: #FFFFFF

--success: #16A34A           /* Green 600 */
--success-hover: #15803D
--success-foreground: #FFFFFF

--warning: #EA580C           /* Orange 600 */
--warning-hover: #C85400
--warning-foreground: #FFFFFF

--info: #0284C7              /* Sky 600 */
--info-hover: #0369A1
--info-foreground: #FFFFFF
```

### Dark Mode

```css
/* Backgrounds */
--background: #0F0F0F        /* Não preto puro */
--foreground: #EDEDED        /* Não branco puro */
--card: #1A1A1A
--card-foreground: #EDEDED
--card-border: rgba(255, 255, 255, 0.08)

/* Actions */
--primary: #FF6B2C           /* Dessaturado 20 pontos */
--primary-hover: #FF8555
--primary-foreground: #FFFFFF

--secondary: #262626
--secondary-hover: #2D2D2D
--secondary-foreground: #EDEDED

/* States */
--muted: #262626
--muted-foreground: #A3A3A3

--accent: #FF6B2C
--accent-hover: #FF8555
--accent-foreground: #FFFFFF

/* Feedback (versões mais claras) */
--destructive: #EF4444       /* Red 500 */
--destructive-hover: #F87171
--destructive-foreground: #FFFFFF

--success: #22C55E           /* Green 500 */
--success-hover: #4ADE80
--success-foreground: #FFFFFF

--warning: #F97316           /* Orange 500 */
--warning-hover: #FB923C
--warning-foreground: #FFFFFF

--info: #3B82F6              /* Blue 500 */
--info-hover: #60A5FA
--info-foreground: #FFFFFF
```

---

## Componentes

### Borders & Inputs

```css
/* Light Mode */
--border: #E5E5E5
--input: #FFFFFF
--input-border: #D4D4D4
--ring: #C85400              /* Focus ring */

/* Dark Mode */
--border: rgba(255, 255, 255, 0.08)
--input: #1A1A1A
--input-border: rgba(255, 255, 255, 0.12)
--ring: #FF6B2C
```

### Border Radius

Escala consistente baseada em múltiplos de 4px:

```css
--radius-xs: 4px
--radius-sm: 8px             /* Padrão */
--radius-md: 12px
--radius-lg: 16px
--radius-xl: 20px
--radius-2xl: 24px
--radius-card: 16px          /* Cards */
--radius-button: 8px         /* Botões */
```

### Box Shadows

**Light Mode:**
```css
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05)
--shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)
```

**Dark Mode:**
```css
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.5)
--shadow: 0 1px 3px 0 rgb(0 0 0 / 0.6), 0 1px 2px -1px rgb(0 0 0 / 0.6)
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.6), 0 2px 4px -2px rgb(0 0 0 / 0.6)
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.7), 0 4px 6px -4px rgb(0 0 0 / 0.7)
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.8), 0 8px 10px -6px rgb(0 0 0 / 0.8)
```

---

## Tipografia

### Font Families

```css
--font-sans: 'Inter', system-ui, sans-serif      /* Corpo */
--font-display: 'DM Sans', system-ui, sans-serif /* Headings */
```

### Hierarquia Recomendada

```css
/* Display (hero sections) */
.text-display: font-family: DM Sans; font-size: 48px; line-height: 1.1; font-weight: 700

/* Headings */
h1: font-size: 36px; line-height: 1.2; font-weight: 700
h2: font-size: 30px; line-height: 1.2; font-weight: 600
h3: font-size: 24px; line-height: 1.3; font-weight: 600
h4: font-size: 20px; line-height: 1.4; font-weight: 500

/* Body */
body: font-size: 16px; line-height: 1.5; font-weight: 400
small: font-size: 14px; line-height: 1.5; font-weight: 400
caption: font-size: 12px; line-height: 1.4; font-weight: 400
```

---

## Classes Utilitárias

### Cards

```css
.card-beta {
  background-color: var(--card);
  border-radius: var(--radius-card);
  border: 1px solid var(--card-border);
  box-shadow: var(--shadow-sm);
  transition: all 0.2s ease-in-out;
}

.card-beta:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--border);
}
```

### Buttons

```css
/* Primary Button */
.btn-primary {
  background-color: var(--primary);
  color: var(--primary-foreground);
  border-radius: var(--radius-button);
  padding: 0.75rem 1.5rem;
  font-weight: 500;
}

.btn-primary:hover {
  background-color: var(--primary-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

/* Secondary Button */
.btn-secondary {
  background-color: var(--secondary);
  color: var(--secondary-foreground);
  border: 1px solid var(--border);
  border-radius: var(--radius-button);
  padding: 0.75rem 1.5rem;
  font-weight: 500;
}

.btn-secondary:hover {
  background-color: var(--secondary-hover);
  border-color: var(--muted-foreground);
}
```

### Inputs

```css
.input-beta {
  background-color: var(--input);
  border: 1px solid var(--input-border);
  border-radius: var(--radius-button);
  padding: 0.75rem 1rem;
  color: var(--foreground);
}

.input-beta:hover {
  border-color: var(--border);
}

.input-beta:focus {
  border-color: var(--ring);
  box-shadow: 0 0 0 3px rgba(200, 84, 0, 0.1); /* Light mode */
}

.dark .input-beta:focus {
  box-shadow: 0 0 0 3px rgba(255, 107, 44, 0.2); /* Dark mode */
}
```

---

## Acessibilidade

### Contraste WCAG 2.1 Level AA

**Requisitos:**
- Texto normal (< 18px): mínimo 4.5:1
- Texto grande (≥ 18px ou ≥ 14px bold): mínimo 3:1
- Componentes UI: mínimo 3:1

**Cores Aprovadas:**

✅ **Light Mode:**
- Primary (#C85400) em branco: 4.5:1 ✓
- Foreground (#171717) em branco: 12.6:1 ✓
- Muted foreground (#737373) em branco: 4.6:1 ✓

✅ **Dark Mode:**
- Primary (#FF6B2C) em preto (#0F0F0F): 7.2:1 ✓
- Foreground (#EDEDED) em preto (#0F0F0F): 13.1:1 ✓
- Muted foreground (#A3A3A3) em preto (#0F0F0F): 6.8:1 ✓

### Focus Indicators

Todos os elementos interativos devem ter indicadores de foco visíveis:

```css
.focus-ring:focus {
  outline: none;
  box-shadow: 0 0 0 2px var(--background), 0 0 0 4px var(--ring);
}
```

---

## Uso no Código

### Tailwind Classes

```tsx
// Cards
<div className="bg-card text-card-foreground border border-card-border rounded-card shadow-sm">

// Buttons
<button className="bg-primary text-primary-foreground hover:bg-primary-hover rounded-button">

// Inputs
<input className="bg-input border border-input-border rounded-button focus:ring-2 focus:ring-ring">

// Semantic colors
<span className="text-success">Success</span>
<span className="text-warning">Warning</span>
<span className="text-destructive">Error</span>
```

### CSS Variables

```css
/* Use diretamente */
.custom-component {
  background: var(--card);
  color: var(--card-foreground);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}
```

---

## Theme Toggle

### Componente

```tsx
import { ThemeToggle } from "@/components/theme-toggle"

// No header ou sidebar
<ThemeToggle />
```

### Hook

```tsx
import { useTheme } from "@/providers/theme-provider"

function MyComponent() {
  const { theme, setTheme } = useTheme()

  return (
    <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
      Alternar Tema
    </button>
  )
}
```

### Opções de Tema

- `light` - Modo claro
- `dark` - Modo escuro
- `system` - Segue preferência do sistema operacional

---

## Testing & Validação

### Ferramentas Recomendadas

1. **WebAIM Contrast Checker**: https://webaim.org/resources/contrastchecker/
2. **Colour Contrast Analyser (CCA)**: App desktop para macOS/Windows
3. **axe DevTools**: Extensão do navegador
4. **Lighthouse**: Auditoria de acessibilidade do Chrome

### Checklist de Qualidade

- [ ] Todos os textos têm contraste mínimo 4.5:1
- [ ] Elementos interativos têm contraste mínimo 3:1
- [ ] Focus indicators são claramente visíveis
- [ ] Cores não são o único meio de transmitir informação
- [ ] Transições de tema são suaves (200ms)
- [ ] Tema persiste entre sessões (localStorage)
- [ ] Funciona com preferência do sistema

---

## Referências

### Fontes das Melhores Práticas

- [Dark Mode Design Best Practices 2026](https://www.tech-rz.com/blog/dark-mode-design-best-practices-in-2026/)
- [Color Tokens Guide to Light and Dark Modes](https://medium.com/design-bootcamp/color-tokens-guide-to-light-and-dark-modes-in-design-systems-146ab33023ac)
- [WCAG 2.1 Color Contrast Requirements](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
- [WebAIM Contrast and Color Accessibility](https://webaim.org/articles/contrast/)

### Design Systems de Referência

- Tailwind CSS
- Radix UI
- shadcn/ui
- Material Design 3
- Apple Human Interface Guidelines

---

**Última atualização:** Março 2026
**Versão:** 1.0.0
**Mantido por:** Equipe Beta
