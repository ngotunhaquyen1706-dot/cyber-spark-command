import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Wifi, Radio, Bluetooth, Cable, Save } from "lucide-react";
import { HoloCard, StatLabel } from "@/components/ui-kit/HoloCard";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — NEURON.OS" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const [ip, setIp] = useState("192.168.4.21");
  const [threshold, setThreshold] = useState(0.75);
  const [transport, setTransport] = useState<"WS" | "MQTT" | "BLE" | "SERIAL">("WS");

  const transports = [
    { id: "WS", label: "WebSocket", icon: Wifi },
    { id: "MQTT", label: "MQTT", icon: Radio },
    { id: "BLE", label: "Bluetooth LE", icon: Bluetooth },
    { id: "SERIAL", label: "Serial", icon: Cable },
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <StatLabel>Settings</StatLabel>
        <h2 className="mt-1 text-2xl font-semibold">System <span className="neon-text">configuration</span></h2>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <HoloCard glow>
          <StatLabel>Connection</StatLabel>
          <div className="mt-4 space-y-4">
            <Field label="ESP32 IP Address">
              <input value={ip} onChange={(e) => setIp(e.target.value)} className="input-neon" />
            </Field>
            <Field label="Transport">
              <div className="grid grid-cols-2 gap-2">
                {transports.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTransport(t.id)}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 text-mono text-xs uppercase tracking-wider transition ${
                      transport === t.id
                        ? "border-primary/60 bg-primary/15 text-primary neon-border"
                        : "border-border/50 bg-background/30 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <t.icon className="h-4 w-4" /> {t.label}
                  </button>
                ))}
              </div>
            </Field>
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
              <input defaultValue="neuron" className="input-neon" />
            </Field>
            <Field label="Sample Rate (Hz)">
              <input defaultValue="16000" className="input-neon" />
            </Field>
          </div>
        </HoloCard>
      </div>

      <button className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-mono text-sm font-semibold uppercase tracking-wider text-primary-foreground neon-glow hover:animate-pulse-glow">
        <Save className="h-4 w-4" /> Save Configuration
      </button>

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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}
