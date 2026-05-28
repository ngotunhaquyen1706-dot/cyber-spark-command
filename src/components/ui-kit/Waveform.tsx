import { useEffect, useRef } from "react";

interface WaveformProps {
  active?: boolean;
  bars?: number;
  className?: string;
  height?: number;
}

export function Waveform({ active = true, bars = 64, className, height = 120 }: WaveformProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    let raf = 0;
    const els = Array.from(ref.current.children) as HTMLElement[];
    const phases = els.map(() => Math.random() * Math.PI * 2);
    const speed = els.map(() => 0.06 + Math.random() * 0.08);

    const tick = () => {
      els.forEach((el, i) => {
        phases[i] += speed[i];
        const base = active ? 0.35 + Math.abs(Math.sin(phases[i])) * 0.65 : 0.08 + Math.abs(Math.sin(phases[i] * 0.4)) * 0.12;
        el.style.transform = `scaleY(${base})`;
        el.style.opacity = String(0.4 + base * 0.6);
      });
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [active]);

  return (
    <div
      ref={ref}
      className={`flex w-full items-center justify-between gap-[2px] ${className ?? ""}`}
      style={{ height }}
    >
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className="block w-full origin-center rounded-full bg-gradient-to-t from-primary/40 via-primary to-accent"
          style={{ height: "100%", transform: "scaleY(0.1)" }}
        />
      ))}
    </div>
  );
}
