import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

interface ConfigureAIRequestBody {
  client_id: string
  openai_key?: string
  groq_key?: string
  provider?: string
  openai_model?: string
  groq_model?: string
  system_prompt?: string
}

const buildValidationErrorResponse = (message: string) =>
  NextResponse.json({ error: message }, { status: 400 })

const buildNotFoundResponse = () =>
  NextResponse.json({ error: 'Client not found or not in pending setup status' }, { status: 404 })

const saveApiKeyToVault = async (
  supabase: ReturnType<typeof createServiceClient>,
  existingSecretId: string | null | undefined,
  apiKey: string,
  secretName: string,
  description: string
): Promise<string> => {
  if (existingSecretId) {
    const { error } = await (supabase as any).rpc('update_client_secret', {
      secret_id: existingSecretId,
      new_secret_value: apiKey,
    })

    if (error) {
      throw new Error(`Failed to update secret in Vault: ${error.message}`)
    }

    return existingSecretId
  }

  const { data: newSecretId, error } = await (supabase as any).rpc('create_client_secret', {
    secret_value: apiKey,
    secret_name: secretName,
    secret_description: description,
  })

  if (error || !newSecretId) {
    throw new Error(`Failed to create secret in Vault: ${error?.message ?? 'No ID returned'}`)
  }

  return newSecretId as string
}

export async function POST(request: NextRequest) {
  try {
    const body: ConfigureAIRequestBody = await request.json()
    const { client_id, openai_key, groq_key, provider, openai_model, groq_model, system_prompt } = body

    if (!client_id?.trim()) {
      return buildValidationErrorResponse('client_id is required')
    }

    const supabase = createServiceClient()
    const supabaseAny = supabase as any

    const { data: client, error: fetchError } = await supabaseAny
      .from('clients')
      .select('id, name, status, openai_api_key_secret_id, groq_api_key_secret_id')
      .eq('id', client_id)
      .eq('status', 'pending_setup')
      .single()

    if (fetchError || !client) {
      return buildNotFoundResponse()
    }

    const typedClient = client as {
      id: string
      name: string
      status: string
      openai_api_key_secret_id: string | null
      groq_api_key_secret_id: string | null
    }

    const vaultUpdates: { openai_api_key_secret_id?: string; groq_api_key_secret_id?: string } = {}

    if (openai_key?.trim()) {
      const openaiSecretId = await saveApiKeyToVault(
        supabase,
        typedClient.openai_api_key_secret_id,
        openai_key.trim(),
        `${client_id}_openai_api_key`,
        `OpenAI API Key for client ${typedClient.name}`
      )
      vaultUpdates.openai_api_key_secret_id = openaiSecretId
    }

    if (groq_key?.trim()) {
      const groqSecretId = await saveApiKeyToVault(
        supabase,
        typedClient.groq_api_key_secret_id,
        groq_key.trim(),
        `${client_id}_groq_api_key`,
        `Groq API Key for client ${typedClient.name}`
      )
      vaultUpdates.groq_api_key_secret_id = groqSecretId
    }

    const clientUpdatePayload = {
      ...vaultUpdates,
      status: 'active',
      ...(provider && { primary_model_provider: provider }),
      ...(openai_model && { openai_model }),
      ...(groq_model && { groq_model }),
      ...(system_prompt !== undefined && { system_prompt }),
    }

    const { error: updateError } = await supabaseAny
      .from('clients')
      .update(clientUpdatePayload)
      .eq('id', client_id)

    if (updateError) {
      throw new Error(`Failed to update client: ${updateError.message}`)
    }

    return NextResponse.json({ success: true, client_id })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Internal server error: ${errorMessage}` }, { status: 500 })
  }
}

// inline-review: ok - no keys logged, client_id validated, pending_setup checked, no let/var, vault updated via service client
