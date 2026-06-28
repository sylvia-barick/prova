import { Header } from '@/components/header'
import { HeroSection } from '@/components/hero-section'
import { ProblemSection } from '@/components/problem-section'
import { SolutionSection } from '@/components/solution-section'
import { FeaturesSection } from '@/components/features-section'
import { DemoSection } from '@/components/demo-section'
import { CtaSection } from '@/components/cta-section'
import { Footer } from '@/components/footer'

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/cherry-blossoms.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-background/95 via-background/85 to-background/90" />
      </div>

      <Header />
      <HeroSection />
      <ProblemSection />
      <SolutionSection />
      <FeaturesSection />
      <DemoSection />
      <CtaSection />
      <Footer />
    </div>
  )
}
