import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Mic, Square, Volume2, Waves, Activity, BrainCircuit } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { HoloCard, StatLabel } from "@/components/ui-kit/HoloCard";
import { Waveform } from "@/components/ui-kit/Waveform";
import { useEsp32 } from "@/lib/esp32-socket";
import { EI_LABELS, labelColor } from "@/lib/ei-labels";

export const Route = createFileRoute("/voice")({
  head: () => ({ meta: [{ title: "Voice Recognition — CDP-GROUP1" }] }),
  component: VoicePage,
});

function VoicePage() {
  const { send, voiceHistory, system, connected } = useEsp32();
  const [listening, setListening] = useState(true);
  const [fakeLevel, setFakeLevel] = useState(40);

  const level = system.level ?? fakeLevel;

  // Mock level when no telemetry
  useEffect(() => {
    if (system.level != null) return;
    const id = setInterval(
      () => setFakeLevel(listening ? 30 + Math.random() * 65 : 5 + Math.random() * 8),
      250,
    );
    return () => clearInterval(id);
  }, [listening, system.level]);

  const transcript = useMemo(
    () =>
      voiceHistory.length
        ? voiceHistory.map((v) => ({ t: v.t, w: v.word, c: v.conf }))
        : [{ t: "—", w: "waiting for ESP32…", c: 0 }],
    [voiceHistory],
  );

  const toggle = (v: boolean) => {
    setListening(v);
    send({ cmd: "listen", value: v });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <StatLabel>Voice Recognition</StatLabel>
          <h2 className="mt-1 text-2xl font-semibold">Edge Impulse <span className="neon-text">on-device</span></h2>
          <div className="mt-1 flex items-center gap-2 text-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <BrainCircuit className="h-3.5 w-3.5 text-primary" />
            Model: 6-class keyword spotting · MFCC · INT8
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => toggle(true)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-mono uppercase tracking-wider transition ${
              listening ? "bg-primary text-primary-foreground neon-glow animate-pulse-glow" : "glass hover:bg-primary/10"
            }`}
          >
            <Mic className="h-4 w-4" /> Start
          </button>
          <button
            onClick={() => toggle(false)}
            className="flex items-center gap-2 rounded-lg glass px-4 py-2 text-sm text-mono uppercase tracking-wider hover:bg-destructive/20"
          >
            <Square className="h-4 w-4" /> Stop
          </button>
        </div>
      </div>

      <HoloCard glow>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              animate={listening ? { scale: [1, 1.15, 1] } : { scale: 1 }}
              transition={{ repeat: Infinity, duration: 1.4 }}
              className="relative flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 neon-border"
            >
              <Mic className="h-5 w-5 text-primary" />
              {listening && <span className="absolute inset-0 rounded-full ping-dot" />}
            </motion.div>
            <div>
              <div className="text-mono text-xs uppercase tracking-wider text-muted-foreground">Status</div>
              <div className={`text-lg font-semibold ${listening ? "neon-text" : "text-muted-foreground"}`}>
                {listening ? "LISTENING…" : "IDLE"}
              </div>
            </div>
          </div>
          <div className="hidden text-mono text-xs text-muted-foreground sm:block">
            INMP441 · I2S · 16kHz · MONO
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-border/60 bg-background/40 p-6">
          <Waveform active={listening} bars={80} height={180} />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Meter icon={<Volume2 className="h-4 w-4" />} label="Audio Level" value={level} />
          <Meter icon={<Waves className="h-4 w-4" />} label="Noise Threshold" value={18} color="oklch(0.68 0.22 295)" />
        </div>
      </HoloCard>

      <div className="grid gap-4 lg:grid-cols-3">
        <HoloCard glow>
          <StatLabel>Recognized</StatLabel>
          <div className="mt-3 text-4xl font-bold uppercase neon-text text-mono">
            {transcript[transcript.length - 1]?.w ?? "—"}
          </div>
          <div className="mt-2 text-sm text-muted-foreground">Confidence</div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-secondary/40">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-primary to-accent neon-glow"
              animate={{ width: `${(transcript[transcript.length - 1]?.c ?? 0) * 100}%` }}
            />
          </div>
          <div className="mt-1 text-mono text-primary text-sm">
            {((transcript[transcript.length - 1]?.c ?? 0) * 100).toFixed(1)}%
          </div>
        </HoloCard>

        <HoloCard className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <StatLabel>Live Transcription</StatLabel>
            <Activity className="h-4 w-4 text-primary animate-pulse-glow" />
          </div>
          <div className="mt-3 max-h-72 space-y-1.5 overflow-y-auto pr-1 text-mono text-sm">
            {transcript.slice().reverse().map((row, i) => (
              <motion.div
                key={`${row.t}-${i}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 rounded-md border border-border/40 bg-background/30 px-3 py-2"
              >
                <span className="text-muted-foreground text-xs">{row.t}</span>
                <span className="flex-1 text-foreground">› {row.w}</span>
                <span className="text-primary text-xs">{(row.c * 100).toFixed(0)}%</span>
              </motion.div>
            ))}
          </div>
        </HoloCard>
      </div>
    </div>
  );
}

function Meter({ icon, label, value, color = "var(--neon)" }: { icon: React.ReactNode; label: string; value: number; color?: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/30 p-3">
      <div className="flex items-center justify-between text-mono text-xs text-muted-foreground">
        <span className="flex items-center gap-2"><span className="text-primary">{icon}</span>{label}</span>
        <span style={{ color }}>{value.toFixed(0)}%</span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary/40">
        <motion.div
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${color}, oklch(0.7 0.2 215))`, boxShadow: `0 0 12px ${color}` }}
          animate={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
