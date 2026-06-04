import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Wifi, Radio, Bluetooth, Cable, Save, Plug, PlugZap } from "lucide-react";
import { HoloCard, StatLabel } from "@/components/ui-kit/HoloCard";
import { useEsp32 } from "@/lib/esp32-socket";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — CDP-GROUP1" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { ip: ctxIp, port: ctxPort, setEndpoint, status, connected, connect, disconnect } = useEsp32();
  const [ip, setIp] = useState(ctxIp);
  const [port, setPort] = useState(ctxPort);
  const [threshold, setThreshold] = useState(0.75);
  const [transport, setTransport] = useState<"WS" | "MQTT" | "BLE" | "SERIAL">("WS");

  const transports = [
    { id: "WS", label: "WebSocket", icon: Wifi },
    { id: "MQTT", label: "MQTT", icon: Radio },
    { id: "BLE", label: "Bluetooth LE", icon: Bluetooth },
    { id: "SERIAL", label: "Serial", icon: Cable },
  ] as const;

  const save = () => setEndpoint(ip, port);

  const statusColor =
    connected ? "text-success border-success/40 bg-success/10"
    : status === "connecting" ? "text-warning border-warning/40 bg-warning/10"
    : "text-destructive border-destructive/40 bg-destructive/10";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <StatLabel>Settings</StatLabel>
          <h2 className="mt-1 text-2xl font-semibold">System <span className="neon-text">configuration</span></h2>
        </div>
        <div className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-mono text-xs uppercase tracking-wider ${statusColor}`}>
          <span className="relative h-2 w-2 rounded-full bg-current" />
          {status}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <HoloCard glow>
          <StatLabel>ESP32 Connection</StatLabel>
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Field label="IP Address" className="col-span-2">
                <input value={ip} onChange={(e) => setIp(e.target.value)} placeholder="192.168.4.21" className="input-neon" />
              </Field>
              <Field label="Port">
                <input
                  type="number"
                  value={port}
                  onChange={(e) => setPort(Number(e.target.value) || 81)}
                  className="input-neon"
                />
              </Field>
            </div>
            <Field label="Transport">
              <div className="grid grid-cols-2 gap-2">
                {transports.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTransport(t.id)}
                    disabled={t.id !== "WS"}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 text-mono text-xs uppercase tracking-wider transition ${
                      transport === t.id
                        ? "border-primary/60 bg-primary/15 text-primary neon-border"
                        : "border-border/50 bg-background/30 text-muted-foreground hover:text-foreground"
                    } ${t.id !== "WS" ? "opacity-40 cursor-not-allowed" : ""}`}
                  >
                    <t.icon className="h-4 w-4" /> {t.label}
                  </button>
                ))}
              </div>
            </Field>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={save}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-mono text-xs font-semibold uppercase tracking-wider text-primary-foreground neon-glow"
              >
                <Save className="h-4 w-4" /> Save & Connect
              </button>
              {connected ? (
                <button
                  onClick={disconnect}
                  className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-mono text-xs uppercase tracking-wider text-destructive"
                >
                  <Plug className="h-4 w-4" /> Disconnect
                </button>
              ) : (
                <button
                  onClick={connect}
                  className="flex items-center gap-2 rounded-lg glass px-4 py-2 text-mono text-xs uppercase tracking-wider"
                >
                  <PlugZap className="h-4 w-4" /> Connect
                </button>
              )}
            </div>

            <details className="rounded-md border border-border/40 bg-background/30 p-3 text-xs text-muted-foreground">
              <summary className="cursor-pointer text-mono uppercase tracking-wider text-primary">ESP32 firmware contract</summary>
              <div className="mt-2 space-y-1">
                <div>WebSocket URL: <code className="text-primary">ws://{ip}:{port}</code></div>
                <div>Inbound JSON: <code>{`{"voice":{"word":"forward","conf":0.94}}`}</code></div>
                <div>Outbound JSON: <code>{`{"cmd":"motor","dir":"F","speed":80}`}</code></div>
              </div>
            </details>
          </div>
        </HoloCard>

        <HoloCard glow>
          <StatLabel>AI Recognition</StatLabel>
          <div className="mt-4 space-y-4">
            <Field label={`Confidence threshold · ${(threshold * 100).toFixed(0)}%`}>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-full accent-[var(--neon)]"
              />
            </Field>
            <Field label="Wake Word">
              <input defaultValue="trợ lí" className="input-neon" />
            </Field>
            <Field label="Sample Rate (Hz)">
              <input defaultValue="16000" className="input-neon" />
            </Field>
            <Field label="Edge Impulse classes (6)">
              <div className="flex flex-wrap gap-1.5">
                {["trợ lí", "bật", "dừng lại", "quay nhanh", "quay chậm", "noise"].map((l) => (
                  <span key={l} className="rounded border border-primary/40 bg-primary/10 px-2 py-1 text-mono text-[10px] uppercase tracking-wider text-primary">
                    {l}
                  </span>
                ))}
              </div>
            </Field>
          </div>
        </HoloCard>
      </div>

      <style>{`
        .input-neon {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid oklch(0.5 0.12 220 / 30%);
          background: oklch(0.18 0.05 250 / 60%);
          padding: 0.55rem 0.75rem;
          font-family: var(--font-mono);
          font-size: 0.85rem;
          color: var(--foreground);
        }
        .input-neon:focus { outline: none; border-color: var(--neon); box-shadow: 0 0 12px oklch(0.7 0.2 215 / 40%); }
      `}</style>
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="mb-1 text-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}
