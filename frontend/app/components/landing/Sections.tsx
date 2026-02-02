'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Shield, Zap, Lock, Globe, TrendingUp, Users, ArrowRight } from 'lucide-react';

// FeaturesSection Component
export function FeaturesSection() {
  const features = [
    {
      icon: Lock,
      title: 'Complete Privacy',
      description: 'Zero-knowledge proofs keep your bid amounts hidden from everyone, including us. Only the winner\'s price is revealed.',
      color: 'primary',
    },
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Built on Solana for instant settlement and sub-second transaction finality. No waiting, no delays.',
      color: 'accent',
    },
    {
      icon: Shield,
      title: 'Provably Fair',
      description: 'Smart contracts guarantee second-price auctions. Winner pays the second-highest bid, proven cryptographically.',
      color: 'success',
    },
    {
      icon: Globe,
      title: 'Universal Support',
      description: 'Auction anything: NFTs, physical goods, digital products, or services. One platform for everything.',
      color: 'info',
    },
  ];

  return (
    <section className="py-32 bg-background-primary relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-grid opacity-20" />

      <div className="container relative z-10 mx-auto px-4 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-text-primary mb-4">
            Why PrivateAuction?
          </h2>
          <p className="text-xl text-text-secondary max-w-2xl mx-auto">
            The most advanced privacy-preserving auction platform on Solana
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="card card-hover group"
            >
              <div className={`w-14 h-14 rounded-2xl bg-${feature.color}-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <feature.icon className={`w-7 h-7 text-${feature.color}-400`} />
              </div>
              <h3 className="text-xl font-bold text-text-primary mb-3">
                {feature.title}
              </h3>
              <p className="text-text-secondary leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// StatsSection Component
export function StatsSection() {
  const stats = [
    { value: '99%', label: 'Gas Savings', sublabel: 'via ZK Compression' },
    { value: '<2s', label: 'Proof Generation', sublabel: 'Client-side' },
    { value: '100%', label: 'Privacy Guaranteed', sublabel: 'Zero-Knowledge' },
    { value: '~400ms', label: 'Settlement Time', sublabel: 'on Solana' },
  ];

  return (
    <section className="py-20 bg-background-secondary border-y border-white/5">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="text-center"
            >
              <div className="text-4xl md:text-5xl font-bold gradient-text mb-2">
                {stat.value}
              </div>
              <div className="text-base md:text-lg font-semibold text-text-primary mb-1">
                {stat.label}
              </div>
              <div className="text-sm text-text-muted">{stat.sublabel}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// HowItWorksSection Component
export function HowItWorksSection() {
  const steps = [
    {
      number: '01',
      title: 'Create or Browse',
      description: 'List your item or browse thousands of auctions across categories.',
    },
    {
      number: '02',
      title: 'Place Secret Bid',
      description: 'Submit your bid with ZK proof. Your amount stays completely private.',
    },
    {
      number: '03',
      title: 'Auction Ends',
      description: 'Winner pays second-highest price. Fair for everyone, proven by math.',
    },
    {
      number: '04',
      title: 'Instant Settlement',
      description: 'Smart contract handles payment and delivery automatically.',
    },
  ];

  return (
    <section className="py-32 bg-background-primary relative">
      <div className="container mx-auto px-4 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-text-primary mb-4">
            How It Works
          </h2>
          <p className="text-xl text-text-secondary max-w-2xl mx-auto">
            Simple, secure, and completely private
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="relative"
            >
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-full w-full h-0.5 bg-gradient-to-r from-primary-500/50 to-transparent" />
              )}

              <div className="text-6xl font-bold text-primary-500/20 mb-4">
                {step.number}
              </div>
              <h3 className="text-2xl font-bold text-text-primary mb-3">
                {step.title}
              </h3>
              <p className="text-text-secondary leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// CTASection Component
export function CTASection() {
  return (
    <section className="py-32 bg-gradient-to-b from-background-primary to-background-secondary relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent-cyan/10 rounded-full blur-3xl" />

      <div className="container relative z-10 mx-auto px-4 max-w-4xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl md:text-6xl font-bold text-text-primary mb-6">
            Ready to Experience
            <br />
            <span className="gradient-text">Private Auctions?</span>
          </h2>

          <p className="text-xl text-text-secondary mb-12 max-w-2xl mx-auto">
            Join thousands of users trading with complete privacy and fairness on Solana.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/marketplace" className="btn-primary px-8 py-4 text-lg group">
              Start Bidding
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link href="/create" className="btn-secondary px-8 py-4 text-lg">
              Create Auction
            </Link>
          </div>

          {/* Trust indicators */}
          <div className="mt-16 flex items-center justify-center gap-8 text-text-muted text-sm">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>10,000+ Users</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span>$5M+ Traded</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span>Audited</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
