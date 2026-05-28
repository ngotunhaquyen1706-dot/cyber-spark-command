import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Filter, TerminalSquare } from "lucide-react";
import { HoloCard, StatLabel } from "@/components/ui-kit/HoloCard";

export const Route = createFileRoute("/logs")({
  head: () => ({ meta: [{ title: "Command Logs — NEURON.OS" }] }),
  component: LogsPage,
});

type Level = "INFO" | "WARN" | "ERROR" | "CMD";
interface LogRow { t: string; level: Level; msg: string; conf?: number }

const SEED: LogRow[] = [
  { t: "12:00:01", level: "INFO", msg: "[boot] esp32 powered up, fw 2.4.1" },
  { t: "12:00:02", level: "INFO", msg: "[wifi] connected to NEURON-NET · -54dBm" },
  { t: "12:00:03", level: "INFO", msg: "[i2s] mic initialized @ 16kHz mono" },
  { t: "12:00:04", level: "INFO", msg: "[ai] tinyml model loaded · 32kB" },
  { t: "12:00:05", level: "CMD", msg: "wake word 'neuron' detected", conf: 0.94 },
];

function rand<T>(a: T[]) { return a[Math.floor(Math.random() * a.length)]; }

function LogsPage() {
  const [rows, setRows] = useState<LogRow[]>(SEED);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Level | "ALL">("ALL");
  const [autoscroll, setAutoscroll] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setInterval(() => {
      const level = rand<Level>(["INFO", "INFO", "INFO", "CMD", "CMD", "WARN", "ERROR"]);
      const msg =
        level === "CMD"
          ? `recognized "${rand(["forward", "stop", "boost", "halt", "left", "right"])}"`
          : level === "WARN"
            ? `[net] latency ${20 + Math.floor(Math.random() * 30)}ms`
            : level === "ERROR"
              ? `[motor] over-current detected on channel A`
              : `[sys] heap ${100 + Math.floor(Math.random() * 60)}kB free`;
      setRows((r) => [...r.slice(-200), {
        t: new Date().toLocaleTimeString([], { hour12: false }),
        level, msg,
        conf: level === "CMD" ? 0.75 + Math.random() * 0.24 : undefined,
      }]);
    }, 1200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (autoscroll && ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [rows, autoscroll]);

  const filtered = useMemo(() => {
    return rows.filter((r) => (filter === "ALL" || r.level === filter) && r.msg.toLowerCase().includes(query.toLowerCase()));
  }, [rows, query, filter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <StatLabel>Command Logs</StatLabel>
          <h2 className="mt-1 text-2xl font-semibold">System <span className="neon-text">telemetry stream</span></h2>
        </div>
        <label className="flex items-center gap-2 text-mono text-xs text-muted-foreground">
          <input type="checkbox" checked={autoscroll} onChange={(e) => setAutoscroll(e.target.checked)} className="accent-[var(--neon)]" />
          auto-scroll
        </label>
      </div>

      <HoloCard glow>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="grep logs..."
              className="w-full rounded-md border border-border/60 bg-background/40 pl-9 pr-3 py-2 text-mono text-sm placeholder:text-muted-foreground/60 focus:border-primary/60 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-1 rounded-md border border-border/60 bg-background/30 p-1 text-mono text-xs">
            <Filter className="ml-1 h-3.5 w-3.5 text-muted-foreground" />
            {(["ALL", "INFO", "CMD", "WARN", "ERROR"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded px-2.5 py-1 transition ${
                  filter === f ? "bg-primary/20 text-primary neon-border" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-lg border border-border/60 bg-black/50">
          <div className="flex items-center gap-2 border-b border-border/60 bg-background/40 px-3 py-1.5 text-mono text-[11px] text-muted-foreground">
            <TerminalSquare className="h-3.5 w-3.5 text-primary" />
            neuron@esp32:~/logs $ tail -f system.log
            <span className="ml-auto flex gap-1.5">
              <span className="h-2 w-2 rounded-full bg-destructive/60" />
              <span className="h-2 w-2 rounded-full bg-warning/60" />
              <span className="h-2 w-2 rounded-full bg-success/60" />
            </span>
          </div>
          <div ref={ref} className="h-[480px] overflow-y-auto p-3 text-mono text-xs leading-relaxed">
            {filtered.map((r, i) => (
              <div key={i} className="flex gap-3">
                <span className="text-muted-foreground/70 w-20 shrink-0">{r.t}</span>
                <span className={`w-12 shrink-0 ${levelColor(r.level)}`}>[{r.level}]</span>
                <span className="text-foreground/90">{r.msg}</span>
                {r.conf !== undefined && <span className="ml-auto text-primary">{(r.conf * 100).toFixed(1)}%</span>}
              </div>
            ))}
            <div className="mt-1 inline-flex items-center gap-1 text-primary">
              <span className="h-3 w-2 animate-pulse bg-primary" />
            </div>
          </div>
        </div>
      </HoloCard>
    </div>
  );
}

function levelColor(l: Level) {
  switch (l) {
    case "INFO": return "text-primary/80";
    case "CMD": return "text-success";
    case "WARN": return "text-warning";
    case "ERROR": return "text-destructive";
  }
}
