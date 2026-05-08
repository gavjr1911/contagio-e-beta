// Biblioteca de ícones para funções/posições
// Usando Lucide React icons

export type PositionIconCategory =
  | "instruments"
  | "audio_video"
  | "worship"
  | "ministry"
  | "communication"
  | "admin"
  | "people"
  | "objects"
  | "symbols"

export interface PositionIconOption {
  name: string
  label: string
  category: PositionIconCategory
}

// Instrumentos musicais
const instrumentIcons: PositionIconOption[] = [
  // Cordas
  { name: "Guitar", label: "Guitarra", category: "instruments" },
  { name: "Music", label: "Violao", category: "instruments" },
  { name: "Disc", label: "Baixo", category: "instruments" },
  { name: "Waves", label: "Baixo Eletrico", category: "instruments" },
  { name: "CircleDot", label: "Violino", category: "instruments" },
  // Teclas
  { name: "Piano", label: "Piano", category: "instruments" },
  { name: "Keyboard", label: "Teclado", category: "instruments" },
  { name: "LayoutGrid", label: "Sintetizador", category: "instruments" },
  { name: "Square", label: "Pad/Sampler", category: "instruments" },
  // Percussao
  { name: "Drum", label: "Bateria", category: "instruments" },
  { name: "Circle", label: "Bumbo", category: "instruments" },
  { name: "CircleDashed", label: "Caixa", category: "instruments" },
  { name: "CircleFadingPlus", label: "Prato", category: "instruments" },
  { name: "Timer", label: "Metronomo", category: "instruments" },
  { name: "Vibrate", label: "Percussao", category: "instruments" },
  { name: "Boxes", label: "Cajon", category: "instruments" },
  // Sopro
  { name: "Wind", label: "Sopro", category: "instruments" },
  { name: "Cylinder", label: "Flauta", category: "instruments" },
  { name: "Cone", label: "Saxofone", category: "instruments" },
  { name: "Megaphone", label: "Trompete", category: "instruments" },
  // Vocal e Microfones
  { name: "Mic", label: "Microfone", category: "instruments" },
  { name: "Mic2", label: "Microfone Condensador", category: "instruments" },
  { name: "MicVocal", label: "Vocal", category: "instruments" },
  { name: "Speech", label: "Back Vocal", category: "instruments" },
  { name: "MessageCircle", label: "Coral", category: "instruments" },
  // Audio
  { name: "AudioWaveform", label: "Onda Sonora", category: "instruments" },
  { name: "AudioLines", label: "Linhas de Audio", category: "instruments" },
  { name: "Music2", label: "Nota Musical", category: "instruments" },
  { name: "Music3", label: "Melodia", category: "instruments" },
  { name: "Music4", label: "Partitura", category: "instruments" },
  { name: "ListMusic", label: "Repertorio", category: "instruments" },
  // Lider/Diretor
  { name: "Wand2", label: "Regente", category: "instruments" },
  { name: "Sparkles", label: "Lider Musical", category: "instruments" },
  { name: "Crown", label: "Diretor Musical", category: "instruments" },
]

// Áudio e vídeo
const audioVideoIcons: PositionIconOption[] = [
  { name: "Monitor", label: "Monitor", category: "audio_video" },
  { name: "MonitorPlay", label: "Projeção", category: "audio_video" },
  { name: "Tv", label: "TV", category: "audio_video" },
  { name: "Tv2", label: "Televisão", category: "audio_video" },
  { name: "Camera", label: "Câmera", category: "audio_video" },
  { name: "Video", label: "Vídeo", category: "audio_video" },
  { name: "Clapperboard", label: "Claquete", category: "audio_video" },
  { name: "Film", label: "Filme", category: "audio_video" },
  { name: "Speaker", label: "Caixa de Som", category: "audio_video" },
  { name: "Volume2", label: "Volume", category: "audio_video" },
  { name: "Headphones", label: "Fone de Ouvido", category: "audio_video" },
  { name: "Radio", label: "Rádio", category: "audio_video" },
  { name: "Laptop", label: "Notebook", category: "audio_video" },
  { name: "Laptop2", label: "Laptop", category: "audio_video" },
  { name: "Computer", label: "Computador", category: "audio_video" },
  { name: "Tablet", label: "Tablet", category: "audio_video" },
  { name: "Smartphone", label: "Celular", category: "audio_video" },
  { name: "Projector", label: "Projetor", category: "audio_video" },
  { name: "Cable", label: "Cabo", category: "audio_video" },
  { name: "Plug", label: "Plugue", category: "audio_video" },
]

// Louvor e adoração
const worshipIcons: PositionIconOption[] = [
  { name: "HandHeart", label: "Mãos ao Coração", category: "worship" },
  { name: "Heart", label: "Coração", category: "worship" },
  { name: "HeartHandshake", label: "Aperto de Mãos", category: "worship" },
  { name: "Sparkles", label: "Brilhos", category: "worship" },
  { name: "Star", label: "Estrela", category: "worship" },
  { name: "Sun", label: "Sol", category: "worship" },
  { name: "Moon", label: "Lua", category: "worship" },
  { name: "Flame", label: "Chama", category: "worship" },
  { name: "Zap", label: "Raio", category: "worship" },
  { name: "Crown", label: "Coroa", category: "worship" },
  { name: "Cross", label: "Cruz", category: "worship" },
  { name: "Church", label: "Igreja", category: "worship" },
]

// Ministérios e serviços
const ministryIcons: PositionIconOption[] = [
  { name: "Home", label: "Casa", category: "ministry" },
  { name: "Building", label: "Prédio", category: "ministry" },
  { name: "Building2", label: "Edifício", category: "ministry" },
  { name: "Door", label: "Porta", category: "ministry" },
  { name: "DoorOpen", label: "Porta Aberta", category: "ministry" },
  { name: "Key", label: "Chave", category: "ministry" },
  { name: "Lock", label: "Cadeado", category: "ministry" },
  { name: "Shield", label: "Escudo", category: "ministry" },
  { name: "ShieldCheck", label: "Segurança", category: "ministry" },
  { name: "Car", label: "Carro", category: "ministry" },
  { name: "Bus", label: "Ônibus", category: "ministry" },
  { name: "Truck", label: "Caminhão", category: "ministry" },
  { name: "Utensils", label: "Talheres", category: "ministry" },
  { name: "UtensilsCrossed", label: "Cozinha", category: "ministry" },
  { name: "Coffee", label: "Café", category: "ministry" },
  { name: "Cookie", label: "Biscoito", category: "ministry" },
  { name: "Cake", label: "Bolo", category: "ministry" },
  { name: "GlassWater", label: "Água", category: "ministry" },
  { name: "Wine", label: "Vinho/Ceia", category: "ministry" },
  { name: "Flower", label: "Flor", category: "ministry" },
  { name: "Flower2", label: "Flor 2", category: "ministry" },
  { name: "TreePine", label: "Árvore", category: "ministry" },
  { name: "Leaf", label: "Folha", category: "ministry" },
]

// Comunicação e ensino
const communicationIcons: PositionIconOption[] = [
  { name: "BookOpen", label: "Bíblia Aberta", category: "communication" },
  { name: "Book", label: "Livro", category: "communication" },
  { name: "BookMarked", label: "Livro Marcado", category: "communication" },
  { name: "Bookmark", label: "Marcador", category: "communication" },
  { name: "ScrollText", label: "Pergaminho", category: "communication" },
  { name: "FileText", label: "Documento", category: "communication" },
  { name: "Newspaper", label: "Jornal", category: "communication" },
  { name: "NotebookPen", label: "Caderno", category: "communication" },
  { name: "Pen", label: "Caneta", category: "communication" },
  { name: "Pencil", label: "Lápis", category: "communication" },
  { name: "MessageSquare", label: "Mensagem", category: "communication" },
  { name: "MessageCircle", label: "Chat", category: "communication" },
  { name: "Mail", label: "E-mail", category: "communication" },
  { name: "Send", label: "Enviar", category: "communication" },
  { name: "Share2", label: "Compartilhar", category: "communication" },
  { name: "Globe", label: "Mundo", category: "communication" },
  { name: "Wifi", label: "Wi-Fi", category: "communication" },
  { name: "Megaphone", label: "Megafone", category: "communication" },
  { name: "Bell", label: "Sino", category: "communication" },
  { name: "BellRing", label: "Sino Tocando", category: "communication" },
]

// Administração
const adminIcons: PositionIconOption[] = [
  { name: "Briefcase", label: "Pasta", category: "admin" },
  { name: "Clipboard", label: "Prancheta", category: "admin" },
  { name: "ClipboardList", label: "Lista", category: "admin" },
  { name: "ClipboardCheck", label: "Checklist", category: "admin" },
  { name: "Calendar", label: "Calendário", category: "admin" },
  { name: "CalendarDays", label: "Agenda", category: "admin" },
  { name: "Clock", label: "Relógio", category: "admin" },
  { name: "Timer", label: "Cronômetro", category: "admin" },
  { name: "Calculator", label: "Calculadora", category: "admin" },
  { name: "Wallet", label: "Carteira", category: "admin" },
  { name: "CreditCard", label: "Cartão", category: "admin" },
  { name: "Banknote", label: "Dinheiro", category: "admin" },
  { name: "Receipt", label: "Recibo", category: "admin" },
  { name: "BarChart", label: "Gráfico", category: "admin" },
  { name: "PieChart", label: "Gráfico Pizza", category: "admin" },
  { name: "TrendingUp", label: "Crescimento", category: "admin" },
  { name: "Target", label: "Alvo", category: "admin" },
  { name: "Award", label: "Prêmio", category: "admin" },
  { name: "Trophy", label: "Troféu", category: "admin" },
  { name: "Medal", label: "Medalha", category: "admin" },
]

// Pessoas e grupos
const peopleIcons: PositionIconOption[] = [
  { name: "User", label: "Usuário", category: "people" },
  { name: "UserCircle", label: "Perfil", category: "people" },
  { name: "UserCheck", label: "Usuário OK", category: "people" },
  { name: "Users", label: "Grupo", category: "people" },
  { name: "UsersRound", label: "Equipe", category: "people" },
  { name: "UserPlus", label: "Adicionar Pessoa", category: "people" },
  { name: "Baby", label: "Bebê", category: "people" },
  { name: "PersonStanding", label: "Pessoa", category: "people" },
  { name: "Accessibility", label: "Acessibilidade", category: "people" },
  { name: "Hand", label: "Mão", category: "people" },
  { name: "HandMetal", label: "Rock", category: "people" },
  { name: "Handshake", label: "Cumprimento", category: "people" },
  { name: "ThumbsUp", label: "Positivo", category: "people" },
  { name: "Smile", label: "Sorriso", category: "people" },
  { name: "SmilePlus", label: "Feliz", category: "people" },
  { name: "PartyPopper", label: "Festa", category: "people" },
  { name: "Gift", label: "Presente", category: "people" },
  { name: "Cake", label: "Aniversário", category: "people" },
]

// Objetos gerais
const objectIcons: PositionIconOption[] = [
  { name: "Lightbulb", label: "Lâmpada", category: "objects" },
  { name: "Lamp", label: "Abajur", category: "objects" },
  { name: "LampDesk", label: "Luminária", category: "objects" },
  { name: "Flashlight", label: "Lanterna", category: "objects" },
  { name: "Wrench", label: "Chave Inglesa", category: "objects" },
  { name: "Hammer", label: "Martelo", category: "objects" },
  { name: "Screwdriver", label: "Chave Fenda", category: "objects" },
  { name: "Settings", label: "Configurações", category: "objects" },
  { name: "Settings2", label: "Ajustes", category: "objects" },
  { name: "Cog", label: "Engrenagem", category: "objects" },
  { name: "Palette", label: "Paleta", category: "objects" },
  { name: "Paintbrush", label: "Pincel", category: "objects" },
  { name: "Paintbrush2", label: "Pincel 2", category: "objects" },
  { name: "Scissors", label: "Tesoura", category: "objects" },
  { name: "Ruler", label: "Régua", category: "objects" },
  { name: "Compass", label: "Compasso", category: "objects" },
  { name: "Printer", label: "Impressora", category: "objects" },
  { name: "ScanLine", label: "Scanner", category: "objects" },
  { name: "QrCode", label: "QR Code", category: "objects" },
  { name: "Barcode", label: "Código de Barras", category: "objects" },
]

// Símbolos e ações
const symbolIcons: PositionIconOption[] = [
  { name: "Check", label: "Check", category: "symbols" },
  { name: "CheckCircle", label: "Confirmado", category: "symbols" },
  { name: "CheckCircle2", label: "Verificado", category: "symbols" },
  { name: "CircleDot", label: "Ponto", category: "symbols" },
  { name: "Circle", label: "Círculo", category: "symbols" },
  { name: "Square", label: "Quadrado", category: "symbols" },
  { name: "Triangle", label: "Triângulo", category: "symbols" },
  { name: "Hexagon", label: "Hexágono", category: "symbols" },
  { name: "Octagon", label: "Octágono", category: "symbols" },
  { name: "ArrowRight", label: "Seta Direita", category: "symbols" },
  { name: "ArrowUp", label: "Seta Cima", category: "symbols" },
  { name: "MoveRight", label: "Mover", category: "symbols" },
  { name: "RefreshCw", label: "Atualizar", category: "symbols" },
  { name: "RotateCw", label: "Girar", category: "symbols" },
  { name: "Repeat", label: "Repetir", category: "symbols" },
  { name: "Shuffle", label: "Embaralhar", category: "symbols" },
  { name: "Play", label: "Play", category: "symbols" },
  { name: "Pause", label: "Pausar", category: "symbols" },
  { name: "FastForward", label: "Avançar", category: "symbols" },
  { name: "SkipForward", label: "Próximo", category: "symbols" },
]

// Exportar todos os ícones
export const positionIcons: PositionIconOption[] = [
  ...instrumentIcons,
  ...audioVideoIcons,
  ...worshipIcons,
  ...ministryIcons,
  ...communicationIcons,
  ...adminIcons,
  ...peopleIcons,
  ...objectIcons,
  ...symbolIcons,
]

// Categorias para filtro
export const iconCategories: { value: PositionIconCategory; label: string }[] = [
  { value: "instruments", label: "Instrumentos" },
  { value: "audio_video", label: "Áudio e Vídeo" },
  { value: "worship", label: "Louvor" },
  { value: "ministry", label: "Ministérios" },
  { value: "communication", label: "Comunicação" },
  { value: "admin", label: "Administração" },
  { value: "people", label: "Pessoas" },
  { value: "objects", label: "Objetos" },
  { value: "symbols", label: "Símbolos" },
]

// Ícone padrão
export const defaultPositionIcon = "Briefcase"

// Função para buscar ícone por nome
export function getIconByName(name: string): PositionIconOption | undefined {
  return positionIcons.find((icon) => icon.name === name)
}

// Função para buscar ícones por categoria
export function getIconsByCategory(category: PositionIconCategory): PositionIconOption[] {
  return positionIcons.filter((icon) => icon.category === category)
}
