/**
 * API Route: /api/flows/media/upload
 *
 * Uploads a NEW media file to Supabase Storage for use as a flow message
 * attachment. It does NOT index the file into the knowledge base / RAG — it is
 * stored only so the flow can send it. Returns the public URL + metadata.
 */

import { uploadFileToStorage } from "@/lib/storage";
import { getClientIdFromSession } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// WhatsApp limits: images ~5MB, documents up to 100MB.
const MAX_IMAGE = 5 * 1024 * 1024;
const MAX_DOCUMENT = 100 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const clientId = await getClientIdFromSession(request as any);
    if (!clientId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Arquivo é obrigatório" },
        { status: 400 },
      );
    }

    const mimeType = file.type || "application/octet-stream";
    const isImage = mimeType.startsWith("image/");
    const maxSize = isImage ? MAX_IMAGE : MAX_DOCUMENT;

    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error: `Arquivo muito grande. Máximo: ${maxSize / (1024 * 1024)} MB`,
        },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const url = await uploadFileToStorage(
      buffer,
      file.name,
      mimeType,
      clientId,
    );

    return NextResponse.json({
      url,
      filename: file.name,
      mimeType,
      type: isImage ? "image" : "document",
    });
  } catch (error) {
    console.error("[POST flows/media/upload] Error:", error);
    const details = error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json(
      { error: "Falha no upload", details },
      { status: 500 },
    );
  }
}
