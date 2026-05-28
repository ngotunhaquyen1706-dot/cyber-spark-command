import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface HoloCardProps extends HTMLMotionProps<"div"> {
  glow?: boolean;
}

export function HoloCard({ className, glow, children, ...props }: HoloCardProps) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 220, damping: 22 }}
      className={cn(
        "relative rounded-xl glass p-5 transition-shadow",
        glow && "neon-border",
        "hover:shadow-[0_0_40px_oklch(0.7_0.2_215/30%)]",
        className,
      )}
      {...props}
    >
      <span className="pointer-events-none absolute left-3 top-3 h-2 w-2 rounded-full border border-primary/50" />
      <span className="pointer-events-none absolute right-3 top-3 h-2 w-2 rounded-full border border-primary/50" />
      <span className="pointer-events-none absolute left-3 bottom-3 h-2 w-2 rounded-full border border-primary/50" />
      <span className="pointer-events-none absolute right-3 bottom-3 h-2 w-2 rounded-full border border-primary/50" />
      {children}
    </motion.div>
  );
}

export function StatLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
      {children}
    </div>
  );
}
