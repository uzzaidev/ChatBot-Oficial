'use client'

import { Suspense } from 'react'
import { TracesClient } from '@/components/TracesClient'

export default function TracesPage() {
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
  )
}
