import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Cpu, Mic, Radio, BrainCircuit, Wifi, ArrowRight, Activity, Gauge,
} from "lucide-react";
import { useEffect, useState } from "react";
import { HoloCard, StatLabel } from "@/components/ui-kit/HoloCard";
import { Waveform } from "@/components/ui-kit/Waveform";
import { Sparkline } from "@/components/ui-kit/Sparkline";
import { useEsp32 } from "@/lib/esp32-socket";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — CDP-GROUP1" },
      { name: "description", content: "Realtime monitoring for ESP32 voice-controlled robotics system." },
    ],
  }),
  component: DashboardPage,
});

const COMMANDS = ["forward", "backward", "stop", "left", "right", "boost", "halt", "scan"];

function useFakeCommand() {
  const [cmd, setCmd] = useState({ word: "stop", conf: 0.94, t: Date.now() });
  useEffect(() => {
    const id = setInterval(() => {
      setCmd({
        word: COMMANDS[Math.floor(Math.random() * COMMANDS.length)],
        conf: 0.7 + Math.random() * 0.3,
        t: Date.now(),
      });
    }, 2600);
    return () => clearInterval(id);
  }, []);
  return cmd;
}

function DashboardPage() {
  const fake = useFakeCommand();
  const { connected, ip, voice, motor, system, logs } = useEsp32();
  const cmd = voice
    ? { word: voice.word, conf: voice.conf, t: Date.now() }
    : fake;

  const statuses = [
    { icon: Cpu, label: "ESP32", value: connected ? "ONLINE" : "OFFLINE", sub: "Xtensa LX6 · 240MHz", ok: connected },
    { icon: Mic, label: "Microphone", value: connected ? "ACTIVE" : "—", sub: "INMP441 · 16kHz", ok: connected },
    { icon: Gauge, label: "Motor", value: motor.dir ? `DIR ${motor.dir}` : "IDLE", sub: "TB6612FNG", ok: connected },
    { icon: BrainCircuit, label: "AI Model", value: "READY", sub: "TinyML · 32kB", ok: true },
    { icon: Wifi, label: "Network", value: ip, sub: system.rssi != null ? `WPA2 · ${system.rssi}dBm` : "WPA2", ok: connected },
  ];

  return (
    <div className="space-y-6">
      {/* Hero strip */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <StatLabel>SYSTEM OVERVIEW</StatLabel>
          <h2 className="mt-1 text-2xl font-semibold">
            All systems <span className="neon-text">operational</span>
          </h2>
          <p className="text-sm text-muted-foreground">Realtime telemetry from your embedded voice-control pipeline.</p>
        </div>
        <div className="flex items-center gap-2 text-mono text-xs text-muted-foreground">
          <span className={`relative h-2 w-2 rounded-full ${connected ? "bg-success ping-dot" : "bg-destructive"}`} />
          <span>{connected ? "STREAMING · LIVE" : "WAITING FOR ESP32"}</span>
        </div>
      </div>

      {/* Status grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {statuses.map((s, i) => (
          <HoloCard key={s.label} glow>
            <div className="flex items-center justify-between">
              <s.icon className="h-5 w-5 text-primary" />
              <span className={`h-2 w-2 rounded-full ${s.ok ? "bg-success" : "bg-destructive"} animate-pulse-glow`} />
            </div>
            <StatLabel>{s.label}</StatLabel>
            <div className="mt-1 text-lg font-semibold text-mono neon-text">{s.value}</div>
            <div className="text-xs text-muted-foreground text-mono">{s.sub}</div>
            <div className="mt-3">
              <Sparkline height={36} color={i % 2 ? "oklch(0.68 0.22 295)" : "var(--neon)"} />
            </div>
          </HoloCard>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Waveform + Command */}
        <HoloCard className="lg:col-span-2" glow>
          <div className="flex items-center justify-between">
            <div>
              <StatLabel>LIVE AUDIO STREAM</StatLabel>
              <div className="mt-1 text-lg font-semibold">Microphone Spectrum</div>
            </div>
            <div className="flex items-center gap-2 text-mono text-xs">
              <Activity className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">16kHz · 16-bit · I2S</span>
            </div>
          </div>
          <div className="mt-4 rounded-lg border border-border/60 bg-background/40 p-4">
            <Waveform height={140} bars={72} />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-mono text-xs">
            <Metric label="Peak" value="-6.2 dB" />
            <Metric label="Noise" value="-42 dB" />
            <Metric label="SNR" value="36 dB" />
          </div>
        </HoloCard>

        <HoloCard glow>
          <StatLabel>Recognized Command</StatLabel>
          <motion.div
            key={cmd.t}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-3 rounded-lg border border-primary/40 bg-primary/5 p-5 text-center neon-border"
          >
            <div className="text-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              Token
            </div>
            <div className="mt-1 text-3xl font-bold uppercase neon-text">{cmd.word}</div>
            <div className="mt-3 text-mono text-xs text-muted-foreground">CONFIDENCE</div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-secondary/40">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary to-accent neon-glow"
                animate={{ width: `${cmd.conf * 100}%` }}
              />
            </div>
            <div className="mt-1 text-mono text-sm text-primary">{(cmd.conf * 100).toFixed(1)}%</div>
          </motion.div>
        </HoloCard>
      </div>

      {/* Signal Flow */}
      <HoloCard glow>
        <StatLabel>Signal Flow</StatLabel>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          {[
            { icon: Mic, label: "MIC", sub: "I2S Input" },
            { icon: BrainCircuit, label: "AI", sub: "TinyML" },
            { icon: Cpu, label: "ESP32", sub: "Controller" },
            { icon: Gauge, label: "MOTOR", sub: "TB6612" },
          ].map((n, i, arr) => (
            <div key={n.label} className="flex flex-1 items-center gap-2">
              <div className="flex flex-col items-center gap-1">
                <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-primary/50 bg-primary/10 neon-border animate-float">
                  <n.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="text-mono text-xs neon-text">{n.label}</div>
                <div className="text-[10px] text-muted-foreground">{n.sub}</div>
              </div>
              {i < arr.length - 1 && (
                <div className="relative h-px flex-1 bg-gradient-to-r from-primary/60 to-accent/60">
                  <motion.div
                    className="absolute -top-1 h-2 w-2 rounded-full bg-primary neon-glow"
                    animate={{ left: ["0%", "100%"] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: "linear", delay: i * 0.4 }}
                  />
                  <ArrowRight className="absolute right-0 top-1/2 h-3 w-3 -translate-y-1/2 translate-x-1/2 text-primary" />
                </div>
              )}
            </div>
          ))}
        </div>
      </HoloCard>

      {/* Bottom: activity feed + mini charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <HoloCard className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <StatLabel>Activity Feed</StatLabel>
            <Radio className="h-4 w-4 text-primary animate-pulse-glow" />
          </div>
          <ul className="mt-3 space-y-2 text-mono text-xs">
            {[
              ["12:04:21", "Command [forward] · conf 0.96", "ok"],
              ["12:04:14", "Motor PWM set to 78%", "ok"],
              ["12:04:09", "Wake word detected: 'Neuron'", "ok"],
              ["12:03:52", "Latency spike 38ms", "warn"],
              ["12:03:30", "ESP32 reconnected to AP", "ok"],
            ].map(([t, m, s]) => (
              <li key={t as string} className="flex items-center gap-3 rounded-md border border-border/40 bg-background/30 px-3 py-2">
                <span className={`h-1.5 w-1.5 rounded-full ${s === "ok" ? "bg-success" : "bg-warning"}`} />
                <span className="text-muted-foreground">{t}</span>
                <span className="text-foreground">{m}</span>
              </li>
            ))}
          </ul>
        </HoloCard>

        <HoloCard>
          <StatLabel>System Latency</StatLabel>
          <div className="mt-1 text-2xl font-bold neon-text text-mono">14<span className="text-base text-muted-foreground"> ms</span></div>
          <Sparkline height={70} />
          <div className="mt-3 grid grid-cols-2 gap-3 text-mono text-xs">
            <Metric label="Min" value="8ms" />
            <Metric label="Max" value="42ms" />
          </div>
        </HoloCard>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/40 bg-background/30 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-foreground">{value}</div>
    </div>
  );
}
