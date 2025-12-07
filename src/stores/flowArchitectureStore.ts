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

// ReactFlow Node type for architecture visualization
export interface FlowArchitectureNode {
  id: string;
  type: string; // Always 'flowNode' for this architecture
  position: { x: number; y: number };
  data: FlowNodeMetadata & {
    // Additional runtime data
    isLoading?: boolean;
  };
}

// ReactFlow Edge type for architecture connections
export interface FlowArchitectureEdge {
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
  // Custom data for bypass routes
  data?: {
    isBypass?: boolean;
    isDisabled?: boolean;
  };
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
 * Uses a simple hierarchical layout
 */
const calculateNodePositions = (
  metadata: FlowNodeMetadata[]
): Record<string, { x: number; y: number }> => {
  const positions: Record<string, { x: number; y: number }> = {};
  
  // Layout configuration
  const VERTICAL_SPACING = 150;
  const HORIZONTAL_SPACING = 300;
  const START_X = 100;
  const START_Y = 100;

  // Group nodes by category for better layout
  const categoryGroups: Record<string, FlowNodeMetadata[]> = {
    preprocessing: [],
    analysis: [],
    auxiliary: [],
    generation: [],
    output: [],
  };

  metadata.forEach((node) => {
    categoryGroups[node.category].push(node);
  });

  let currentY = START_Y;
  let currentColumn = 0;

  // Layout preprocessing nodes (vertical column)
  categoryGroups.preprocessing.forEach((node, index) => {
    positions[node.id] = {
      x: START_X,
      y: currentY + index * VERTICAL_SPACING,
    };
  });

  currentY = START_Y + categoryGroups.preprocessing.length * VERTICAL_SPACING;
  currentColumn = 1;

  // Layout analysis and auxiliary nodes (side by side)
  const maxAnalysisAux = Math.max(
    categoryGroups.analysis.length + categoryGroups.auxiliary.length
  );
  
  let auxIndex = 0;
  categoryGroups.analysis.forEach((node, index) => {
    positions[node.id] = {
      x: START_X + currentColumn * HORIZONTAL_SPACING,
      y: START_Y + index * VERTICAL_SPACING,
    };
  });

  categoryGroups.auxiliary.forEach((node, index) => {
    positions[node.id] = {
      x: START_X + (currentColumn + 1) * HORIZONTAL_SPACING,
      y: START_Y + index * VERTICAL_SPACING,
    };
    auxIndex = index;
  });

  currentY = START_Y + Math.max(auxIndex + 1, categoryGroups.analysis.length) * VERTICAL_SPACING;
  currentColumn = 1;

  // Layout generation node (centered below analysis)
  categoryGroups.generation.forEach((node, index) => {
    positions[node.id] = {
      x: START_X + currentColumn * HORIZONTAL_SPACING,
      y: currentY + index * VERTICAL_SPACING,
    };
  });

  currentY = currentY + categoryGroups.generation.length * VERTICAL_SPACING;

  // Layout output nodes (vertical column)
  categoryGroups.output.forEach((node, index) => {
    positions[node.id] = {
      x: START_X + currentColumn * HORIZONTAL_SPACING,
      y: currentY + index * VERTICAL_SPACING,
    };
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
};

export const useFlowArchitectureStore = create<FlowArchitectureState>()(
  immer((set, get) => ({
    ...initialState,

    loadNodesFromMetadata: () => {
      // Try to load saved positions from localStorage
      let savedPositions: Record<string, { x: number; y: number }> | undefined;
      try {
        const saved = localStorage.getItem("flowArchitectureNodePositions");
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
              // Match backend logic: explicitly check for true values
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
        });

        // Clear notification after 3 seconds
        setTimeout(() => {
          set({ notification: null });
        }, 3000);
      } catch (error) {
        console.error("Failed to toggle node:", error);
        set({
          notification: {
            type: "error",
            message: "Erro ao atualizar node",
          },
        });

        setTimeout(() => {
          set({ notification: null });
        }, 3000);
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
          state.nodeConfigs[nodeId] = updatedConfig;
          state.notification = {
            type: "success",
            message: "Configuração salva com sucesso!",
          };
        });

        setTimeout(() => {
          set({ notification: null });
        }, 3000);
      } catch (error) {
        console.error("Failed to update node config:", error);
        set({
          notification: {
            type: "error",
            message: "Erro ao salvar configuração",
          },
        });

        setTimeout(() => {
          set({ notification: null });
        }, 3000);
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
          "flowArchitectureNodePositions",
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
      set(initialState);
    },
  }))
);
