/**
 * Fundos Padrão do WhatsApp
 *
 * Lista de imagens de fundo pré-definidas para personalização da área de conversas.
 *
 * IMPORTANTE: As imagens devem estar em /public/assets/chat-backgrounds/
 */

/**
 * Cores de um modo (dark ou light)
 */
export interface ChatThemeModeColors {
  incomingMessageColor: string
  outgoingMessageColor: string
  incomingTextColor: string
  outgoingTextColor: string
}

/**
 * Tema de Personalização das Conversas
 *
 * Define cores separadas para dark e light mode + background da área de chat
 */
export interface ChatTheme {
  dark: ChatThemeModeColors
  light: ChatThemeModeColors

  // Background da área de conversas (compartilhado entre modos)
  backgroundType: 'default' | 'preset' | 'custom'
  backgroundPreset?: string
  backgroundCustomUrl?: string
}

/**
 * Suggested colors for a background preset (dual-mode)
 */
export interface BackgroundSuggestedColors {
  dark: {
    incomingBg: string
    incomingText: string
    outgoingBg: string
    outgoingText: string
  }
  light: {
    incomingBg: string
    incomingText: string
    outgoingBg: string
    outgoingText: string
  }
}

export interface ChatBackground {
  id: string
  name: string
  url: string
  thumbnail: string
  category: 'default' | 'solid' | 'abstract' | 'nature' | 'geometric'
  description?: string
  suggestedColors?: BackgroundSuggestedColors
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
      dark: {
        incomingBg: '#202c33',
        incomingText: '#FFFFFF',
        outgoingBg: '#005c4b',
        outgoingText: '#FFFFFF',
      },
      light: {
        incomingBg: '#FFFFFF',
        incomingText: '#1f2937',
        outgoingBg: '#d9fdd3',
        outgoingText: '#1f2937',
      },
    },
  },
  {
    id: 'dark-solid',
    name: 'Escuro Sólido',
    url: '/assets/chat-backgrounds/dark-solid.png',
    thumbnail: '/assets/chat-backgrounds/thumbs/dark-solid.png',
    category: 'solid',
    description: 'Fundo escuro sólido para modo noturno',
    suggestedColors: {
      dark: {
        incomingBg: '#2a2f32',
        incomingText: '#FFFFFF',
        outgoingBg: '#005c4b',
        outgoingText: '#FFFFFF',
      },
      light: {
        incomingBg: '#f0f0f0',
        incomingText: '#1f2937',
        outgoingBg: '#d9fdd3',
        outgoingText: '#1f2937',
      },
    },
  },
  {
    id: 'light-solid',
    name: 'Claro Sólido',
    url: '/assets/chat-backgrounds/light-solid.png',
    thumbnail: '/assets/chat-backgrounds/thumbs/light-solid.png',
    category: 'solid',
    description: 'Fundo claro bege estilo WhatsApp clássico',
    suggestedColors: {
      dark: {
        incomingBg: '#2d3338',
        incomingText: '#FFFFFF',
        outgoingBg: '#005c4b',
        outgoingText: '#FFFFFF',
      },
      light: {
        incomingBg: '#FFFFFF',
        incomingText: '#1f2937',
        outgoingBg: '#d9fdd3',
        outgoingText: '#1f2937',
      },
    },
  },
  {
    id: 'abstract-green',
    name: 'Abstrato Verde',
    url: '/assets/chat-backgrounds/abstract-green.png',
    thumbnail: '/assets/chat-backgrounds/thumbs/abstract-green.png',
    category: 'abstract',
    description: 'Gradiente verde menta com ondas abstratas',
    suggestedColors: {
      dark: {
        incomingBg: '#1a3a32',
        incomingText: '#FFFFFF',
        outgoingBg: '#0d5c4b',
        outgoingText: '#FFFFFF',
      },
      light: {
        incomingBg: '#e8f5e9',
        incomingText: '#1f2937',
        outgoingBg: '#a5d6a7',
        outgoingText: '#1f2937',
      },
    },
  },
  {
    id: 'abstract-purple',
    name: 'Abstrato Roxo',
    url: '/assets/chat-backgrounds/abstract-purple.png',
    thumbnail: '/assets/chat-backgrounds/thumbs/abstract-purple.png',
    category: 'abstract',
    description: 'Gradiente roxo e rosa com formas geométricas',
    suggestedColors: {
      dark: {
        incomingBg: '#2d2440',
        incomingText: '#FFFFFF',
        outgoingBg: '#5b3a7a',
        outgoingText: '#FFFFFF',
      },
      light: {
        incomingBg: '#f3e5f5',
        incomingText: '#1f2937',
        outgoingBg: '#ce93d8',
        outgoingText: '#1f2937',
      },
    },
  },
  {
    id: 'nature-leaves',
    name: 'Natureza Folhas',
    url: '/assets/chat-backgrounds/nature-leaves.png',
    thumbnail: '/assets/chat-backgrounds/thumbs/nature-leaves.png',
    category: 'nature',
    description: 'Folhas verdes em fundo escuro com opacidade',
    suggestedColors: {
      dark: {
        incomingBg: '#1e3a2f',
        incomingText: '#FFFFFF',
        outgoingBg: '#0d5c4b',
        outgoingText: '#FFFFFF',
      },
      light: {
        incomingBg: '#e8f5e9',
        incomingText: '#1f2937',
        outgoingBg: '#81c784',
        outgoingText: '#1f2937',
      },
    },
  },
  {
    id: 'nature-flowers',
    name: 'Natureza Flores',
    url: '/assets/chat-backgrounds/nature-flowers.png',
    thumbnail: '/assets/chat-backgrounds/thumbs/nature-flowers.png',
    category: 'nature',
    description: 'Flores suaves em fundo claro',
    suggestedColors: {
      dark: {
        incomingBg: '#2d3338',
        incomingText: '#FFFFFF',
        outgoingBg: '#005c4b',
        outgoingText: '#FFFFFF',
      },
      light: {
        incomingBg: '#FFFFFF',
        incomingText: '#1f2937',
        outgoingBg: '#dcf8c6',
        outgoingText: '#1f2937',
      },
    },
  },
  {
    id: 'geometric',
    name: 'Geométrico',
    url: '/assets/chat-backgrounds/geometric.png',
    thumbnail: '/assets/chat-backgrounds/thumbs/geometric.png',
    category: 'geometric',
    description: 'Padrão geométrico sutil em tons neutros',
    suggestedColors: {
      dark: {
        incomingBg: '#2d3338',
        incomingText: '#FFFFFF',
        outgoingBg: '#128c7e',
        outgoingText: '#FFFFFF',
      },
      light: {
        incomingBg: '#e8e8e8',
        incomingText: '#1f2937',
        outgoingBg: '#128c7e',
        outgoingText: '#FFFFFF',
      },
    },
  },
]

/**
 * Buscar background por ID
 */
export const getBackgroundById = (id: string): ChatBackground | undefined =>
  DEFAULT_BACKGROUNDS.find(bg => bg.id === id)

/**
 * Filtrar backgrounds por categoria
 */
export const getBackgroundsByCategory = (category: ChatBackground['category']): ChatBackground[] =>
  DEFAULT_BACKGROUNDS.filter(bg => bg.category === category)

/**
 * Cores padrão para mensagens
 */
export const DEFAULT_MESSAGE_COLORS = {
  incoming: {
    dark: '#2d3338',
    light: '#ffffff',
  },
  outgoing: {
    default: '#005c4b',
  },
} as const

/**
 * Tema Padrão do WhatsApp (dual-mode)
 */
export const DEFAULT_CHAT_THEME: ChatTheme = {
  dark: {
    incomingMessageColor: '#202c33',
    outgoingMessageColor: '#005c4b',
    incomingTextColor: '#FFFFFF',
    outgoingTextColor: '#FFFFFF',
  },
  light: {
    incomingMessageColor: '#ffffff',
    outgoingMessageColor: '#128c7e',
    incomingTextColor: '#1f2937',
    outgoingTextColor: '#FFFFFF',
  },
  backgroundType: 'default',
}

/**
 * Categorias de Fundos
 */
export const BACKGROUND_CATEGORIES = [
  { id: 'default', name: 'Padrão' },
  { id: 'solid', name: 'Sólidos' },
  { id: 'abstract', name: 'Abstratos' },
  { id: 'nature', name: 'Natureza' },
  { id: 'geometric', name: 'Geométricos' },
] as const
