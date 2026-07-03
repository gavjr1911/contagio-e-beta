/**
 * Festival Gastronômico — dados estáticos da votação.
 *
 * As barracas são os estados brasileiros participantes (mesma lista concorre
 * em todas as 5 categorias). Fonte da verdade compartilhada entre o formulário
 * público (/festival), o painel de resultado (/festival/painel) e as APIs.
 *
 * Recurso TEMPORÁRIO do evento de 04/07/2026 — ver prisma model FestivalVote.
 */

export interface FestivalState {
  /** Chave curta persistida no banco (ex.: "BA"). NÃO alterar após haver votos. */
  key: string
  /** Nome da barraca/estado exibido ao usuário. */
  name: string
  /** Emoji temático do estado (decorativo). */
  emoji: string
  /** Prato salgado da barraca. */
  salgado: string
  /** Prato doce da barraca. */
  doce: string
  /** Cor de destaque do cartão (identidade festiva). */
  accent: string
}

export const FESTIVAL_STATES: FestivalState[] = [
  {
    key: "BA",
    name: "Bahia",
    emoji: "🥥",
    salgado: "Moqueca de banana da terra",
    doce: "Cocadinha baiana (+ suco de cacau)",
    accent: "#E8622A",
  },
  {
    key: "PE",
    name: "Pernambuco",
    emoji: "🎪",
    salgado: "Cuscuz no pote (carne desfiada / frango)",
    doce: "Cuscuz de tapioca com leite condensado",
    accent: "#D93A6B",
  },
  {
    key: "SP",
    name: "São Paulo",
    emoji: "🏙️",
    salgado: "Camarão na abóbora",
    doce: "Pudim de leite condensado",
    accent: "#3E7CB1",
  },
  {
    key: "AM",
    name: "Amazonas",
    emoji: "🌳",
    salgado: "Tapioca (marguerita / frango)",
    doce: "Açaí (250 ml) com toppings",
    accent: "#2E8B57",
  },
  {
    key: "MG",
    name: "Minas Gerais",
    emoji: "⛰️",
    salgado: "Pão de queijo recheado com café",
    doce: "Pão de queijo recheado com goiabada",
    accent: "#B5651D",
  },
  {
    key: "RS",
    name: "Rio Grande do Sul",
    emoji: "🐎",
    salgado: "Costela de boi com arroz carreteiro",
    doce: "Bombom aberto de uva",
    accent: "#8E44AD",
  },
  {
    key: "RJ",
    name: "Rio de Janeiro",
    emoji: "🏖️",
    salgado: "Pasteizinhos (carne / queijo)",
    doce: "Sacolé de maracujá com chocolate",
    accent: "#159E8C",
  },
  {
    key: "PB",
    name: "Paraíba",
    emoji: "☀️",
    salgado: "Arrumadinho (carne de sol, farofa, feijão)",
    doce: "Petit gâteau de doce de leite",
    accent: "#E0A82E",
  },
  {
    key: "GO",
    name: "Goiás",
    emoji: "🌾",
    salgado: "Galinhada",
    doce: "Cajuzinho",
    accent: "#C0392B",
  },
]

/**
 * Caminho da imagem da bandeira do estado (SVG self-hosted em /public).
 * As bandeiras oficiais ficam em public/festival/flags/<KEY>.svg.
 */
export function festivalFlagSrc(key: string): string {
  return `/festival/flags/${key}.svg`
}

/** Chaves válidas de barraca — usadas para validação nas APIs. */
export const FESTIVAL_STATE_KEYS = FESTIVAL_STATES.map((s) => s.key) as [
  string,
  ...string[],
]

/** Lookup rápido por chave. */
export const FESTIVAL_STATE_BY_KEY: Record<string, FestivalState> =
  Object.fromEntries(FESTIVAL_STATES.map((s) => [s.key, s]))

/** Cada categoria mapeia 1:1 para uma coluna do modelo FestivalVote. */
export type FestivalCategoryId =
  | "barracaBonita"
  | "melhorAtendimento"
  | "gastronomiaSalgada"
  | "gastronomiaDoce"
  | "espiritoBeta"

export interface FestivalCategory {
  id: FestivalCategoryId
  emoji: string
  /** Título completo exibido na tela da pergunta. */
  title: string
  /** Rótulo curto (usado no painel/telão e barra de progresso). */
  short: string
  /** Chamada principal da pergunta. */
  prompt: string
  /** O que o votante deve considerar ao votar. */
  considere: string
  /**
   * Quando definido, os cartões desta categoria destacam o prato correspondente
   * de cada barraca ("salgado" | "doce"). Para as demais, mostra só o estado.
   */
  dish?: "salgado" | "doce"
}

export const FESTIVAL_CATEGORIES: FestivalCategory[] = [
  {
    id: "barracaBonita",
    emoji: "🎨",
    title: "Barraca Mais Bonita",
    short: "Mais Bonita",
    prompt: "Vote na barraca que chamou mais sua atenção pela criatividade e apresentação.",
    considere:
      "Criatividade, decoração, capricho, organização visual e identidade com o tema.",
  },
  {
    id: "melhorAtendimento",
    emoji: "😊",
    title: "Melhor Atendimento",
    short: "Atendimento",
    prompt: "Vote na equipe que fez você se sentir mais bem recebido.",
    considere: "Simpatia, educação, cordialidade, agilidade e hospitalidade.",
  },
  {
    id: "gastronomiaSalgada",
    emoji: "🍢",
    title: "Melhor Gastronomia Salgada",
    short: "Salgado",
    prompt: "Vote no prato salgado que mais conquistou seu paladar.",
    considere: "Sabor, apresentação, qualidade e capricho.",
    dish: "salgado",
  },
  {
    id: "gastronomiaDoce",
    emoji: "🍰",
    title: "Melhor Gastronomia Doce",
    short: "Doce",
    prompt: "Vote no prato doce que mais conquistou seu paladar.",
    considere: "Sabor, apresentação, qualidade e capricho.",
    dish: "doce",
  },
  {
    id: "espiritoBeta",
    emoji: "❤️",
    title: "Prêmio Espírito Beta",
    short: "Espírito Beta",
    prompt: "Vote na equipe que mais demonstrou o amor de Jesus através do serviço.",
    considere:
      "Alegria em servir, gentileza, união da equipe, atenção aos visitantes, amor e acolhimento.",
  },
]

export const FESTIVAL_CATEGORY_IDS = FESTIVAL_CATEGORIES.map(
  (c) => c.id,
) as FestivalCategoryId[]

/** Tagline oficial do evento. */
export const FESTIVAL_TAGLINE = "SABORES QUE UNEM, FÉ QUE TRANSFORMA!"
