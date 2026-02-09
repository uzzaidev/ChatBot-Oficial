/**
 * 😊 Update Message Reaction
 *
 * When a user reacts to a message in WhatsApp, this function updates
 * the existing message's metadata with the reaction information.
 *
 * WhatsApp Business API sends reactions as a separate message type with:
 * - reaction.emoji: The emoji used (or empty string to remove reaction)
 * - reaction.message_id: The wamid of the message being reacted to
 */

import { createClient } from "@supabase/supabase-js";

interface UpdateReactionInput {
  /** wamid of the message being reacted to */
  targetWamid: string;
  /** Emoji used for the reaction (empty string removes reaction) */
  emoji: string;
  /** Phone number of the person who reacted */
  reactorPhone: string;
  /** Client ID for multi-tenant isolation */
  clientId: string;
}

interface UpdateReactionResult {
  success: boolean;
  updated: boolean;
  error?: string;
}

/**
 * Updates a message's metadata with reaction information
 */
export const updateMessageReaction = async (
  input: UpdateReactionInput,
): Promise<UpdateReactionResult> => {
  const { targetWamid, emoji, reactorPhone, clientId } = input;

  if (!targetWamid) {
    return { success: false, updated: false, error: "Missing target wamid" };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return {
      success: false,
      updated: false,
      error: "Missing Supabase credentials",
    };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // 1. Find the message by wamid (stored in metadata.wamid)
    // Messages are stored in n8n_chat_histories with metadata containing wamid
    const { data: messages, error: findError } = await supabase
      .from("n8n_chat_histories")
      .select("id, message, client_id")
      .eq("client_id", clientId)
      .not("message", "is", null);

    if (findError) {
      console.error("❌ [Reaction] Error finding message:", findError);
      return { success: false, updated: false, error: findError.message };
    }

    // 2. Search for the message with matching wamid in metadata
    let targetMessage: { id: number; message: Record<string, unknown> } | null =
      null;

    for (const row of messages || []) {
      const msgData = row.message as Record<string, unknown> | null;
      if (msgData && msgData.metadata) {
        const metadata = msgData.metadata as Record<string, unknown>;
        if (metadata.wamid === targetWamid) {
          targetMessage = { id: row.id, message: msgData };
          break;
        }
      }
    }

    if (!targetMessage) {
      console.log(`⚠️ [Reaction] Message not found for wamid: ${targetWamid}`);
      return { success: true, updated: false, error: "Message not found" };
    }

    // 3. Update the message's metadata with the reaction
    const existingMetadata =
      (targetMessage.message.metadata as Record<string, unknown>) || {};
    const existingReactions =
      (existingMetadata.reactions as Array<{
        emoji: string;
        reactedBy: string;
        reactedAt: string;
      }>) || [];

    // Check if this reactor already has a reaction on this message
    const existingReactionIndex = existingReactions.findIndex(
      (r) => r.reactedBy === reactorPhone,
    );

    if (emoji === "") {
      // Empty emoji means remove reaction
      if (existingReactionIndex >= 0) {
        existingReactions.splice(existingReactionIndex, 1);
      }
    } else {
      // Add or update reaction
      const newReaction = {
        emoji,
        reactedBy: reactorPhone,
        reactedAt: new Date().toISOString(),
      };

      if (existingReactionIndex >= 0) {
        existingReactions[existingReactionIndex] = newReaction;
      } else {
        existingReactions.push(newReaction);
      }
    }

    // 4. Update the message in the database
    const updatedMessage = {
      ...targetMessage.message,
      metadata: {
        ...existingMetadata,
        reactions: existingReactions,
      },
    };

    const { error: updateError } = await supabase
      .from("n8n_chat_histories")
      .update({ message: updatedMessage })
      .eq("id", targetMessage.id);

    if (updateError) {
      console.error("❌ [Reaction] Error updating message:", updateError);
      return { success: false, updated: false, error: updateError.message };
    }

    console.log(
      `✅ [Reaction] ${
        emoji ? `Added ${emoji}` : "Removed"
      } reaction on message ${targetWamid}`,
    );
    return { success: true, updated: true };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("❌ [Reaction] Exception:", errorMessage);
    return { success: false, updated: false, error: errorMessage };
  }
};
