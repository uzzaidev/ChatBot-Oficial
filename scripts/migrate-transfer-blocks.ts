/**
 * Migration Script: Add default values to existing transfer blocks
 *
 * This script updates all existing interactive flows to include
 * the new transfer configuration fields with sensible defaults.
 *
 * @phase Phase 3 - Migration
 * @created 2025-12-07
 *
 * Usage:
 *   npx tsx scripts/migrate-transfer-blocks.ts
 */

import { createServiceRoleClient } from '../src/lib/supabase'
import { InteractiveFlowDB, FlowBlock } from '../src/types/interactiveFlows'

async function migrateTransferBlocks() {
  console.log('🚀 Starting migration: Add default values to transfer blocks\n')

  const supabase = createServiceRoleClient()

  try {
    // 1. Fetch all flows
    console.log('📊 Fetching all interactive flows...')
    const { data: flows, error: fetchError } = await supabase
      .from('interactive_flows')
      .select('*')

    if (fetchError) {
      throw new Error(`Failed to fetch flows: ${fetchError.message}`)
    }

    if (!flows || flows.length === 0) {
      console.log('ℹ️  No flows found. Nothing to migrate.')
      return
    }

    console.log(`✅ Found ${flows.length} flows\n`)

    let updatedCount = 0
    let aiHandoffCount = 0
    let humanHandoffCount = 0

    // 2. Process each flow
    for (const flow of flows as InteractiveFlowDB[]) {
      console.log(`\n📝 Processing flow: ${flow.name} (${flow.id})`)

      let flowModified = false
      const updatedBlocks: FlowBlock[] = flow.blocks.map((block) => {
        // Migrate AI Handoff blocks
        if (block.type === 'ai_handoff') {
          const hasNewFields =
            block.data.autoRespond !== undefined ||
            block.data.includeFlowContext !== undefined ||
            block.data.contextFormat !== undefined

          if (!hasNewFields) {
            console.log(`  🤖 Migrating AI Handoff block: ${block.id}`)
            flowModified = true
            aiHandoffCount++

            return {
              ...block,
              data: {
                ...block.data,
                // Set defaults
                transitionMessage: block.data.transitionMessage || '',
                autoRespond: block.data.autoRespond ?? true,
                includeFlowContext: block.data.includeFlowContext ?? true,
                contextFormat: block.data.contextFormat || 'summary'
              }
            }
          }
        }

        // Migrate Human Handoff blocks
        if (block.type === 'human_handoff') {
          const hasNewFields = block.data.notifyAgent !== undefined

          if (!hasNewFields) {
            console.log(`  👤 Migrating Human Handoff block: ${block.id}`)
            flowModified = true
            humanHandoffCount++

            return {
              ...block,
              data: {
                ...block.data,
                // Set defaults
                transitionMessage:
                  block.data.transitionMessage ||
                  'Um atendente humano vai te responder em breve.',
                notifyAgent: block.data.notifyAgent ?? true
              }
            }
          }
        }

        return block
      })

      // 3. Update flow if modified
      if (flowModified) {
        console.log(`  💾 Updating flow in database...`)

        const { error: updateError } = await (supabase as any)
          .from('interactive_flows')
          .update({
            blocks: updatedBlocks,
            updated_at: new Date().toISOString()
          })
          .eq('id', flow.id)

        if (updateError) {
          console.error(`  ❌ Error updating flow ${flow.id}:`, updateError.message)
        } else {
          console.log(`  ✅ Flow updated successfully`)
          updatedCount++
        }
      } else {
        console.log(`  ⏭️  No migration needed (already up to date)`)
      }
    }

    // 4. Summary
    console.log('\n' + '='.repeat(60))
    console.log('📊 MIGRATION SUMMARY')
    console.log('='.repeat(60))
    console.log(`Total flows processed: ${flows.length}`)
    console.log(`Flows updated: ${updatedCount}`)
    console.log(`AI Handoff blocks migrated: ${aiHandoffCount}`)
    console.log(`Human Handoff blocks migrated: ${humanHandoffCount}`)
    console.log('='.repeat(60))
    console.log('\n✅ Migration completed successfully!\n')
  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  }
}

// Run migration
migrateTransferBlocks()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
