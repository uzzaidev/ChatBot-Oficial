import { Hero } from '@/components/landing/Hero'
import { Highlights } from '@/components/landing/Highlights'
import { Plans } from '@/components/landing/Plans'
import { Security } from '@/components/landing/Security'
import { FinalCTA } from '@/components/landing/FinalCTA'

/**
 * Landing Page - Shows UzzApp portal introduction before login
 * 
 * This is a simple static page that introduces the platform.
 * Users can navigate to /login or /register from here.
 */
export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background">
      <Hero />
      <Highlights />
      <Plans />
      <Security />
      <FinalCTA />
    </main>
  )
}
