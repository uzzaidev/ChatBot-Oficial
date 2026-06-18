/**
 * API Route: /api/flows/media/documents
 *
 * Lists the client's knowledge-base files (those with an original file URL) so
 * a flow message node can attach one. Returns one entry per distinct filename.
 */

import { createServerClient, createServiceRoleClient } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface MediaDoc {
  id: string;
  filename: string;
  url: string;
  mimeType: string | null;
  type: "image" | "document";
}

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("client_id")
      .eq("id", user.id)
      .single();
    if (!profile?.client_id) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 },
      );
    }

    // Service role for the read, scoped explicitly to the user's client_id
    // (documents RLS may be limited to service role).
    const supabaseAny = createServiceRoleClient() as any;
    const { data, error } = await supabaseAny
      .from("documents")
      .select("id, metadata, original_file_url, original_mime_type")
      .eq("client_id", profile.client_id)
      .not("original_file_url", "is", null)
      .limit(1000);

    if (error) {
      console.error("[GET flows/media/documents] Error:", error);
      return NextResponse.json(
        { error: "Failed to load documents" },
        { status: 500 },
      );
    }

    // One entry per distinct filename (documents are chunked into many rows).
    const byFilename = new Map<string, MediaDoc>();
    for (const doc of data || []) {
      const filename: string | undefined = doc.metadata?.filename;
      const url: string | undefined = doc.original_file_url;
      if (!filename || !url || byFilename.has(filename)) continue;
      const mimeType: string | null = doc.original_mime_type ?? null;
      byFilename.set(filename, {
        id: doc.id,
        filename,
        url,
        mimeType,
        type: mimeType?.startsWith("image/") ? "image" : "document",
      });
    }

    const documents = Array.from(byFilename.values()).sort((a, b) =>
      a.filename.localeCompare(b.filename),
    );

    return NextResponse.json({ documents });
  } catch (error) {
    console.error("[GET flows/media/documents] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
