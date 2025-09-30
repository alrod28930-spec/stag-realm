import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Shield, TrendingUp, Brain } from "lucide-react";

export function StagHero() {
  const shouldReduceMotion = useReducedMotion();
  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut" as const
      }
    }
  };

  const pulseVariants = {
    hover: shouldReduceMotion ? {} : {
      scale: 1.05,
      boxShadow: "0 0 30px rgba(200, 166, 77, 0.4)",
      transition: {
        duration: 0.2,
      }
    }
  };

  return (
    <section className="relative isolate overflow-hidden bg-[#0B0D12] text-[#E8ECEF] min-h-screen flex items-center">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_0%,rgba(200,166,77,0.08),transparent)]" />
      <div className="absolute inset-0 opacity-40" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23C8A64D' fill-opacity='0.03'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }} />
      
      {/* Animated Background Grid */}
      <motion.div
        animate={shouldReduceMotion ? {} : {
          y: [0, -20, 0],
          opacity: [0.3, 0.5, 0.3]
        }}
        transition={shouldReduceMotion ? {} : {
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut" as const
        }}
        className="absolute inset-0 bg-gradient-to-br from-[#C8A64D]/5 via-transparent to-[#09D97E]/5"
      />

      <div className="relative mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="mx-auto max-w-4xl text-center"
        >
          {/* Animated Accent Line */}
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 96, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mx-auto mb-8 h-1 rounded-full bg-gradient-to-r from-[#C8A64D] to-[#09D97E]"
          />

          {/* Main Headline */}
          <motion.h1
            variants={itemVariants}
            className="text-5xl font-bold tracking-tight sm:text-7xl lg:text-8xl bg-gradient-to-r from-[#E8ECEF] via-[#C8A64D] to-[#E8ECEF] bg-clip-text text-transparent"
          >
            StagAlgo
          </motion.h1>

          {/* Tagline */}
          <motion.p
            variants={itemVariants}
            className="mt-6 text-xl sm:text-2xl font-semibold text-[#C8A64D] tracking-wide"
          >
            Trade smarter. Learn faster. Risk less.
          </motion.p>

          {/* Subline */}
          <motion.p
            variants={itemVariants}
            className="mt-4 text-lg sm:text-xl text-[#C0C6CA] max-w-3xl mx-auto leading-relaxed"
          >
            An AI trading assistant with built-in education, risk rails, and broker mirroring.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            variants={itemVariants}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <motion.a
              href="/dashboard"
              variants={pulseVariants}
              whileHover="hover"
              className="group rounded-xl bg-[#C8A64D] px-8 py-4 text-[#0B0D12] font-semibold text-lg shadow-lg hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#C8A64D]/60 focus:ring-offset-2 focus:ring-offset-[#0B0D12] transition-all duration-200 flex items-center gap-2"
            >
              Enter App
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
            </motion.a>
            
            <motion.a
              href="/demo"
              whileHover={shouldReduceMotion ? {} : { scale: 1.02 }}
              className="rounded-xl border-2 border-[#C8A64D]/50 px-8 py-4 text-[#E8ECEF] font-semibold text-lg hover:bg-[#C8A64D]/10 hover:border-[#C8A64D] focus:outline-none focus:ring-2 focus:ring-[#C8A64D]/40 focus:ring-offset-2 focus:ring-offset-[#0B0D12] transition-all duration-200 backdrop-blur-sm"
            >
              View Demo
            </motion.a>
          </motion.div>

          {/* Feature Strip */}
          <motion.div
            variants={itemVariants}
            className="mt-12 flex flex-wrap justify-center items-center gap-8 text-[#AAB3B9]"
          >
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-[#09D97E]" />
              <span className="font-medium">AI Analyst</span>
            </div>
            <div className="hidden sm:block w-1 h-1 rounded-full bg-[#C8A64D]" />
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#C8A64D]" />
              <span className="font-medium">Trade Bots</span>
            </div>
            <div className="hidden sm:block w-1 h-1 rounded-full bg-[#C8A64D]" />
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#09D97E]" />
              <span className="font-medium">Risk Governors</span>
            </div>
          </motion.div>

          {/* Trust Badges Placeholder */}
          <motion.div
            variants={itemVariants}
            className="mt-16 flex flex-wrap justify-center items-center gap-8 opacity-60"
          >
            <div className="px-4 py-2 rounded-lg border border-[#C8A64D]/20 bg-white/5 backdrop-blur-sm">
              <span className="text-sm text-[#C0C6CA]">SEC Compliant</span>
            </div>
            <div className="px-4 py-2 rounded-lg border border-[#C8A64D]/20 bg-white/5 backdrop-blur-sm">
              <span className="text-sm text-[#C0C6CA]">Bank-Grade Security</span>
            </div>
            <div className="px-4 py-2 rounded-lg border border-[#C8A64D]/20 bg-white/5 backdrop-blur-sm">
              <span className="text-sm text-[#C0C6CA]">ISO 27001</span>
            </div>
          </motion.div>

          {/* Footer Microcopy */}
          <motion.p
            variants={itemVariants}
            className="mt-12 text-sm text-[#8E989F] font-medium"
          >
            Software only. Not financial advice.
          </motion.p>
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        animate={shouldReduceMotion ? {} : {
          y: [0, 10, 0],
        }}
        transition={shouldReduceMotion ? {} : {
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut" as const
        }}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
      >
        <div className="w-6 h-10 border-2 border-[#C8A64D]/40 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-[#C8A64D] rounded-full mt-2" />
        </div>
      </motion.div>
    </section>
  );
}