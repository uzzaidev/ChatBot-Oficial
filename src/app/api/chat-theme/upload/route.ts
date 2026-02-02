import { createRouteHandlerClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Tamanho máximo: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024

// Tipos de arquivo permitidos
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/**
 * POST /api/chat-theme/upload
 *
 * Faz upload de uma imagem personalizada de fundo para o Supabase Storage
 *
 * @body FormData com campo 'file'
 * @returns {object} { success: boolean, url: string, fileName: string }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(request)

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Obter arquivo do FormData
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'Nenhum arquivo foi enviado' },
        { status: 400 }
      )
    }

    // Validar tipo de arquivo
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: `Tipo de arquivo inválido: ${file.type}. Use JPEG, PNG ou WebP.`
        },
        { status: 400 }
      )
    }

    // Validar tamanho (5MB máximo)
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(2)
      return NextResponse.json(
        {
          error: `Arquivo muito grande (${sizeMB}MB). Tamanho máximo: 5MB.`
        },
        { status: 400 }
      )
    }

    // Gerar nome único do arquivo
    const timestamp = Date.now()
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const fileName = `user-${user.id}/background-${timestamp}.${extension}`

    // Deletar backgrounds antigos do usuário (manter apenas o mais recente)
    // Isso evita acúmulo de arquivos no Storage
    try {
      const { data: existingFiles } = await supabase.storage
        .from('chat-backgrounds')
        .list(`user-${user.id}`)

      if (existingFiles && existingFiles.length > 0) {
        const filesToDelete = existingFiles.map(f => `user-${user.id}/${f.name}`)
        await supabase.storage
          .from('chat-backgrounds')
          .remove(filesToDelete)
      }
    } catch (cleanupError) {
      console.warn('Erro ao limpar arquivos antigos:', cleanupError)
      // Não bloquear o upload se a limpeza falhar
    }

    // Fazer upload para o Supabase Storage
    const { data, error } = await supabase.storage
      .from('chat-backgrounds')
      .upload(fileName, file, {
        cacheControl: '3600', // Cache de 1 hora
        upsert: false, // Não sobrescrever (nome é único por timestamp)
      })

    if (error) {
      console.error('Erro ao fazer upload:', error)
      return NextResponse.json(
        { error: 'Erro ao fazer upload da imagem' },
        { status: 500 }
      )
    }

    // Obter URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('chat-backgrounds')
      .getPublicUrl(fileName)

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName: data.path,
    })
  } catch (error) {
    console.error('Erro na API POST /chat-theme/upload:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/chat-theme/upload
 *
 * Deleta a imagem de fundo customizada do usuário do Storage
 *
 * @query {string} fileName - Nome do arquivo a deletar
 * @returns {object} { success: boolean }
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(request)

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Obter fileName da query string
    const searchParams = request.nextUrl.searchParams
    const fileName = searchParams.get('fileName')

    if (!fileName) {
      return NextResponse.json(
        { error: 'fileName não fornecido' },
        { status: 400 }
      )
    }

    // Verificar se o arquivo pertence ao usuário (segurança)
    if (!fileName.startsWith(`user-${user.id}/`)) {
      return NextResponse.json(
        { error: 'Não autorizado a deletar este arquivo' },
        { status: 403 }
      )
    }

    // Deletar arquivo do Storage
    const { error } = await supabase.storage
      .from('chat-backgrounds')
      .remove([fileName])

    if (error) {
      console.error('Erro ao deletar arquivo:', error)
      return NextResponse.json(
        { error: 'Erro ao deletar imagem' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro na API DELETE /chat-theme/upload:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
