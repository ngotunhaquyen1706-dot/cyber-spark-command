import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

/**
 * ESP32 WebSocket bridge.
 *
 * Inbound (ESP32 → Dashboard) — any subset of:
 *   {
 *     "voice":  { "word": "forward", "conf": 0.94 },
 *     "motor":  { "dir": "F", "speed": 78, "currentA": 0.42, "currentB": 0.39, "temp": 38 },
 *     "system": { "cpu": 32, "rssi": -54, "latency": 14, "level": 60 },
 *     "log":    "any free-form line"
 *   }
 *
 * Outbound (Dashboard → ESP32) via send():
 *   { "cmd": "motor", "dir": "F"|"B"|"L"|"R"|"S", "speed": 0..100 }
 *   { "cmd": "listen", "value": true|false }
 *   { "cmd": "estop" }
 *   { "cmd": "config", "threshold": 0.75, "wake": "neuron" }
 */

export type VoiceFrame = { word: string; conf: number };
export type MotorFrame = {
  dir?: "F" | "B" | "L" | "R" | "S";
  speed?: number;
  currentA?: number;
  currentB?: number;
  temp?: number;
};
export type SystemFrame = {
  cpu?: number;
  rssi?: number;
  latency?: number;
  level?: number;
};

export type LogEntry = { t: string; m: string; level: "ok" | "warn" | "err" };

type Status = "disconnected" | "connecting" | "connected" | "error";

type Ctx = {
  ip: string;
  port: number;
  setEndpoint: (ip: string, port: number) => void;
  status: Status;
  connected: boolean;
  // live data
  voice: VoiceFrame | null;
  voiceHistory: (VoiceFrame & { t: string })[];
  motor: MotorFrame;
  system: SystemFrame;
  logs: LogEntry[];
  // controls
  connect: () => void;
  disconnect: () => void;
  send: (payload: Record<string, unknown>) => boolean;
};

const Esp32Ctx = createContext<Ctx | null>(null);

const LS_KEY = "cdp.esp32.endpoint";

function loadEndpoint() {
  if (typeof window === "undefined") return { ip: "192.168.4.21", port: 81 };
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as { ip: string; port: number };
  } catch {
    /* ignore */
  }
  return { ip: "192.168.4.21", port: 81 };
}

export function Esp32Provider({ children }: { children: ReactNode }) {
  const [{ ip, port }, setEp] = useState(() => loadEndpoint());
  const [status, setStatus] = useState<Status>("disconnected");
  const [voice, setVoice] = useState<VoiceFrame | null>(null);
  const [voiceHistory, setVoiceHistory] = useState<(VoiceFrame & { t: string })[]>([]);
  const [motor, setMotor] = useState<MotorFrame>({});
  const [system, setSystem] = useState<SystemFrame>({});
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manualCloseRef = useRef(false);

  const pushLog = (m: string, level: LogEntry["level"] = "ok") => {
    setLogs((prev) =>
      [
        ...prev.slice(-199),
        { t: new Date().toLocaleTimeString([], { hour12: false }), m, level },
      ],
    );
  };

  const connect = () => {
    if (typeof window === "undefined") return;
    manualCloseRef.current = false;
    if (wsRef.current && wsRef.current.readyState <= 1) return;

    const url = `ws://${ip}:${port}`;
    setStatus("connecting");
    pushLog(`Connecting to ${url}…`);
    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch (e) {
      setStatus("error");
      pushLog(`Connection error: ${(e as Error).message}`, "err");
      scheduleReconnect();
      return;
    }
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("connected");
      pushLog(`Connected to ESP32 @ ${url}`);
    };
    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(typeof ev.data === "string" ? ev.data : "");
        if (data.voice) {
          setVoice(data.voice);
          setVoiceHistory((p) =>
            [
              ...p.slice(-49),
              {
                ...data.voice,
                t: new Date().toLocaleTimeString([], { hour12: false }),
              },
            ],
          );
          pushLog(`Voice: ${data.voice.word} (${(data.voice.conf * 100).toFixed(0)}%)`);
        }
        if (data.motor) setMotor((m) => ({ ...m, ...data.motor }));
        if (data.system) setSystem((s) => ({ ...s, ...data.system }));
        if (data.log) pushLog(String(data.log));
      } catch {
        pushLog(String(ev.data));
      }
    };
    ws.onerror = () => {
      setStatus("error");
      pushLog("WebSocket error", "err");
    };
    ws.onclose = () => {
      setStatus("disconnected");
      pushLog("Disconnected", "warn");
      if (!manualCloseRef.current) scheduleReconnect();
    };
  };

  const scheduleReconnect = () => {
    if (reconnectRef.current) clearTimeout(reconnectRef.current);
    reconnectRef.current = setTimeout(() => connect(), 3000);
  };

  const disconnect = () => {
    manualCloseRef.current = true;
    if (reconnectRef.current) clearTimeout(reconnectRef.current);
    wsRef.current?.close();
    wsRef.current = null;
  };

  const send = (payload: Record<string, unknown>) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== 1) return false;
    ws.send(JSON.stringify(payload));
    return true;
  };

  const setEndpoint = (newIp: string, newPort: number) => {
    setEp({ ip: newIp, port: newPort });
    if (typeof window !== "undefined") {
      localStorage.setItem(LS_KEY, JSON.stringify({ ip: newIp, port: newPort }));
    }
    disconnect();
    setTimeout(() => connect(), 200);
  };

  // Auto-connect on mount (client only)
  useEffect(() => {
    connect();
    return () => {
      manualCloseRef.current = true;
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      ip,
      port,
      setEndpoint,
      status,
      connected: status === "connected",
      voice,
      voiceHistory,
      motor,
      system,
      logs,
      connect,
      disconnect,
      send,
    }),
    [ip, port, status, voice, voiceHistory, motor, system, logs],
  );

  return <Esp32Ctx.Provider value={value}>{children}</Esp32Ctx.Provider>;
}

export function useEsp32() {
  const ctx = useContext(Esp32Ctx);
  if (!ctx) throw new Error("useEsp32 must be used inside <Esp32Provider>");
  return ctx;
}
