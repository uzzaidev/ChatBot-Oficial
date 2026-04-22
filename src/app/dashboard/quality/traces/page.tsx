import { TracesClient } from "@/components/TracesClient";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default function QualityTracesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      }
    >
      <TracesClient />
    </Suspense>
  );
}

