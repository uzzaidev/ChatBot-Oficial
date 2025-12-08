/**
 * Flow Architecture Store - Zustand with Immer
 *
 * Manages state for the flow architecture visualization and editing:
 * - Nodes (from FLOW_METADATA)
 * - Edges (calculated from dependencies)
 * - Selected node
 * - Node configurations
 *
 * @created 2025-12-07
 */

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { FLOW_METADATA, type FlowNodeMetadata } from "@/flows/flowMetadata";
import { apiFetch } from "@/lib/api";
import type { Node, Edge } from "@xyflow/react";

// Constants
const NOTIFICATION_TIMEOUT_MS = 3000;
const STORAGE_KEY_NODE_POSITIONS = "flowArchitectureNodePositions";

// ReactFlow Node type for architecture visualization
export interface FlowArchitectureNodeData extends FlowNodeMetadata {
  // Additional runtime data
  isLoading?: boolean;
}

export interface FlowArchitectureNode extends Omit<Node, 'data'> {
  id: string;
  type: string; // Always 'flowNode' for this architecture
  position: { x: number; y: number };
  data: FlowArchitectureNodeData;
}

// ReactFlow Edge type for architecture connections
export interface FlowArchitectureEdgeData {
  isBypass?: boolean;
  isDisabled?: boolean;
}

export interface FlowArchitectureEdge extends Omit<Edge, 'data'> {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
  type?: string;
  animated?: boolean;
  style?: Record<string, any>;
  markerEnd?: any;
  data?: FlowArchitectureEdgeData;
}

// Node configuration structure
export interface NodeConfig {
  enabled: boolean;
  [key: string]: any; // Dynamic fields based on node type
}

interface FlowArchitectureState {
  // Flow structure
  nodes: FlowArchitectureNode[];
  edges: FlowArchitectureEdge[];

  // Node configurations (keyed by node ID)
  nodeConfigs: Record<string, NodeConfig>;

  // UI state
  selectedNodeId: string | null;
  loading: boolean;
  saving: boolean;
  notification: {
    type: "success" | "error";
    message: string;
  } | null;
  notificationTimeout: NodeJS.Timeout | null;

  // Actions
  loadNodesFromMetadata: () => void;
  loadNodeConfigurations: () => Promise<void>;
  toggleNodeEnabled: (nodeId: string, enabled: boolean) => Promise<void>;
  updateNodeConfig: (nodeId: string, config: Partial<NodeConfig>) => Promise<void>;
  setSelectedNode: (nodeId: string | null) => void;
  setNotification: (notification: { type: "success" | "error"; message: string } | null) => void;
  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
  recalculateEdges: () => void;
  reset: () => void;
}

/**
 * Calculate automatic layout positions for nodes
 * Uses a strict hierarchical top-to-bottom flow following execution order
 */
const calculateNodePositions = (
  metadata: FlowNodeMetadata[]
): Record<string, { x: number; y: number }> => {
  const positions: Record<string, { x: number; y: number }> = {};
  
  // Layout configuration - optimized for clarity
  const VERTICAL_SPACING = 200;
  const HORIZONTAL_SPACING = 400;
  const CENTER_X = 600; // Center column
  const START_Y = 100;

  // Build dependency graph to understand flow
  const dependencyMap = new Map<string, string[]>();
  metadata.forEach((node) => {
    dependencyMap.set(node.id, node.dependencies || []);
  });

  // Calculate depth (layer) for each node based on dependencies
  const nodeDepths = new Map<string, number>();
  const calculateDepth = (nodeId: string, visited = new Set<string>()): number => {
    if (nodeDepths.has(nodeId)) return nodeDepths.get(nodeId)!;
    if (visited.has(nodeId)) return 0; // Circular dependency guard
    
    visited.add(nodeId);
    const deps = dependencyMap.get(nodeId) || [];
    const maxDepth = deps.length > 0 
      ? Math.max(...deps.map(d => calculateDepth(d, new Set(visited))))
      : -1;
    
    const depth = maxDepth + 1;
    nodeDepths.set(nodeId, depth);
    return depth;
  };

  metadata.forEach(node => calculateDepth(node.id));

  // Group nodes by depth (layer)
  const layers = new Map<number, FlowNodeMetadata[]>();
  metadata.forEach((node) => {
    const depth = nodeDepths.get(node.id) || 0;
    if (!layers.has(depth)) layers.set(depth, []);
    layers.get(depth)!.push(node);
  });

  // Sort layers by depth
  const sortedLayers = Array.from(layers.entries()).sort((a, b) => a[0] - b[0]);

  // Position nodes layer by layer
  sortedLayers.forEach(([depth, nodesInLayer]) => {
    const layerY = START_Y + depth * VERTICAL_SPACING;
    const layerWidth = nodesInLayer.length;

    // For layers with multiple nodes, distribute horizontally
    if (layerWidth === 1) {
      // Single node - center it
      positions[nodesInLayer[0].id] = {
        x: CENTER_X,
        y: layerY,
      };
    } else if (layerWidth === 2) {
      // Two nodes - place side by side
      positions[nodesInLayer[0].id] = {
        x: CENTER_X - HORIZONTAL_SPACING / 2,
        y: layerY,
      };
      positions[nodesInLayer[1].id] = {
        x: CENTER_X + HORIZONTAL_SPACING / 2,
        y: layerY,
      };
    } else {
      // Multiple nodes - distribute evenly
      const totalWidth = (layerWidth - 1) * HORIZONTAL_SPACING;
      const startX = CENTER_X - totalWidth / 2;
      
      nodesInLayer.forEach((node, index) => {
        positions[node.id] = {
          x: startX + index * HORIZONTAL_SPACING,
          y: layerY,
        };
      });
    }
  });

  return positions;
};

/**
 * Transform FLOW_METADATA to ReactFlow nodes
 */
const transformMetadataToNodes = (
  metadata: FlowNodeMetadata[],
  savedPositions?: Record<string, { x: number; y: number }>
): FlowArchitectureNode[] => {
  const positions = savedPositions || calculateNodePositions(metadata);

  return metadata.map((node) => ({
    id: node.id,
    type: "flowNode",
    position: positions[node.id] || { x: 0, y: 0 },
    data: { ...node },
  }));
};

/**
 * Calculate edges from node dependencies
 */
const calculateEdges = (nodes: FlowArchitectureNode[]): FlowArchitectureEdge[] => {
  const edges: FlowArchitectureEdge[] = [];
  let edgeIndex = 0;

  nodes.forEach((node) => {
    const nodeData = node.data;

    // Primary dependencies
    if (nodeData.dependencies) {
      nodeData.dependencies.forEach((depId) => {
        const depNode = nodes.find((n) => n.id === depId);
        if (!depNode) return;

        // Check if we should use bypass route instead
        const shouldUseBypass =
          !depNode.data.enabled && nodeData.optionalDependencies;

        if (shouldUseBypass) {
          // Skip this edge, will draw bypass instead
          return;
        }

        const isDisabled = !node.data.enabled || !depNode.data.enabled;

        edges.push({
          id: `e-${depId}-${node.id}`,
          source: depId,
          target: node.id,
          type: "smoothstep",
          animated: !isDisabled,
          style: {
            stroke: isDisabled ? "#d1d5db" : "#3B82F6",
            strokeWidth: 2,
            strokeDasharray: isDisabled ? "5" : undefined,
          },
          markerEnd: {
            type: "arrowclosed",
            width: 20,
            height: 20,
            color: isDisabled ? "#d1d5db" : "#3B82F6",
          },
          data: { isDisabled },
        });
      });
    }

    // Bypass/optional dependencies (when primary is disabled)
    if (nodeData.optionalDependencies && nodeData.dependencies) {
      nodeData.dependencies.forEach((depId) => {
        const depNode = nodes.find((n) => n.id === depId);

        // If primary dependency is disabled, show bypass routes
        if (depNode && !depNode.data.enabled) {
          // CASCADE LOGIC: Find first active bypass
          let foundActiveBypass = false;

          for (const optDepId of nodeData.optionalDependencies || []) {
            const optDepNode = nodes.find((n) => n.id === optDepId);
            if (!optDepNode) continue;

            // If we haven't found an active bypass yet
            if (!foundActiveBypass) {
              const isActive = optDepNode.data.enabled;

              edges.push({
                id: `e-bypass-${optDepId}-${node.id}`,
                source: optDepId,
                target: node.id,
                type: "smoothstep",
                animated: isActive,
                style: {
                  stroke: isActive ? "#f97316" : "#d1d5db",
                  strokeWidth: isActive ? 3 : 2,
                  strokeDasharray: "3",
                },
                markerEnd: {
                  type: "arrowclosed",
                  width: 20,
                  height: 20,
                  color: isActive ? "#f97316" : "#d1d5db",
                },
                data: { isBypass: true, isDisabled: !isActive },
              });

              if (isActive) {
                foundActiveBypass = true;
              }
            }

            // If active bypass found, stop
            if (foundActiveBypass) break;
          }
        }
      });
    }
  });

  return edges;
};

const initialState = {
  nodes: [],
  edges: [],
  nodeConfigs: {},
  selectedNodeId: null,
  loading: false,
  saving: false,
  notification: null,
  notificationTimeout: null,
};

export const useFlowArchitectureStore = create<FlowArchitectureState>()(
  immer((set, get) => ({
    ...initialState,

    loadNodesFromMetadata: () => {
      // Try to load saved positions from localStorage
      let savedPositions: Record<string, { x: number; y: number }> | undefined;
      try {
        const saved = localStorage.getItem(STORAGE_KEY_NODE_POSITIONS);
        if (saved) {
          savedPositions = JSON.parse(saved);
        }
      } catch (error) {
        console.error("Failed to load saved positions:", error);
      }

      const nodes = transformMetadataToNodes(FLOW_METADATA, savedPositions);
      const edges = calculateEdges(nodes);

      set((state) => {
        state.nodes = nodes;
        state.edges = edges;
      });
    },

    loadNodeConfigurations: async () => {
      set({ loading: true });

      try {
        const nodes = get().nodes;
        const configs: Record<string, NodeConfig> = {};

        // Fetch configurations for all nodes in parallel
        const promises = nodes.map(async (node) => {
          try {
            const response = await apiFetch(`/api/flow/nodes/${node.id}`);
            if (response.ok) {
              const data = await response.json();
              // NOTE: Backend may return string "true"/"false" due to database storage
              // This ensures we always get a boolean value
              const enabledValue = data.config?.enabled;
              const computedEnabled = enabledValue === true || enabledValue === "true";
              
              configs[node.id] = {
                ...data.config,
                enabled: computedEnabled,
              };

              // Update node's enabled state
              return { nodeId: node.id, enabled: computedEnabled, config: data.config };
            }
          } catch (error) {
            console.error(`Failed to fetch config for node ${node.id}:`, error);
          }
          return { nodeId: node.id, enabled: node.data.enabled, config: null };
        });

        const results = await Promise.all(promises);

        set((state) => {
          // Update configs
          results.forEach((result) => {
            if (result.config) {
              state.nodeConfigs[result.nodeId] = result.config;
            }
          });

          // Update node enabled states
          state.nodes = state.nodes.map((node) => {
            const result = results.find((r) => r.nodeId === node.id);
            if (result) {
              return {
                ...node,
                data: {
                  ...node.data,
                  enabled: result.enabled,
                },
              };
            }
            return node;
          });

          // Recalculate edges with updated enabled states
          state.edges = calculateEdges(state.nodes);
        });
      } catch (error) {
        console.error("Failed to load node configurations:", error);
        set({
          notification: {
            type: "error",
            message: "Erro ao carregar configurações dos nodes",
          },
        });
      } finally {
        set({ loading: false });
      }
    },

    toggleNodeEnabled: async (nodeId: string, enabled: boolean) => {
      set({ saving: true });

      try {
        const response = await apiFetch(`/api/flow/nodes/${nodeId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled }),
        });

        if (!response.ok) {
          throw new Error("Failed to update node");
        }

        set((state) => {
          // Clear any existing timeout
          if (state.notificationTimeout) {
            clearTimeout(state.notificationTimeout);
          }

          // Update node enabled state
          const nodeIndex = state.nodes.findIndex((n) => n.id === nodeId);
          if (nodeIndex !== -1) {
            state.nodes[nodeIndex].data.enabled = enabled;
          }

          // Update config
          if (state.nodeConfigs[nodeId]) {
            state.nodeConfigs[nodeId].enabled = enabled;
          } else {
            state.nodeConfigs[nodeId] = { enabled };
          }

          // Recalculate edges
          state.edges = calculateEdges(state.nodes);

          state.notification = {
            type: "success",
            message: `Node ${enabled ? "ativado" : "desativado"} com sucesso!`,
          };

          // Set new timeout
          state.notificationTimeout = setTimeout(() => {
            set({ notification: null, notificationTimeout: null });
          }, NOTIFICATION_TIMEOUT_MS) as any;
        });
      } catch (error) {
        console.error("Failed to toggle node:", error);
        set((state) => {
          // Clear any existing timeout
          if (state.notificationTimeout) {
            clearTimeout(state.notificationTimeout);
          }

          state.notification = {
            type: "error",
            message: "Erro ao atualizar node",
          };

          // Set new timeout
          state.notificationTimeout = setTimeout(() => {
            set({ notification: null, notificationTimeout: null });
          }, NOTIFICATION_TIMEOUT_MS) as any;
        });
      } finally {
        set({ saving: false });
      }
    },

    updateNodeConfig: async (nodeId: string, configUpdate: Partial<NodeConfig>) => {
      set({ saving: true });

      try {
        const currentConfig = get().nodeConfigs[nodeId] || { enabled: true };
        const updatedConfig = { ...currentConfig, ...configUpdate };

        const response = await apiFetch(`/api/flow/nodes/${nodeId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ config: updatedConfig }),
        });

        if (!response.ok) {
          throw new Error("Failed to save config");
        }

        set((state) => {
          // Clear any existing timeout
          if (state.notificationTimeout) {
            clearTimeout(state.notificationTimeout);
          }

          state.nodeConfigs[nodeId] = updatedConfig;
          state.notification = {
            type: "success",
            message: "Configuração salva com sucesso!",
          };

          // Set new timeout
          state.notificationTimeout = setTimeout(() => {
            set({ notification: null, notificationTimeout: null });
          }, NOTIFICATION_TIMEOUT_MS) as any;
        });
      } catch (error) {
        console.error("Failed to update node config:", error);
        set((state) => {
          // Clear any existing timeout
          if (state.notificationTimeout) {
            clearTimeout(state.notificationTimeout);
          }

          state.notification = {
            type: "error",
            message: "Erro ao salvar configuração",
          };

          // Set new timeout
          state.notificationTimeout = setTimeout(() => {
            set({ notification: null, notificationTimeout: null });
          }, NOTIFICATION_TIMEOUT_MS) as any;
        });
      } finally {
        set({ saving: false });
      }
    },

    setSelectedNode: (nodeId: string | null) => {
      set({ selectedNodeId: nodeId });
    },

    setNotification: (notification) => {
      set({ notification });
    },

    updateNodePosition: (nodeId: string, position: { x: number; y: number }) => {
      set((state) => {
        const nodeIndex = state.nodes.findIndex((n) => n.id === nodeId);
        if (nodeIndex !== -1) {
          state.nodes[nodeIndex].position = position;
        }
      });

      // Save positions to localStorage
      try {
        const positions = get().nodes.reduce((acc, node) => {
          acc[node.id] = node.position;
          return acc;
        }, {} as Record<string, { x: number; y: number }>);

        localStorage.setItem(
          STORAGE_KEY_NODE_POSITIONS,
          JSON.stringify(positions)
        );
      } catch (error) {
        console.error("Failed to save positions:", error);
      }
    },

    recalculateEdges: () => {
      set((state) => {
        state.edges = calculateEdges(state.nodes);
      });
    },

    reset: () => {
      const state = get();
      // Clear any pending timeout
      if (state.notificationTimeout) {
        clearTimeout(state.notificationTimeout);
      }
      set(initialState);
    },
  }))
);
