'use client'

import FlowArchitectureManager from '@/components/FlowArchitectureManager'

/**
 * Flow Architecture Page
 * 
 * Visual interface for managing the multi-agent chatbot processing pipeline.
 * Users can:
 * - View the complete flow as a Mermaid diagram
 * - Click on nodes to edit configurations
 * - Enable/disable nodes dynamically
 * - See real-time updates to the flow
 */
export default function FlowArchitecturePage() {
  return (
    <div className="container mx-auto p-6">
      <FlowArchitectureManager />
    </div>
  )
}
