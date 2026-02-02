/**
 * Fundos Padrão do WhatsApp
 *
 * Lista de imagens de fundo pré-definidas para personalização da área de conversas.
 *
 * IMPORTANTE: As imagens devem estar em /public/assets/chat-backgrounds/
 */

export interface ChatBackground {
  id: string
  name: string
  url: string
  thumbnail: string
  category: 'default' | 'solid' | 'abstract' | 'nature' | 'geometric'
  description?: string
  /** Suggested colors for this background - auto-applied when selecting */
  suggestedColors?: {
    incomingBg: string
    incomingText: string
    outgoingBg: string
    outgoingText: string
  }
}

export const DEFAULT_BACKGROUNDS: ChatBackground[] = [
  {
    id: 'whatsapp-default',
    name: 'Padrão WhatsApp',
    url: '/assets/chat-backgrounds/whatsapp-default.png',
    thumbnail: '/assets/chat-backgrounds/thumbs/whatsapp-default.png',
    category: 'default',
    description: 'Fundo padrão original do WhatsApp com padrão sutil',
    suggestedColors: {
      incomingBg: '#202c33',
      incomingText: '#FFFFFF',
      outgoingBg: '#005c4b',
      outgoingText: '#FFFFFF',
    }
  },
  {
    id: 'dark-solid',
    name: 'Escuro Sólido',
    url: '/assets/chat-backgrounds/dark-solid.png',
    thumbnail: '/assets/chat-backgrounds/thumbs/dark-solid.png',
    category: 'solid',
    description: 'Fundo escuro sólido para modo noturno',
    suggestedColors: {
      incomingBg: '#2a2f32',
      incomingText: '#FFFFFF',
      outgoingBg: '#005c4b',
      outgoingText: '#FFFFFF',
    }
  },
  {
    id: 'light-solid',
    name: 'Claro Sólido',
    url: '/assets/chat-backgrounds/light-solid.png',
    thumbnail: '/assets/chat-backgrounds/thumbs/light-solid.png',
    category: 'solid',
    description: 'Fundo claro bege estilo WhatsApp clássico',
    suggestedColors: {
      incomingBg: '#FFFFFF',
      incomingText: '#1f2937',
      outgoingBg: '#d9fdd3',
      outgoingText: '#1f2937',
    }
  },
  {
    id: 'abstract-green',
    name: 'Abstrato Verde',
    url: '/assets/chat-backgrounds/abstract-green.png',
    thumbnail: '/assets/chat-backgrounds/thumbs/abstract-green.png',
    category: 'abstract',
    description: 'Gradiente verde menta com ondas abstratas',
    suggestedColors: {
      incomingBg: '#1a3a32',
      incomingText: '#FFFFFF',
      outgoingBg: '#0d5c4b',
      outgoingText: '#FFFFFF',
    }
  },
  {
    id: 'abstract-purple',
    name: 'Abstrato Roxo',
    url: '/assets/chat-backgrounds/abstract-purple.png',
    thumbnail: '/assets/chat-backgrounds/thumbs/abstract-purple.png',
    category: 'abstract',
    description: 'Gradiente roxo e rosa com formas geométricas',
    suggestedColors: {
      incomingBg: '#2d2440',
      incomingText: '#FFFFFF',
      outgoingBg: '#5b3a7a',
      outgoingText: '#FFFFFF',
    }
  },
  {
    id: 'nature-leaves',
    name: 'Natureza Folhas',
    url: '/assets/chat-backgrounds/nature-leaves.png',
    thumbnail: '/assets/chat-backgrounds/thumbs/nature-leaves.png',
    category: 'nature',
    description: 'Folhas verdes em fundo escuro com opacidade',
    suggestedColors: {
      incomingBg: '#1e3a2f',
      incomingText: '#FFFFFF',
      outgoingBg: '#0d5c4b',
      outgoingText: '#FFFFFF',
    }
  },
  {
    id: 'nature-flowers',
    name: 'Natureza Flores',
    url: '/assets/chat-backgrounds/nature-flowers.png',
    thumbnail: '/assets/chat-backgrounds/thumbs/nature-flowers.png',
    category: 'nature',
    description: 'Flores suaves em fundo claro',
    suggestedColors: {
      incomingBg: '#FFFFFF',
      incomingText: '#1f2937',
      outgoingBg: '#dcf8c6',
      outgoingText: '#1f2937',
    }
  },
  {
    id: 'geometric',
    name: 'Geométrico',
    url: '/assets/chat-backgrounds/geometric.png',
    thumbnail: '/assets/chat-backgrounds/thumbs/geometric.png',
    category: 'geometric',
    description: 'Padrão geométrico sutil em tons neutros',
    suggestedColors: {
      incomingBg: '#e8e8e8',
      incomingText: '#1f2937',
      outgoingBg: '#128c7e',
      outgoingText: '#FFFFFF',
    }
  }
]

/**
 * Buscar background por ID
 */
export function getBackgroundById(id: string): ChatBackground | undefined {
  return DEFAULT_BACKGROUNDS.find(bg => bg.id === id)
}

/**
 * Filtrar backgrounds por categoria
 */
export function getBackgroundsByCategory(category: ChatBackground['category']): ChatBackground[] {
  return DEFAULT_BACKGROUNDS.filter(bg => bg.category === category)
}

/**
 * Cores padrão para mensagens
 */
export const DEFAULT_MESSAGE_COLORS = {
  incoming: {
    dark: '#2d3338',  // Cinza escuro (modo escuro)
    light: '#ffffff', // Branco (modo claro)
  },
  outgoing: {
    default: '#005c4b', // Verde WhatsApp oficial
  }
} as const

/**
 * Tema de Personalização das Conversas
 *
 * Define cores e background da área de chat
 */
export interface ChatTheme {
  // Cores de fundo das mensagens
  incomingMessageColor: string // Cor de fundo das mensagens recebidas (#RRGGBB)
  outgoingMessageColor: string // Cor de fundo das mensagens enviadas (#RRGGBB)
  
  // Cores do texto das mensagens
  incomingTextColor: string // Cor do texto das mensagens recebidas (#RRGGBB)
  outgoingTextColor: string // Cor do texto das mensagens enviadas (#RRGGBB)

  // Background da área de conversas
  backgroundType: 'default' | 'preset' | 'custom'
  backgroundPreset?: string // ID do preset (ex: 'whatsapp-default')
  backgroundCustomUrl?: string // URL da imagem customizada
}

/**
 * Tema Padrão do WhatsApp
 *
 * Cores e background padrão ao iniciar a aplicação
 */
export const DEFAULT_CHAT_THEME: ChatTheme = {
  // Cores de fundo (padrão WhatsApp)
  incomingMessageColor: '#2d3338', // Cinza escuro (mensagens recebidas)
  outgoingMessageColor: '#005c4b', // Verde WhatsApp (mensagens enviadas)
  
  // Cores do texto (branco para contraste)
  incomingTextColor: '#FFFFFF', // Texto branco nas mensagens recebidas
  outgoingTextColor: '#FFFFFF', // Texto branco nas mensagens enviadas

  // Background padrão
  backgroundType: 'default',
  backgroundPreset: 'whatsapp-default',
}

/**
 * Categorias de Fundos
 *
 * Usado para agrupar fundos por tipo na interface
 */
export const BACKGROUND_CATEGORIES = [
  { id: 'default', name: 'Padrão' },
  { id: 'solid', name: 'Sólidos' },
  { id: 'abstract', name: 'Abstratos' },
  { id: 'nature', name: 'Natureza' },
  { id: 'geometric', name: 'Geométricos' },
] as const
