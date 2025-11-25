import { motion, useReducedMotion } from "framer-motion";
import { Check, ArrowRight } from "lucide-react";

export function StagCloser() {
  const shouldReduceMotion = useReducedMotion();

  const containerVariants = {
    hidden: { opacity: 0, scale: shouldReduceMotion ? 1 : 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.6,
        staggerChildren: 0.15,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut" as const
      }
    }
  };

  return (
    <section className="relative bg-[#0B0D12] py-20 lg:py-32">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(200,166,77,0.03),transparent_50%)]" />
      
      <div className="mx-auto max-w-4xl px-6 lg:px-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          className="relative"
        >
          {/* Main Card */}
          <div 
            className="rounded-2xl border border-[#C8A64D]/30 bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-8 lg:p-12 backdrop-blur-sm relative overflow-hidden"
            style={{
              boxShadow: `
                0 10px 40px rgba(0,0,0,0.4),
                inset 0 1px 0 rgba(200,166,77,0.3),
                inset 0 0 20px rgba(9,217,126,0.05)
              `,
            }}
          >
            {/* Gradient Border Effect */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#C8A64D]/20 via-[#09D97E]/20 to-[#C8A64D]/20 opacity-50 blur-sm" />
            <div className="absolute inset-[1px] rounded-2xl bg-[#0B0D12]/80 backdrop-blur-sm" />
            
            {/* Content */}
            <div className="relative z-10">
              {/* Title */}
              <motion.h2
                variants={itemVariants}
                className="text-center text-3xl lg:text-4xl font-bold text-[#E8ECEF] mb-4"
              >
                Ready to level up your trading?
              </motion.h2>

              {/* Subline */}
              <motion.p
                variants={itemVariants}
                className="text-center text-lg lg:text-xl text-[#C0C6CA] mb-8 max-w-2xl mx-auto"
              >
                Start with the Demo. Upgrade when you're confident.
              </motion.p>

              {/* CTA Buttons */}
              <motion.div
                variants={itemVariants}
                className="flex flex-col sm:flex-row justify-center gap-4 mb-8"
              >
                <motion.a
                  href="/demo"
                  whileHover={shouldReduceMotion ? {} : { 
                    scale: 1.02,
                    boxShadow: "0 0 25px rgba(9, 217, 126, 0.4)"
                  }}
                  whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
                  className="group rounded-xl bg-[#09D97E] px-8 py-4 text-[#0B0D12] font-semibold text-lg hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#09D97E]/60 focus:ring-offset-2 focus:ring-offset-[#0B0D12] transition-all duration-200 flex items-center justify-center gap-2"
                >
                  Start Free Demo
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
                </motion.a>
                
                <motion.a
                  href="/subscription"
                  whileHover={shouldReduceMotion ? {} : { scale: 1.02 }}
                  whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
                  className="rounded-xl border-2 border-[#C8A64D]/50 px-8 py-4 text-[#E8ECEF] font-semibold text-lg hover:bg-[#C8A64D]/10 hover:border-[#C8A64D] focus:outline-none focus:ring-2 focus:ring-[#C8A64D]/40 focus:ring-offset-2 focus:ring-offset-[#0B0D12] transition-all duration-200 backdrop-blur-sm"
                >
                  Pricing & Plans
                </motion.a>
              </motion.div>

              {/* Value Bullets */}
              <motion.div
                variants={itemVariants}
                className="flex flex-wrap justify-center items-center gap-6 lg:gap-8 mb-8"
              >
                <div className="flex items-center gap-2 text-[#AAB3B9]">
                  <Check className="w-4 h-4 text-[#09D97E]" />
                  <span className="text-sm lg:text-base font-medium">Education</span>
                </div>
                <div className="hidden sm:block w-1 h-1 rounded-full bg-[#C8A64D]" />
                <div className="flex items-center gap-2 text-[#AAB3B9]">
                  <Check className="w-4 h-4 text-[#09D97E]" />
                  <span className="text-sm lg:text-base font-medium">Risk Controls</span>
                </div>
                <div className="hidden sm:block w-1 h-1 rounded-full bg-[#C8A64D]" />
                <div className="flex items-center gap-2 text-[#AAB3B9]">
                  <Check className="w-4 h-4 text-[#09D97E]" />
                  <span className="text-sm lg:text-base font-medium">Broker Mirroring</span>
                </div>
              </motion.div>

              {/* Compliance Line */}
              <motion.p
                variants={itemVariants}
                className="text-center text-xs lg:text-sm text-[#8E989F] leading-relaxed"
              >
                We never hold funds. Results not guaranteed. Trading involves risk.
              </motion.p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}