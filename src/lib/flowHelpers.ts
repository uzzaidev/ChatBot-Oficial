/**
 * Flow Helpers - Database helpers for flow node configuration
 * 
 * These functions help the chatflow check if nodes are enabled/disabled
 * based on configuration stored in the database.
 */

import { createClient } from '@supabase/supabase-js'
import { getNodeMetadata, FLOW_METADATA } from '@/flows/flowMetadata'

// Cache for node enabled states to avoid repeated DB queries
const nodeStateCache = new Map<string, { enabled: boolean; timestamp: number }>()
const CACHE_TTL_MS = 60000 // 1 minute cache

/**
 * Check if a node is enabled for a specific client
 * Uses caching to minimize database queries
 * 
 * @param clientId - Client ID
 * @param nodeId - Node ID from flowMetadata
 * @returns true if node is enabled, false if disabled
 */
export async function isNodeEnabled(clientId: string, nodeId: string): Promise<boolean> {
  // Get node metadata
  const metadata = getNodeMetadata(nodeId)
  
  // If node doesn't exist in metadata, return false (safety)
  if (!metadata) {
    return false
  }
  
  // If node is not configurable, always return true (always enabled)
  if (!metadata.configurable) {
    return true
  }
  
  // Check cache first
  const cacheKey = `${clientId}:${nodeId}`
  const cached = nodeStateCache.get(cacheKey)
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
    return cached.enabled
  }
  
  // Query database for node state
  try {
    // Create Supabase client with service role key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    
    const enabledConfigKey = `flow:node_enabled:${nodeId}`
    
    const { data, error } = await supabase
      .from('bot_configurations')
      .select('config_value')
      .eq('client_id', clientId)
      .eq('config_key', enabledConfigKey)
      .single()
    
    if (error) {
      // If no config found, use default from metadata
      if (error.code === 'PGRST116') {
        const enabled = metadata.enabled // Default from metadata
        nodeStateCache.set(cacheKey, { enabled, timestamp: Date.now() })
        return enabled
      }
      
      console.error(`[flowHelpers] Error checking node state for ${nodeId}:`, error)
      // On error, default to enabled for safety
      return true
    }
    
    const enabled = data?.config_value?.enabled !== false
    
    // Update cache
    nodeStateCache.set(cacheKey, { enabled, timestamp: Date.now() })
    
    return enabled
  } catch (error) {
    console.error(`[flowHelpers] Exception checking node state for ${nodeId}:`, error)
    // On exception, default to enabled for safety
    return true
  }
}

/**
 * Get all node states for a client (batch operation)
 * More efficient than checking one by one
 * 
 * @param clientId - Client ID
 * @returns Map of nodeId -> enabled state
 */
export async function getAllNodeStates(clientId: string): Promise<Map<string, boolean>> {
  const states = new Map<string, boolean>()
  
  try {
    // Create Supabase client with service role key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    
    // Fetch all node enabled states for this client
    const { data, error } = await supabase
      .from('bot_configurations')
      .select('config_key, config_value')
      .eq('client_id', clientId)
      .like('config_key', 'flow:node_enabled:%')
    
    if (error) {
      console.error('[flowHelpers] Error fetching all node states:', error)
      // Return defaults from metadata
      FLOW_METADATA.forEach(node => {
        states.set(node.id, node.enabled)
      })
      return states
    }
    
    // Parse results
    const dbStates = new Map<string, boolean>()
    data?.forEach(row => {
      const nodeId = row.config_key.replace('flow:node_enabled:', '')
      const enabled = row.config_value?.enabled !== false
      dbStates.set(nodeId, enabled)
    })
    
    // Merge with metadata defaults
    FLOW_METADATA.forEach(node => {
      if (dbStates.has(node.id)) {
        states.set(node.id, dbStates.get(node.id)!)
      } else {
        states.set(node.id, node.enabled) // Default from metadata
      }
    })
    
    // Update cache
    const timestamp = Date.now()
    states.forEach((enabled, nodeId) => {
      const cacheKey = `${clientId}:${nodeId}`
      nodeStateCache.set(cacheKey, { enabled, timestamp })
    })
    
    return states
  } catch (error) {
    console.error('[flowHelpers] Exception fetching all node states:', error)
    // Return defaults from metadata
    FLOW_METADATA.forEach(node => {
      states.set(node.id, node.enabled)
    })
    return states
  }
}

/**
 * Clear cache for a specific client or all clients
 * Call this after updating node configurations
 * 
 * @param clientId - Optional client ID to clear cache for
 */
export function clearNodeStateCache(clientId?: string): void {
  if (clientId) {
    // Clear cache for specific client
    const keysToDelete: string[] = []
    nodeStateCache.forEach((_, key) => {
      if (key.startsWith(`${clientId}:`)) {
        keysToDelete.push(key)
      }
    })
    keysToDelete.forEach(key => nodeStateCache.delete(key))
  } else {
    // Clear all cache
    nodeStateCache.clear()
  }
}

/**
 * Determine if a node should execute based on:
 * 1. Its own enabled state
 * 2. Whether all required dependencies are enabled
 * 
 * @param clientId - Client ID
 * @param nodeId - Node ID
 * @param nodeStates - Map of all node states (from getAllNodeStates)
 * @returns true if node should execute, false if should skip
 */
export function shouldExecuteNode(
  nodeId: string,
  nodeStates: Map<string, boolean>
): boolean {
  const metadata = getNodeMetadata(nodeId)
  
  if (!metadata) {
    return false
  }
  
  // Check if node itself is enabled
  const nodeEnabled = nodeStates.get(nodeId) ?? metadata.enabled
  if (!nodeEnabled && metadata.bypassable) {
    return false // Node is disabled and can be bypassed
  }
  
  // If node is not bypassable, it always executes
  if (!metadata.bypassable) {
    return true
  }
  
  // Check if all required dependencies are enabled
  // If any required dependency is disabled, check optional dependencies
  if (metadata.dependencies && metadata.dependencies.length > 0) {
    const allDepsEnabled = metadata.dependencies.every(depId => {
      const depMetadata = getNodeMetadata(depId)
      if (!depMetadata) return false
      
      const depEnabled = nodeStates.get(depId) ?? depMetadata.enabled
      return depEnabled || !depMetadata.bypassable // Dependency is enabled OR cannot be bypassed
    })
    
    if (!allDepsEnabled && metadata.optionalDependencies) {
      // Primary dependencies disabled, check if optional dependencies available
      const hasOptionalDep = metadata.optionalDependencies.some(optDepId => {
        const optMetadata = getNodeMetadata(optDepId)
        if (!optMetadata) return false
        
        const optEnabled = nodeStates.get(optDepId) ?? optMetadata.enabled
        return optEnabled || !optMetadata.bypassable
      })
      
      return hasOptionalDep && nodeEnabled
    }
    
    return allDepsEnabled && nodeEnabled
  }
  
  return nodeEnabled
}

/**
 * Get execution order respecting enabled states
 * Returns list of nodes that should execute
 * 
 * @param clientId - Client ID
 * @returns Array of node IDs in execution order
 */
export async function getExecutionPlan(clientId: string): Promise<string[]> {
  const nodeStates = await getAllNodeStates(clientId)
  const executionPlan: string[] = []
  
  FLOW_METADATA.forEach(node => {
    if (shouldExecuteNode(node.id, nodeStates)) {
      executionPlan.push(node.id)
    }
  })
  
  return executionPlan
}
