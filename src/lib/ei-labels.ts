/**
 * Edge Impulse model labels — keep in sync with firmware.
 * The model running on ESP32 classifies audio into these 6 classes.
 */
export const EI_LABELS = [
  "bật",
  "tắt",
  "quay nhanh",
  "quay chậm",
  "trợ lý",
  "noise",
] as const;

export type EiLabel = (typeof EI_LABELS)[number];

/** Labels considered actionable commands (everything except wake word + noise). */
export const COMMAND_LABELS: EiLabel[] = ["bật", "tắt", "quay nhanh", "quay chậm"];

/** Map an Edge Impulse label to a motor action the dashboard sends to ESP32. */
export function labelToMotor(label: string):
  | { dir: "F" | "B" | "L" | "R" | "S"; speed: number }
  | null {
  switch (label) {
    case "bật":        return { dir: "F", speed: 70 };
    case "tắt":        return { dir: "S", speed: 0 };
    case "quay nhanh": return { dir: "F", speed: 100 };
    case "quay chậm":  return { dir: "F", speed: 40 };
    default: return null; // "trợ lý" = wake word, "noise" = ignore
  }
}

export function labelColor(label: string): string {
  switch (label) {
    case "bật":        return "oklch(0.78 0.18 145)"; // green
    case "tắt":        return "oklch(0.68 0.22 25)";  // red
    case "quay nhanh": return "oklch(0.82 0.18 75)";  // amber
    case "quay chậm":  return "oklch(0.68 0.22 295)"; // violet
    case "trợ lý":     return "oklch(0.78 0.20 215)"; // cyan
    default:           return "oklch(0.6 0.02 250)";  // muted (noise)
  }
}
