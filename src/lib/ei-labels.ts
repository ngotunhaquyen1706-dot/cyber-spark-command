/**
 * Edge Impulse model labels — keep in sync with firmware (CODE_FIRMWARE.docx).
 * 6 classes the on-device model recognises.
 *
 * NOTE: dấu thanh đúng theo firmware: "trợ lí" (i ngắn), "dừng lại" (không phải "tắt").
 */
export const EI_LABELS = [
  "trợ lí",
  "bật",
  "dừng lại",
  "quay nhanh",
  "quay chậm",
  "noise",
] as const;

export type EiLabel = (typeof EI_LABELS)[number];

/** Actionable commands (sau wake word "trợ lí"). */
export const COMMAND_LABELS: EiLabel[] = ["bật", "dừng lại", "quay nhanh", "quay chậm"];

/**
 * Map nhãn EI → tín hiệu motor/quạt gửi cho ESP32.
 * Speed là % PWM (firmware chuyển sang 0-255):
 *   bật        → 60%  (ledcWrite 150)
 *   dừng lại   → 0    (ledcWrite 0)
 *   quay nhanh → 100% (ledcWrite 255)
 *   quay chậm  → 33%  (ledcWrite 85)
 */
export function labelToMotor(label: string):
  | { dir: "F" | "B" | "L" | "R" | "S"; speed: number }
  | null {
  // chấp nhận cả "trợ lý" lẫn "trợ lí" cho dễ test
  const l = label?.toLowerCase().trim();
  switch (l) {
    case "bật":        return { dir: "F", speed: 60 };
    case "dừng lại":
    case "tắt":        return { dir: "S", speed: 0 };
    case "quay nhanh": return { dir: "F", speed: 100 };
    case "quay chậm":  return { dir: "F", speed: 33 };
    default: return null; // "trợ lí" = wake word, "noise" = ignore
  }
}

export function labelColor(label: string): string {
  const l = label?.toLowerCase().trim();
  switch (l) {
    case "bật":        return "oklch(0.78 0.18 145)"; // green
    case "dừng lại":
    case "tắt":        return "oklch(0.68 0.22 25)";  // red
    case "quay nhanh": return "oklch(0.82 0.18 75)";  // amber
    case "quay chậm":  return "oklch(0.68 0.22 295)"; // violet
    case "trợ lí":
    case "trợ lý":     return "oklch(0.78 0.20 215)"; // cyan
    default:           return "oklch(0.6 0.02 250)";  // muted (noise)
  }
}
