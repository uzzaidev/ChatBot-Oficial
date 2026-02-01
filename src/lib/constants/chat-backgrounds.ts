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
    thumbnail: '/assets/chat-backgrounds/thumbs/whatsapp-default-thumb.png',
    category: 'default',
    description: 'Fundo padrão original do WhatsApp com padrão sutil'
  },
  {
    id: 'whatsapp-dark',
    name: 'Escuro Sólido',
    url: '/assets/chat-backgrounds/whatsapp-dark.png',
    thumbnail: '/assets/chat-backgrounds/thumbs/whatsapp-dark-thumb.png',
    category: 'solid',
    description: 'Fundo escuro sólido para modo noturno'
  },
  {
    id: 'whatsapp-light',
    name: 'Claro Sólido',
    url: '/assets/chat-backgrounds/whatsapp-light.png',
    thumbnail: '/assets/chat-backgrounds/thumbs/whatsapp-light-thumb.png',
    category: 'solid',
    description: 'Fundo claro bege estilo WhatsApp clássico'
  },
  {
    id: 'whatsapp-abstract-1',
    name: 'Abstrato Verde',
    url: '/assets/chat-backgrounds/whatsapp-abstract-1.png',
    thumbnail: '/assets/chat-backgrounds/thumbs/whatsapp-abstract-1-thumb.png',
    category: 'abstract',
    description: 'Gradiente verde menta com ondas abstratas'
  },
  {
    id: 'whatsapp-abstract-2',
    name: 'Abstrato Roxo',
    url: '/assets/chat-backgrounds/whatsapp-abstract-2.png',
    thumbnail: '/assets/chat-backgrounds/thumbs/whatsapp-abstract-2-thumb.png',
    category: 'abstract',
    description: 'Gradiente roxo e rosa com formas geométricas'
  },
  {
    id: 'whatsapp-nature-1',
    name: 'Natureza Folhas',
    url: '/assets/chat-backgrounds/whatsapp-nature-1.png',
    thumbnail: '/assets/chat-backgrounds/thumbs/whatsapp-nature-1-thumb.png',
    category: 'nature',
    description: 'Folhas verdes em fundo escuro com opacidade'
  },
  {
    id: 'whatsapp-nature-2',
    name: 'Natureza Flores',
    url: '/assets/chat-backgrounds/whatsapp-nature-2.png',
    thumbnail: '/assets/chat-backgrounds/thumbs/whatsapp-nature-2-thumb.png',
    category: 'nature',
    description: 'Flores suaves em fundo claro'
  },
  {
    id: 'whatsapp-geometric',
    name: 'Geométrico',
    url: '/assets/chat-backgrounds/whatsapp-geometric.png',
    thumbnail: '/assets/chat-backgrounds/thumbs/whatsapp-geometric-thumb.png',
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
