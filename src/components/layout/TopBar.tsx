import { useEffect, useState } from "react";
import { Activity, Wifi, Cpu, Signal, Globe } from "lucide-react";

function useNow() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}


function useTick(min: number, max: number, ms = 1500) {
  const [v, setV] = useState(() => (min + max) / 2);
  useEffect(() => {
    const id = setInterval(() => setV(min + Math.random() * (max - min)), ms);
    return () => clearInterval(id);
  }, [min, max, ms]);
  return v;
}

export function TopBar() {
  const now = useNow();
  const latency = useTick(8, 24);
  const cpu = useTick(22, 64);
  const signal = useTick(72, 99);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-border/60 glass-strong px-6">
      <div>
        <h1 className="text-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
          AI Voice Control
        </h1>
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold neon-text">NEURON.OS</span>
          <span className="relative inline-flex h-2 w-2 rounded-full bg-success ping-dot" />
          <span className="text-mono text-[10px] uppercase tracking-wider text-success">LIVE</span>
        </div>
      </div>

      <div className="ml-auto hidden items-center gap-2 text-mono text-xs lg:flex">
        <HudChip icon={<Globe className="h-3.5 w-3.5" />} label="IP" value="192.168.4.21" />
        <HudChip icon={<Wifi className="h-3.5 w-3.5" />} label="WIFI" value={`${signal.toFixed(0)}%`} />
        <HudChip icon={<Signal className="h-3.5 w-3.5" />} label="PING" value={`${latency.toFixed(0)}ms`} />
        <HudChip icon={<Cpu className="h-3.5 w-3.5" />} label="CPU" value={`${cpu.toFixed(0)}%`} />
        <HudChip icon={<Activity className="h-3.5 w-3.5" />} label="TIME" value={now ? now.toLocaleTimeString([], { hour12: false }) : "--:--:--"} />

      </div>
    </header>
  );
}

function HudChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border/60 bg-secondary/30 px-3 py-1.5">
      <span className="text-primary">{icon}</span>
      <span className="uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}
