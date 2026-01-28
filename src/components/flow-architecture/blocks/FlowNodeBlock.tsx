'use client'

/**
 * Flow Node Block Component
 * 
 * Generic block component for flow architecture nodes.
 * Displays node information and visual styling based on category.
 * 
 * @created 2025-12-07
 */

import { memo } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'
import {
  Settings,
  Lock,
  Unlock,
  Filter,
  FileText,
  UserCheck,
  Image as ImageIcon,
  Type,
  Users,
  Database,
  MessageSquare,
  Clock,
  History,
  BookOpen,
  CheckCircle,
  Tag,
  Sparkles,
  AudioLines,
  Search,
  RotateCcw,
  Save,
  FileCode,
  Send,
  Zap
} from 'lucide-react'
import type { FlowArchitectureNodeData } from '@/stores/flowArchitectureStore'

// Icon mapping for different nodes
const getNodeIcon = (nodeId: string) => {
  const iconMap: Record<string, any> = {
    filter_status: Filter,
    parse_message: FileText,
    check_customer: UserCheck,
    process_media: ImageIcon,
    normalize_message: Type,
    check_human_handoff: Users,
    push_to_redis: Database,
    save_user_message: MessageSquare,
    batch_messages: Clock,
    fast_track_router: Zap, // 🚀 Fast Track Router icon
    get_chat_history: History,
    get_rag_context: BookOpen,
    check_continuity: CheckCircle,
    classify_intent: Tag,
    generate_response: Sparkles,
    handle_audio_tool: AudioLines,
    search_document: Search,
    detect_repetition: RotateCcw,
    save_ai_message: Save,
    format_response: FileCode,
    send_whatsapp: Send,
  }
  return iconMap[nodeId] || Settings
}

// Color scheme for categories
const getCategoryColors = (category: FlowArchitectureNodeData['category'], enabled: boolean) => {
  if (!enabled) {
    return {
      bg: 'bg-gray-50',
      border: 'border-gray-300',
      text: 'text-gray-600',
      icon: 'text-gray-400',
      badge: 'bg-gray-200 text-gray-600',
    }
  }

  const colorMap = {
    preprocessing: {
      bg: 'bg-blue-50',
      border: 'border-blue-300',
      text: 'text-blue-900',
      icon: 'text-blue-600',
      badge: 'bg-blue-100 text-blue-800',
    },
    analysis: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-300',
      text: 'text-yellow-900',
      icon: 'text-yellow-600',
      badge: 'bg-yellow-100 text-yellow-800',
    },
    auxiliary: {
      bg: 'bg-purple-50',
      border: 'border-purple-300',
      text: 'text-purple-900',
      icon: 'text-purple-600',
      badge: 'bg-purple-100 text-purple-800',
    },
    generation: {
      bg: 'bg-green-50',
      border: 'border-green-300',
      text: 'text-green-900',
      icon: 'text-green-600',
      badge: 'bg-green-100 text-green-800',
    },
    output: {
      bg: 'bg-red-50',
      border: 'border-red-300',
      text: 'text-red-900',
      icon: 'text-red-600',
      badge: 'bg-red-100 text-red-800',
    },
  }

  return colorMap[category]
}

const FlowNodeBlock = memo(({ id, data, selected }: NodeProps) => {
  const nodeData = data as unknown as FlowArchitectureNodeData
  const Icon = getNodeIcon(id)
  const colors = getCategoryColors(nodeData.category, nodeData.enabled)

  return (
    <div
      className={`
        px-4 py-3 rounded-lg border-2 shadow-md
        min-w-[220px] max-w-[280px]
        transition-all duration-200 relative
        ${colors.bg} ${colors.border}
        ${selected ? 'ring-2 ring-blue-400 shadow-lg' : ''}
        ${!nodeData.enabled ? 'opacity-60' : ''}
      `}
    >
      {/* Handles */}
      <Handle
        type="target"
        position={Position.Top}
        className={`w-4 h-4 !bg-blue-500 hover:w-5 hover:h-5 transition-all cursor-crosshair ${
          !nodeData.enabled ? '!bg-gray-400' : ''
        }`}
        style={{ top: -8 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className={`w-4 h-4 !bg-blue-500 hover:w-5 hover:h-5 transition-all cursor-crosshair ${
          !nodeData.enabled ? '!bg-gray-400' : ''
        }`}
        style={{ bottom: -8 }}
      />

      {/* Header */}
      <div className="flex items-start gap-2 mb-2">
        <Icon className={`w-5 h-5 ${colors.icon} flex-shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          <span className={`font-semibold text-sm ${colors.text} block`}>
            {nodeData.name}
          </span>
          <span className="text-xs text-gray-500 block truncate">
            {id}
          </span>
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1 mt-2">
        {/* Category Badge */}
        <span className={`text-xs px-2 py-0.5 rounded-full ${colors.badge}`}>
          {nodeData.category}
        </span>

        {/* Configurable Badge */}
        {nodeData.hasConfig && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 flex items-center gap-1">
            <Settings className="w-3 h-3" />
            Config
          </span>
        )}

        {/* Lock/Unlock Badge */}
        {nodeData.configurable ? (
          <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 flex items-center gap-1">
            <Unlock className="w-3 h-3" />
            Toggle
          </span>
        ) : (
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 flex items-center gap-1">
            <Lock className="w-3 h-3" />
            Always On
          </span>
        )}
      </div>

      {/* Description Preview */}
      <div className="mt-2 text-xs text-gray-600 line-clamp-2">
        {nodeData.description}
      </div>

      {/* Loading Indicator */}
      {nodeData.isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center rounded-lg">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      )}
    </div>
  )
})

FlowNodeBlock.displayName = 'FlowNodeBlock'

export default FlowNodeBlock
