import Link from 'next/link';
import { HeroSection, FeaturesSection, StatsSection, HowItWorksSection, CTASection } from '@/app/components/landing';

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <HeroSection />

      {/* Stats Section */}
      <StatsSection />

      {/* Features Section */}
      <FeaturesSection />

      {/* How It Works */}
      <HowItWorksSection />

      {/* CTA Section */}
      <CTASection />
    </main>
  );
}
