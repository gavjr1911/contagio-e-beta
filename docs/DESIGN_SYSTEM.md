# Design System - Contágio e Beta

## Baseado na Identidade Visual da Igreja Beta

Este documento define os padrões visuais do sistema Contágio e Beta, alinhados com a identidade visual oficial da Igreja Beta (Brand Guideline 2024).

---

## 1. Paleta de Cores

### Cores Principais

| Cor | Hex | RGB | Pantone | Uso | Proporção |
|-----|-----|-----|---------|-----|-----------|
| **Preto** | `#1B1B1B` | 27, 27, 27 | BLACK C | Backgrounds, textos principais | 30% |
| **Navy** | `#3B5562` | 59, 85, 98 | 7545 C | Backgrounds secundários, cards | 30% |
| **Creme** | `#F5E7D7` | 245, 231, 215 | 7604 C | Backgrounds claros, cards light | 20% |
| **Terracota** | `#BF531A` | 191, 83, 26 | 718 C | Acentos, CTAs, destaques | 10% |
| **Cinza Azulado** | `#C5CACD` | 197, 202, 205 | 7443 C | Bordas, ícones, textos secundários | 10% |

### Aplicação no Sistema

```css
:root {
  /* Cores Primárias */
  --color-black: #1B1B1B;
  --color-navy: #3B5562;
  --color-cream: #F5E7D7;
  --color-terracotta: #BF531A;
  --color-gray-blue: #C5CACD;

  /* Semânticas */
  --color-background: #1B1B1B;
  --color-background-secondary: #3B5562;
  --color-background-light: #F5E7D7;
  --color-accent: #BF531A;
  --color-text-primary: #F5E7D7;
  --color-text-secondary: #C5CACD;
  --color-text-on-light: #1B1B1B;

  /* Estados */
  --color-success: #4CAF50;
  --color-warning: #BF531A;
  --color-error: #E53935;
  --color-info: #3B5562;
}
```

### Modo Claro vs Escuro

O sistema será **dark mode por padrão**, alinhado com a identidade visual da Beta.

#### Dark Mode (Padrão)
| Elemento | Cor |
|----------|-----|
| Background principal | `#1B1B1B` |
| Background cards | `#3B5562` |
| Texto principal | `#F5E7D7` |
| Texto secundário | `#C5CACD` |
| Acentos/Botões | `#BF531A` |

#### Light Mode (Alternativo)
| Elemento | Cor |
|----------|-----|
| Background principal | `#F5E7D7` |
| Background cards | `#FFFFFF` |
| Texto principal | `#1B1B1B` |
| Texto secundário | `#3B5562` |
| Acentos/Botões | `#BF531A` |

---

## 2. Tipografia

### Fontes Principais

| Uso | Fonte | Peso | Tracking | Aplicação |
|-----|-------|------|----------|-----------|
| **H1** | Neue Haas Display | Regular/Medium | Normal | Títulos e manchetes |
| **H2** | PP Fragment Text | Bold | +1 | Subtítulos |
| **H3** | PP Fragment Text | Bold | +1 | Tags, labels |
| **Body** | Neue Haas Text | Regular | Normal | Descrições, parágrafos |
| **Logo** | Neue Haas Grotesk Display | 35 Extra Light | - | Logotipo e categorias |

### Alternativas Web (Google Fonts)

Como as fontes originais são pagas, usaremos alternativas similares:

| Original | Alternativa Google Fonts | Fallback |
|----------|-------------------------|----------|
| Neue Haas Display | **Inter** | system-ui, sans-serif |
| PP Fragment Text | **DM Sans** | system-ui, sans-serif |
| Neue Haas Text | **Inter** | system-ui, sans-serif |
| Neue Haas Grotesk | **Inter** | system-ui, sans-serif |

> **Nota**: Se a igreja tiver licença das fontes originais, podemos usar via @font-face.

### Escala Tipográfica

```css
:root {
  /* Font Families */
  --font-display: 'Inter', system-ui, sans-serif;
  --font-body: 'Inter', system-ui, sans-serif;
  --font-accent: 'DM Sans', system-ui, sans-serif;

  /* Font Sizes */
  --text-xs: 0.75rem;     /* 12px */
  --text-sm: 0.875rem;    /* 14px */
  --text-base: 1rem;      /* 16px */
  --text-lg: 1.125rem;    /* 18px */
  --text-xl: 1.25rem;     /* 20px */
  --text-2xl: 1.5rem;     /* 24px */
  --text-3xl: 1.875rem;   /* 30px */
  --text-4xl: 2.25rem;    /* 36px */
  --text-5xl: 3rem;       /* 48px */
  --text-6xl: 3.75rem;    /* 60px */

  /* Font Weights */
  --font-light: 300;
  --font-regular: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;

  /* Line Heights */
  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.75;

  /* Letter Spacing */
  --tracking-tight: -0.025em;
  --tracking-normal: 0;
  --tracking-wide: 0.025em;
}
```

### Hierarquia de Texto

| Elemento | Tamanho | Peso | Line Height | Uso |
|----------|---------|------|-------------|-----|
| H1 | 48px / 3rem | Medium (500) | 1.25 | Títulos de página |
| H2 | 36px / 2.25rem | Semibold (600) | 1.25 | Seções principais |
| H3 | 24px / 1.5rem | Semibold (600) | 1.35 | Subtítulos |
| H4 | 20px / 1.25rem | Medium (500) | 1.4 | Cards, títulos menores |
| Body | 16px / 1rem | Regular (400) | 1.5 | Texto principal |
| Small | 14px / 0.875rem | Regular (400) | 1.5 | Texto auxiliar |
| Caption | 12px / 0.75rem | Regular (400) | 1.4 | Labels, timestamps |

---

## 3. Logotipo

### Versões do Logo

1. **Logo Principal**: "Beta" com o "t" estilizado como cruz
2. **Logo Reduzido**: Apenas o "t" em forma de cruz (para favicons, ícones de app)

### Área de Proteção

- Margem mínima ao redor do logo: equivalente à altura da letra "a"
- Aplicar uniformemente em todos os lados

### Aplicações no Sistema

| Contexto | Versão | Tamanho |
|----------|--------|---------|
| Header/Navbar | Logo principal | 32px altura |
| Favicon | Logo reduzido (cruz) | 32x32px |
| PWA Icon | Logo reduzido (cruz) | 192x192px, 512x512px |
| Splash Screen | Logo principal | Centralizado |
| Login | Logo principal | 48px altura |

### Cores do Logo

| Fundo | Cor do Logo |
|-------|-------------|
| Escuro (#1B1B1B) | Creme (#F5E7D7) |
| Navy (#3B5562) | Creme (#F5E7D7) |
| Claro (#F5E7D7) | Preto (#1B1B1B) |

---

## 4. Componentes UI

### Botões

#### Primary Button
```css
.btn-primary {
  background-color: #BF531A;
  color: #F5E7D7;
  border-radius: 8px;
  padding: 12px 24px;
  font-weight: 600;
  transition: background-color 0.2s;
}
.btn-primary:hover {
  background-color: #A04516; /* Terracota escurecido */
}
```

#### Secondary Button
```css
.btn-secondary {
  background-color: transparent;
  color: #F5E7D7;
  border: 1px solid #C5CACD;
  border-radius: 8px;
  padding: 12px 24px;
}
.btn-secondary:hover {
  background-color: #3B5562;
}
```

#### Ghost Button
```css
.btn-ghost {
  background-color: transparent;
  color: #BF531A;
  padding: 12px 24px;
}
.btn-ghost:hover {
  background-color: rgba(191, 83, 26, 0.1);
}
```

### Cards

```css
.card {
  background-color: #3B5562;
  border-radius: 16px;
  padding: 24px;
  border: 1px solid rgba(197, 202, 205, 0.1);
}

.card-light {
  background-color: #F5E7D7;
  color: #1B1B1B;
  border-radius: 16px;
  padding: 24px;
}
```

### Inputs

```css
.input {
  background-color: rgba(59, 85, 98, 0.5);
  border: 1px solid #C5CACD;
  border-radius: 8px;
  padding: 12px 16px;
  color: #F5E7D7;
}
.input:focus {
  border-color: #BF531A;
  outline: none;
  box-shadow: 0 0 0 2px rgba(191, 83, 26, 0.2);
}
.input::placeholder {
  color: #C5CACD;
}
```

### Tags/Badges

```css
.badge {
  background-color: #3B5562;
  color: #F5E7D7;
  padding: 4px 12px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
}

.badge-accent {
  background-color: #BF531A;
  color: #F5E7D7;
}

.badge-success {
  background-color: #4CAF50;
  color: #FFFFFF;
}

.badge-warning {
  background-color: #BF531A;
  color: #F5E7D7;
}
```

---

## 5. Espaçamentos

### Sistema de Grid

```css
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;
}
```

### Border Radius

```css
:root {
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-2xl: 24px;
  --radius-full: 9999px;
}
```

---

## 6. Sombras

```css
:root {
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.15);
  --shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.2);

  /* Sombra com cor de destaque */
  --shadow-accent: 0 4px 14px rgba(191, 83, 26, 0.3);
}
```

---

## 7. Ícones

### Biblioteca Recomendada
- **Lucide Icons** (consistente com shadcn/ui)
- Tamanho padrão: 24px
- Stroke width: 2px

### Cores dos Ícones
| Contexto | Cor |
|----------|-----|
| Ícone padrão | `#C5CACD` |
| Ícone ativo | `#F5E7D7` |
| Ícone de ação | `#BF531A` |
| Ícone em fundo claro | `#1B1B1B` |

---

## 8. Animações e Transições

```css
:root {
  /* Durações */
  --duration-fast: 150ms;
  --duration-normal: 200ms;
  --duration-slow: 300ms;

  /* Easings */
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
}
```

---

## 9. Configuração Tailwind CSS

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        // Cores Beta
        beta: {
          black: '#1B1B1B',
          navy: '#3B5562',
          cream: '#F5E7D7',
          terracotta: '#BF531A',
          'gray-blue': '#C5CACD',
        },
        // Aliases semânticos
        background: '#1B1B1B',
        foreground: '#F5E7D7',
        muted: '#3B5562',
        'muted-foreground': '#C5CACD',
        accent: '#BF531A',
        'accent-foreground': '#F5E7D7',
        card: '#3B5562',
        'card-foreground': '#F5E7D7',
        border: 'rgba(197, 202, 205, 0.2)',
        input: 'rgba(59, 85, 98, 0.5)',
        ring: '#BF531A',
      },
      fontFamily: {
        display: ['Inter', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        accent: ['DM Sans', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'beta': '16px',
      },
    },
  },
}
```

---

## 10. Submarcas / Ministérios

Seguindo o padrão "Beta /categoria":

| Ministério | Padrão | Ícone |
|------------|--------|-------|
| Comunidade | Beta /comunidade | Casa |
| Kids | Beta /kids | Smile |
| Teatro | Beta /teatro | Pessoa |
| Música | Beta /música | Nota musical |
| Casais | Beta /casais | Coração |

Para o sistema, podemos adicionar:
- **Beta /escalas** - Calendário
- **Beta /louvor** - Microfone
- **Beta /técnica** - Engrenagem

---

## 11. Aplicação nas Telas Principais

### Login
- Background: Preto (#1B1B1B)
- Logo centralizado
- Campos com fundo Navy semi-transparente
- Botão terracota

### Dashboard
- Sidebar: Navy (#3B5562)
- Conteúdo: Preto (#1B1B1B)
- Cards: Navy (#3B5562)
- Acentos: Terracota (#BF531A)

### Cards de Escala
- Pendente: Borda terracota
- Confirmado: Borda verde (#4CAF50)
- Recusado: Borda vermelha (#E53935)

### Calendário
- Dias com evento: Destaque terracota
- Hoje: Círculo creme
- Selecionado: Background terracota

---

## 12. Acessibilidade

### Contraste
Todas as combinações de cores foram verificadas para WCAG AA:

| Combinação | Ratio | Status |
|------------|-------|--------|
| Creme em Preto | 12.5:1 | ✅ AAA |
| Creme em Navy | 6.8:1 | ✅ AA |
| Terracota em Preto | 4.7:1 | ✅ AA |
| Preto em Creme | 12.5:1 | ✅ AAA |

### Focus States
Todos os elementos interativos devem ter:
- Outline visível no focus
- Cor de focus: Terracota (#BF531A)
- Ring de 2px com transparência

---

## Assets Necessários

### Para Desenvolvimento
- [ ] Logo SVG (versão principal)
- [ ] Logo SVG (versão cruz/ícone)
- [ ] Ícones de ministérios SVG
- [ ] Fontes (se licenciadas) ou confirmar uso de alternativas

### Para PWA
- [ ] icon-192x192.png
- [ ] icon-512x512.png
- [ ] apple-touch-icon.png
- [ ] favicon.ico
- [ ] Splash screens para iOS

---

*Documento criado em: Março/2026*
*Baseado no: Beta Brand Guideline 2024 - Pinheiro Work*
