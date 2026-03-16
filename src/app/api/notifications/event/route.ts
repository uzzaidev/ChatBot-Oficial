import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase-server";
import { createServiceRoleClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type NotificationEventType = "delivered" | "opened";

const isValidEvent = (value: unknown): value is NotificationEventType => {
  return value === "delivered" || value === "opened";
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isValidUUID = (value: unknown): value is string => {
  return typeof value === "string" && UUID_REGEX.test(value);
};

export async function POST(request: NextRequest) {
  try {
    const authClient = await createRouteHandlerClient(request);
    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const eventType = body?.event;
    const notificationLogId = body?.notification_log_id as string | undefined;
    const category = body?.category as string | undefined;
    const messageType = body?.type as string | undefined;
    const phone = body?.phone as string | undefined;
    const wamid = body?.wamid as string | undefined;
    const threshold = body?.threshold as string | undefined;
    const periodStart = body?.period_start as string | undefined;

    if (!isValidEvent(eventType)) {
      return NextResponse.json(
        { error: "event must be delivered or opened" },
        { status: 400 },
      );
    }

    const supabase = createServiceRoleClient() as any;

    let rows: Array<{ id: string; status: string; sent_at: string }> | null = null;
    let findError: any = null;

    if (isValidUUID(notificationLogId)) {
      const directLookup = await supabase
        .from("notification_logs")
        .select("id, status, sent_at")
        .eq("id", notificationLogId)
        .eq("user_id", user.id)
        .limit(1);

      rows = directLookup.data;
      findError = directLookup.error;
    } else {
      let query = supabase
        .from("notification_logs")
        .select("id, status, sent_at")
        .eq("user_id", user.id)
        .order("sent_at", { ascending: false })
        .limit(1);

      if (category) query = query.eq("category", category);
      if (messageType) query = query.eq("data->>type", messageType);
      if (phone) query = query.eq("data->>phone", phone);
      if (wamid) query = query.eq("data->>wamid", wamid);
      if (threshold) query = query.eq("data->>threshold", threshold);
      if (periodStart) query = query.eq("data->>period_start", periodStart);

      const fallbackLookup = await query;
      rows = fallbackLookup.data;
      findError = fallbackLookup.error;
    }

    if (findError) {
      return NextResponse.json(
        { error: "Failed to find notification log", details: findError.message },
        { status: 500 },
      );
    }

    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row?.id) {
      return NextResponse.json(
        { success: false, message: "Notification log not found" },
        { status: 404 },
      );
    }

    const now = new Date().toISOString();
    const updatePayload: Record<string, string> = {};

    if (eventType === "delivered" && row.status === "opened") {
      return NextResponse.json({
        success: true,
        event: eventType,
        logId: row.id,
        updatedAt: now,
        message: "Event ignored because log is already opened",
      });
    }

    if (eventType === "delivered") {
      updatePayload.status = "delivered";
      updatePayload.delivered_at = now;
    } else {
      updatePayload.status = "opened";
      updatePayload.opened_at = now;
      updatePayload.delivered_at = now;
    }

    const { error: updateError } = await supabase
      .from("notification_logs")
      .update(updatePayload)
      .eq("id", row.id)
      .eq("user_id", user.id);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update notification log", details: updateError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      event: eventType,
      logId: row.id,
      updatedAt: now,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to register notification event",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
