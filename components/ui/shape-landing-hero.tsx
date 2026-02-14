"use client";

import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { Circle } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

function ElegantShape({
  className,
  delay = 0,
  width = 400,
  height = 100,
  rotate = 0,
  gradient = "from-white/[0.08]",
}: {
  className?: string;
  delay?: number;
  width?: number;
  height?: number;
  rotate?: number;
  gradient?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -150, rotate: rotate - 15 }}
      animate={{ opacity: 1, y: 0, rotate }}
      transition={{
        duration: 2.4,
        delay,
        ease: [0.23, 0.86, 0.39, 0.96],
        opacity: { duration: 1.2 },
      }}
      className={cn("absolute", className)}
    >
      <motion.div
        animate={{ y: [0, 15, 0] }}
        transition={{ duration: 12, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        style={{ width, height }}
        className="relative"
      >
        <div
          className={cn(
            "absolute inset-0 rounded-full",
            "bg-gradient-to-r to-transparent",
            gradient,
            "backdrop-blur-[2px] border-2 border-white/[0.15]",
            "shadow-[0_8px_32px_0_rgba(255,255,255,0.1)]",
            "after:absolute after:inset-0 after:rounded-full",
            "after:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2),transparent_70%)]"
          )}
        />
      </motion.div>
    </motion.div>
  );
}

export function ShapeLandingHero({
  badge = "Plataforma Profissional",
  title1 = "Centro de comando do guichê",
  title2 = "Operação, caixa e fluxo dos operadores",
  subtitle = "Gestão em tempo real com visão executiva para admin e operador.",
  actions,
}: {
  badge?: string;
  title1?: string;
  title2?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-200, 200], [6, -6]);
  const rotateY = useTransform(x, [-200, 200], [-6, 6]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const cx = animate(x, 40, { duration: 3, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" });
    const cy = animate(y, -30, { duration: 4, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" });
    return () => {
      cx.stop();
      cy.stop();
    };
  }, [x, y]);

  return (
    <div className="relative w-full overflow-hidden rounded-3xl border border-white/10 bg-[#030303] p-6 md:p-8">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.08] via-transparent to-rose-500/[0.08] blur-3xl" />

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <ElegantShape delay={0.3} width={600} height={140} rotate={12} gradient="from-indigo-500/[0.15]" className="left-[-10%] md:left-[-5%] top-[15%] md:top-[20%]" />
        <ElegantShape delay={0.5} width={500} height={120} rotate={-15} gradient="from-cyan-500/[0.14]" className="right-[-10%] md:right-[-5%] top-[45%] md:top-[40%]" />
        <ElegantShape delay={0.4} width={320} height={90} rotate={8} gradient="from-fuchsia-500/[0.14]" className="left-[20%] bottom-[-5%]" />
      </div>

      <motion.div style={mounted ? { rotateX, rotateY } : undefined} className="relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9 }}
          className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-xs text-cyan-200"
        >
          <Circle className="h-3 w-3" /> {badge}
        </motion.div>

        <h2 className="mt-4 text-2xl md:text-4xl font-extrabold tracking-tight text-white">{title1}</h2>
        <p className="text-lg md:text-2xl font-semibold text-cyan-100/90 mt-1">{title2}</p>
        <p className="mt-3 max-w-3xl text-sm md:text-base text-slate-300">{subtitle}</p>

        {actions ? <div className="mt-5 flex flex-wrap gap-2">{actions}</div> : null}
      </motion.div>
    </div>
  );
}
