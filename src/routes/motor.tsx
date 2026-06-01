import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Square, Power, Gauge, Bot, Keyboard,
} from "lucide-react";
import { useEffect, useState } from "react";
import { HoloCard, StatLabel } from "@/components/ui-kit/HoloCard";
import { Sparkline } from "@/components/ui-kit/Sparkline";
import { useEsp32 } from "@/lib/esp32-socket";
import { labelColor, labelToMotor } from "@/lib/ei-labels";

export const Route = createFileRoute("/motor")({
  head: () => ({ meta: [{ title: "Motor Control — CDP-GROUP1" }] }),
  component: MotorPage,
});

type Dir = "F" | "B" | "L" | "R" | "S";

function MotorPage() {
  const { send, motor, connected } = useEsp32();
  const [dir, setDir] = useState<Dir>("S");
  const [speed, setSpeed] = useState(70);
  const [aiMode, setAiMode] = useState(true);
  const [estop, setEstop] = useState(false);

  // Sync ESP32 → UI when telemetry arrives
  useEffect(() => {
    if (motor.dir) setDir(motor.dir);
    if (typeof motor.speed === "number") setSpeed(motor.speed);
  }, [motor.dir, motor.speed]);

  // Push every change to ESP32
  useEffect(() => {
    send({ cmd: "motor", dir, speed });
  }, [dir, speed, send]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") setDir("F");
      else if (e.key === "ArrowDown") setDir("B");
      else if (e.key === "ArrowLeft") setDir("L");
      else if (e.key === "ArrowRight") setDir("R");
      else if (e.key === " ") setDir("S");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <StatLabel>Motor Control</StatLabel>
          <h2 className="mt-1 text-2xl font-semibold">TB6612FNG <span className="neon-text">drive station</span></h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAiMode((v) => !v)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-mono text-xs uppercase tracking-wider transition glass ${
              aiMode ? "text-primary neon-border" : "text-muted-foreground"
            }`}
          >
            <Bot className="h-4 w-4" /> {aiMode ? "AI Mode" : "Manual"}
          </button>
          <button
            onClick={() => { setEstop(true); setDir("S"); setSpeed(0); send({ cmd: "estop" }); setTimeout(() => setEstop(false), 1500); }}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-mono text-xs uppercase tracking-wider transition ${
              estop ? "bg-destructive text-destructive-foreground" : "bg-destructive/20 text-destructive border border-destructive/40"
            }`}
          >
            <Power className="h-4 w-4" /> E-STOP
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <HoloCard className="lg:col-span-2" glow>
          <StatLabel>Direction</StatLabel>
          <div className="mx-auto mt-4 grid w-full max-w-md grid-cols-3 grid-rows-3 gap-3">
            <span />
            <DirBtn active={dir === "F"} onClick={() => setDir("F")} icon={<ArrowUp />} label="FWD" />
            <span />
            <DirBtn active={dir === "L"} onClick={() => setDir("L")} icon={<ArrowLeft />} label="LFT" />
            <DirBtn active={dir === "S"} onClick={() => setDir("S")} icon={<Square />} label="STOP" stop />
            <DirBtn active={dir === "R"} onClick={() => setDir("R")} icon={<ArrowRight />} label="RGT" />
            <span />
            <DirBtn active={dir === "B"} onClick={() => setDir("B")} icon={<ArrowDown />} label="REV" />
            <span />
          </div>

          <div className="mt-6 flex items-center gap-2 text-mono text-xs text-muted-foreground">
            <Keyboard className="h-4 w-4 text-primary" />
            Keyboard: <kbd className="rounded border border-border/60 bg-background/40 px-1.5">↑</kbd>
            <kbd className="rounded border border-border/60 bg-background/40 px-1.5">↓</kbd>
            <kbd className="rounded border border-border/60 bg-background/40 px-1.5">←</kbd>
            <kbd className="rounded border border-border/60 bg-background/40 px-1.5">→</kbd>
            <kbd className="rounded border border-border/60 bg-background/40 px-1.5">space</kbd>
          </div>
        </HoloCard>

        <HoloCard glow>
          <StatLabel>Speed / PWM</StatLabel>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-5xl font-bold neon-text text-mono">{speed}</span>
            <span className="text-muted-foreground">%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="mt-4 w-full accent-[var(--neon)]"
          />
          <div className="mt-4 grid grid-cols-2 gap-2 text-mono text-xs">
            <Stat label="PWMA" value={`${Math.round(speed * 2.55)}`} />
            <Stat label="PWMB" value={`${Math.round(speed * 2.55)}`} />
            <Stat label="DIR" value={dir} />
            <Stat label="MODE" value={aiMode ? "AI" : "MAN"} />
          </div>
        </HoloCard>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <HoloCard>
          <StatLabel>Motor A Current</StatLabel>
          <div className="text-2xl font-bold neon-text text-mono">{(motor.currentA ?? 0).toFixed(2)}A</div>
          <Sparkline height={60} />
        </HoloCard>
        <HoloCard>
          <StatLabel>Motor B Current</StatLabel>
          <div className="text-2xl font-bold text-mono" style={{ color: "oklch(0.68 0.22 295)" }}>{(motor.currentB ?? 0).toFixed(2)}A</div>
          <Sparkline height={60} color="oklch(0.68 0.22 295)" />
        </HoloCard>
        <HoloCard>
          <StatLabel>Driver Temp</StatLabel>
          <div className="text-2xl font-bold text-mono" style={{ color: "oklch(0.82 0.18 75)" }}>{motor.temp != null ? `${motor.temp}°C` : "—"}</div>
          <Sparkline height={60} color="oklch(0.82 0.18 75)" />
        </HoloCard>
      </div>
      {!connected && (
        <div className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-mono text-xs text-warning">
          ESP32 not connected — commands are queued locally only. Configure IP in Settings.
        </div>
      )}
    </div>
  );
}

function DirBtn({ active, onClick, icon, label, stop }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; stop?: boolean }) {
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      className={`relative flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border transition ${
        active
          ? stop
            ? "border-destructive/60 bg-destructive/20 text-destructive neon-glow"
            : "border-primary/60 bg-primary/15 text-primary neon-glow"
          : "border-border/50 bg-background/30 text-muted-foreground hover:text-foreground hover:border-primary/40"
      }`}
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-mono text-[10px] uppercase tracking-wider">{label}</span>
      {active && <Gauge className="absolute right-2 top-2 h-3 w-3 opacity-60" />}
    </motion.button>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-border/40 bg-background/30 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-primary">{value}</div>
    </div>
  );
}
