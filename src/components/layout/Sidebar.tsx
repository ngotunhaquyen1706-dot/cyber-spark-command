import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Mic,
  Cpu,
  Terminal,
  Box,
  Settings,
  Zap,
} from "lucide-react";
import { useEsp32 } from "@/lib/esp32-socket";

const items = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/voice", label: "Voice Recognition", icon: Mic },
  { to: "/motor", label: "Motor Control", icon: Cpu },
  { to: "/logs", label: "Command Logs", icon: Terminal },
  { to: "/view3d", label: "3D View", icon: Box },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { connected, status } = useEsp32();

  return (
    <aside className="relative z-20 hidden w-64 shrink-0 flex-col border-r border-border/60 glass-strong md:flex">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-border/50">
        <div className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 neon-border">
          <Zap className="h-5 w-5 text-primary" />
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-success animate-pulse-glow" />
        </div>
        <div className="leading-tight">
          <div className="text-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            CDP · v1.0
          </div>
          <div className="text-sm font-semibold neon-text">CDP-GROUP1</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {items.map((item) => {
          const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all ${
                active
                  ? "bg-primary/10 text-primary neon-border"
                  : "text-muted-foreground hover:bg-sidebar-accent/40 hover:text-foreground"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary neon-glow"
                />
              )}
              <Icon className={`h-4 w-4 ${active ? "text-primary" : ""}`} />
              <span className="font-medium">{item.label}</span>
              {active && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary animate-pulse-glow" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="m-3 rounded-xl glass p-4 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-mono uppercase tracking-wider text-muted-foreground">Power</span>
          <span className="text-success text-mono">92%</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary/40">
          <div className="h-full w-[92%] rounded-full bg-gradient-to-r from-primary to-accent neon-glow" />
        </div>
        <div className="mt-3 flex items-center gap-2 text-muted-foreground">
          <span className="relative h-2 w-2 rounded-full bg-success ping-dot" />
          <span className="text-mono">ESP32 ONLINE</span>
        </div>
      </div>
    </aside>
  );
}
