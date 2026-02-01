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
}

export const DEFAULT_BACKGROUNDS: ChatBackground[] = [
  {
    id: 'whatsapp-default',
    name: 'Padrão WhatsApp',
    url: '/assets/chat-backgrounds/whatsapp-default.png',
    thumbnail: '/assets/chat-backgrounds/thumbs/whatsapp-default.png',
    category: 'default',
    description: 'Fundo padrão original do WhatsApp com padrão sutil'
  },
  {
    id: 'dark-solid',
    name: 'Escuro Sólido',
    url: '/assets/chat-backgrounds/dark-solid.png',
    thumbnail: '/assets/chat-backgrounds/thumbs/dark-solid.png',
    category: 'solid',
    description: 'Fundo escuro sólido para modo noturno'
  },
  {
    id: 'light-solid',
    name: 'Claro Sólido',
    url: '/assets/chat-backgrounds/light-solid.png',
    thumbnail: '/assets/chat-backgrounds/thumbs/light-solid.png',
    category: 'solid',
    description: 'Fundo claro bege estilo WhatsApp clássico'
  },
  {
    id: 'abstract-green',
    name: 'Abstrato Verde',
    url: '/assets/chat-backgrounds/abstract-green.png',
    thumbnail: '/assets/chat-backgrounds/thumbs/abstract-green.png',
    category: 'abstract',
    description: 'Gradiente verde menta com ondas abstratas'
  },
  {
    id: 'abstract-purple',
    name: 'Abstrato Roxo',
    url: '/assets/chat-backgrounds/abstract-purple.png',
    thumbnail: '/assets/chat-backgrounds/thumbs/abstract-purple.png',
    category: 'abstract',
    description: 'Gradiente roxo e rosa com formas geométricas'
  },
  {
    id: 'nature-leaves',
    name: 'Natureza Folhas',
    url: '/assets/chat-backgrounds/nature-leaves.png',
    thumbnail: '/assets/chat-backgrounds/thumbs/nature-leaves.png',
    category: 'nature',
    description: 'Folhas verdes em fundo escuro com opacidade'
  },
  {
    id: 'nature-flowers',
    name: 'Natureza Flores',
    url: '/assets/chat-backgrounds/nature-flowers.png',
    thumbnail: '/assets/chat-backgrounds/thumbs/nature-flowers.png',
    category: 'nature',
    description: 'Flores suaves em fundo claro'
  },
  {
    id: 'geometric',
    name: 'Geométrico',
    url: '/assets/chat-backgrounds/geometric.png',
    thumbnail: '/assets/chat-backgrounds/thumbs/geometric.png',
    category: 'geometric',
    description: 'Padrão geométrico sutil em tons neutros'
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
 * Tipo para configuração de tema
 */
export interface ChatTheme {
  incomingMessageColor: string
  outgoingMessageColor: string
  backgroundType: 'default' | 'preset' | 'custom'
  backgroundPreset?: string
  backgroundCustomUrl?: string
}

/**
 * Tema padrão
 */
export const DEFAULT_CHAT_THEME: ChatTheme = {
  incomingMessageColor: DEFAULT_MESSAGE_COLORS.incoming.dark,
  outgoingMessageColor: DEFAULT_MESSAGE_COLORS.outgoing.default,
  backgroundType: 'default',
  backgroundPreset: undefined,
  backgroundCustomUrl: undefined,
}
